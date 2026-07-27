# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Personal portfolio / business website for Ryan Roga (rogadigital.com). The stack pivoted from SvelteKit to **Astro 7 + Svelte 5 islands** (`package.json` 2.0.0 marks the May 2026 cutover; upgraded from Astro 6 to 7 / Vite 8 in June 2026). The previous SvelteKit build is preserved read-only at `_references/old-svelte-site/` for content lift only — never edit it. The redesign is mid-flight; design principles and the phased migration plan live in `docs/BRIEF.md` and `docs/PLAN.md`. Read both before substantive UI or content changes.

Static-only output, deployed on Vercel.

## Commands

- **Package manager**: pnpm, pinned to `pnpm@11.9.0` (with integrity hash) via the `packageManager` field; Node ≥ 24.
- `pnpm dev` — Astro dev server at localhost:4321.
- `pnpm build` — static build to `dist/`.
- `pnpm preview` — preview the production build.
- `pnpm check` — `astro check` (TypeScript + content schema validation).
- `pnpm test` — Vitest unit tests (support-form validation in `tests/`).
- `pnpm ready` — the pre-commit gate: format → lint (`oxlint` + `eslint`) → `astro check`. Run before committing.

**pnpm config lives in `pnpm-workspace.yaml`, not `package.json`.** pnpm 11 ignores the `package.json` `pnpm` field, so settings moved to `pnpm-workspace.yaml`: `allowBuilds` allowlists `sharp`/`esbuild` post-install scripts, and `overrides` pins transitive deps to patched versions for security advisories (`pnpm audit` must stay at 0). Editing overrides means editing that file, then `pnpm install`. If `pnpm install` aborts with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`, prefix with `CI=true`.

## Deployment

Static output on Vercel — Vercel serves `dist/` from its CDN; no adapter. **`vercel.json` sets `ENABLE_EXPERIMENTAL_COREPACK=1` via `build.env`** so every build provisions the pinned `pnpm@11.9.0` via Corepack and can parse `pnpm-workspace.yaml`. Without it, Vercel falls back to pnpm 9, which rejects the settings-only workspace file (`packages field missing or empty`) and the build fails. (The dashboard env var of the same name proved unreliable — Production builds ignored it while Preview builds honored it; `build.env` is versioned and applies to all environments identically.) `vercel.json` therefore uses plain `pnpm install` / `pnpm build` (do **not** swap in `npx pnpm@…` — that loses Corepack's integrity check).

The `/support` contact form is the one server-side piece: a Vercel function at `api/support.ts` (root-level `api/` dir builds alongside the static output — no adapter) verifies Cloudflare Turnstile and sends email via Resend. It needs three Vercel env vars: `PUBLIC_TURNSTILE_SITE_KEY` (build-time, inlined into the Svelte island), `TURNSTILE_SECRET_KEY`, and `RESEND_API_KEY` (runtime). The recipient address lives **only** in `api/support.ts` — never put it anywhere under `src/`.

## Architecture

- **Framework** — Astro 7 (`astro.config.mjs`), static output, no SSR adapter. Rust compiler + Vite 8/Rolldown + Sätteri markdown are all default-on; the project uses no custom remark/rehype, SSR, `astro:db`, or transitions internals, so those defaults apply cleanly. Vercel auto-detects `dist/`. If edge image optimization or ISR is ever needed, add `@astrojs/vercel`.
- **Interactivity** — Svelte 5 islands via `@astrojs/svelte`. `svelte.config.js` uses `vitePreprocess`. Default to `.astro` components; reach for `.svelte` only when state, events, or browser APIs are actually required.
- **Styling** — Tailwind CSS v4 via `@tailwindcss/vite`. **No `@astrojs/tailwind`, no `tailwind.config.js`, no PostCSS config** — design tokens live in `src/styles/global.css` using the v4 `@theme` directive. Stylesheet is imported once in `src/components/BaseHead.astro`.
- **Content** — Astro content collections (`src/content.config.ts`). Prefer MDX for posts that embed components; plain `.md` is fine otherwise. Site-wide constants (title, tagline, description, social, contact, roles) live in `src/consts.ts` — import from there rather than hard-coding.
- **Fonts** — in flux during Phase 1. `@fontsource-variable/geist` and `@fontsource-variable/geist-mono` are installed in deps but not yet imported; font wiring is part of the design-system phase.

## Page composition

- **Pages** — `src/pages/*.astro` with file-based routing: `index`, `about`, `contact`, `services`, `resume`, `404`, `insights/[...slug]`, `work/[...slug]`, `labs/`, plus build-time endpoints `rss.xml.js` and `og/**/*.png.ts` (static OG images via Satori — they run at build, not as runtime APIs). `/blog` redirects to `/insights` (`astro.config.mjs`).
- **Layouts** — `src/layouts/`: `Base.astro` (shared shell), `CaseStudy.astro` (work entries), `Insights.astro` (articles).
- **Components** — `src/components/`. `.astro` for static, `.svelte` only when interactivity is real.
- **Adding a Svelte island** — import the `.svelte` file inside an `.astro` page and add a client directive (`client:load`, `client:idle`, `client:visible`). Without a directive, Svelte renders as static HTML — fine if you don't need hydration.

## Svelte 5 (when writing islands)

Runes mode only. Do **not** use Svelte 4 patterns:

- `$props()` not `export let`
- `$state()`, `$derived()`, `$effect()` not `$:` reactive statements
- `{@render children?.()}` not `<slot />`; named snippets not named slots
- `onclick={handler}` not `on:click={handler}`
- Callback props (e.g. `onPageChange`) not `createEventDispatcher`
- Import `Snippet` type from `'svelte'` for content-projection props

### Component structure order

1. Type imports → 2. Regular imports → 3. `$props()` → 4. `$state()` → 5. `$derived()` → 6. `$effect()` → 7. Functions → 8. Template → 9. Styles

## Quality bars

Every component and page must satisfy these three. They are hard requirements, not aspirations — work that misses any of them is incomplete and should not be marked done.

### Mobile-first

- Author base styles for the smallest viewport, then layer up with Tailwind breakpoints (`sm:`, `md:`, `lg:`). Never desktop-first with overrides downward.
- Touch targets ≥ 44×44 px on any interactive element (buttons, links, icon controls). Use `min-h-11 min-w-11` or larger.
- Mentally test the layout at 320 px wide before reaching for desktop styles.

### Fully responsive

- No horizontal scroll from 320 px to 1920 px+. If content overflows, fix the layout — don't hide it.
- Images: prefer Astro's `<Image>` for raster; always `max-width: 100%; height: auto`. Use `<picture>` or `getImage()` when art-direction differs by breakpoint.
- Containers use max-width + auto margin; never hard-code pixel widths for content regions.
- Typography prefers fluid scales (`clamp()` or stepped Tailwind utilities at breakpoints) over jumping between two fixed sizes.

### Accessibility (WCAG 2.2 AA)

- **Semantic HTML first.** `<button>` not `<div onclick>`. Use `<nav>`, `<main>`, `<article>`, `<section>`, `<header>`, `<footer>` for landmarks. Reach for ARIA only when no semantic element exists.
- **Images**: every `<img>` has an `alt`. Decorative → `alt=""`. Meaningful → describe what it conveys, not what it looks like.
- **Color contrast** ≥ 4.5:1 for normal text, ≥ 3:1 for large text and UI controls. Verify before shipping.
- **Focus** is always visible — never `outline: none` without a replacement ring. Tab order must follow visual order.
- **Keyboard**: every interactive element reachable and operable via keyboard alone. `Esc` closes overlays and menus; focus is trapped inside open dialogs and restored on close.
- **Forms**: `<label>` paired to its input via `for`/`id`. Error messages associated via `aria-describedby`. Required state communicated beyond color.
- **Color alone never conveys state.** Pair red/green/etc. with icon or text.
- **Motion**: respect `prefers-reduced-motion` — non-essential animation must reduce or stop.
- **Page basics**: `lang` on `<html>`, unique `<title>`, exactly one `<h1>`, skip-to-main-content link as the first focusable element.

## Conventions

- TypeScript everywhere; `import type` for type-only imports.
- Components: PascalCase filenames (`BaseCard.astro`, `IslandSmokeTest.svelte`).
- Routes: kebab-case directories.
- Tailwind utilities preferred over custom CSS for layout, spacing, and typography. Reach for `@theme` tokens before raw values once the design system lands.
- Design rules from the brief: one accent color, restrained palette (`docs/BRIEF.md` §3.3); no drop shadows — use 1px hairline borders for structure (§3.6); real product screenshots, never abstract illustrations (§3.5).

## Pull requests

- PR body uses a `## Summary` section with bullet points. No `## Test plan` section — drop it entirely.

## Copy & titles

- **Never use the word "engineer" to describe Ryan or his work.** "Engineer" is a protected professional title in BC/Canada (Engineers and Geoscientists BC) — using it without a P.Eng. designation is a regulatory violation, not just a stylistic choice. This applies to job titles ("Software Engineer", "DevOps Engineer", etc.), prose ("built by one engineer"), and meta tags. Use **Developer**, **Technical Lead**, **Specialist**, or role-specific alternatives (e.g. "Integration Specialist" not "Integration Engineer"). Generic references to other companies' engineering practices in design docs are fine — the rule is about how Ryan presents himself.

## What lives where

- `docs/BRIEF.md` — design principles, IA, success criteria.
- `docs/PLAN.md` — phased migration plan with exit criteria per phase.
- `_references/old-svelte-site/` — read-only archive of the previous SvelteKit build. Lift content; do not edit. Gitignored.
- `_references/techcentral-showcase/` — pre-existing reference content, untouched. Gitignored.

## Task tracking

This repo uses **Claude Code Tasks** (native, built-in) for tracking work across sessions.

- Shared task list ID for this repo: `ryanroga-com`
  Set `CLAUDE_CODE_TASK_LIST_ID=ryanroga-com` in your shell before launching `claude`.
- Use `TaskCreate` for any unit of work you expect to take more than one tool call or that you might not finish this session.
- Use `addBlockedBy` / `addBlocks` to express dependencies. Check `TaskList` for ready work (pending, no open blockers) at the start of each session.
- Mark tasks `in_progress` when you start, `completed` when done.
- Press `Ctrl+T` to toggle the task panel.
- Historical Beads data lives in `docs/archive/beads/`. Do not recreate the Beads workflow.

## Session completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create tasks or GitHub issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update task status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
