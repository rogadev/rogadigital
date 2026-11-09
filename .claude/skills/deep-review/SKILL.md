---
name: deep-review
description: Deep review of a branch or range in rogadigital.com (Astro 7 with Svelte 5 islands on Vercel), sized to what changed. Use when the user says "/deep-review", "review my branch", "review my changes", "review dev before the PR", "review PR #N", or "is this ready to merge". Prefer it over the built-in /code-review in this repo.
argument-hint: "[ref | a..b | #PR | working] [quick | full] [auto]"
based-on: orc-review@1.22.0
template: 4
template-reviewed: 4
---

# Deep review: rogadigital.com

This is a project profile for orc-pack's `orc-review` skill. Invoke the `orc-review` skill with `$ARGUMENTS (profile: .claude/skills/deep-review/SKILL.md)` and run its workflow with the profile below. Edit only the profile; the workflow lives in `orc-review` and updates with the pack. The pack's generic lanes are the base; **Repo lanes** adds this project's specialists only where the base is thin.

## Stack

- **Framework:** Astro 7 (`astro` ^7.4) with Svelte 5 islands (`@astrojs/svelte` ^9, `svelte` ^5.57), Tailwind CSS 4 through `@tailwindcss/vite`, TypeScript 6, playbook `frameworks/astro.md`
- **Platform:** Vercel (static `dist/` on the CDN plus the Node functions in `api/`), playbook `platforms/vercel.md`
- **Run locally:** `pnpm dev` at `http://localhost:4321`

## Checks

Check-only commands for the gate. **When** is `always`, a path condition, or `remind` (never run; name it under **Needs your attention** when the condition's paths change). The `install` row is the frozen install orc-review runs inside a range's worktree, never a link to another checkout's install.

| Check     | Command                                               | When                                                                                                                                                                                                                      |
| --------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| install   | `CI=true pnpm install --frozen-lockfile --prefer-offline` | worktree                                                                                                                                                                                                                  |
| lint      | `pnpm format:check && pnpm lint`                      | always                                                                                                                                                                                                                    |
| typecheck | `pnpm check`                                          | always                                                                                                                                                                                                                    |
| test      | `pnpm test`                                           | source (`api/`, `src/`) or `tests/` changed                                                                                                                                                                               |
| build     | `pnpm build`                                          | remind: `astro.config.mjs`, `src/content.config.ts`, `src/content/**`, `src/pages/**`, `src/layouts/**`, `src/integrations/**`, `src/lib/og*.ts`, `src/lib/schema.ts`, `svelte.config.js`, `package.json`, `pnpm-workspace.yaml`, `vercel.json` |

`format:check` and `lint` (`oxlint && eslint .`) only read. `pnpm check` writes the gitignored `.astro/`. CI never runs `pnpm test`, so the gate is often the only place the unit tests run before merge. The build is a reminder, not a gate step, because the `demoSnapshots` integration (`src/integrations/demo-snapshots.ts`) re-captures any snapshot older than 7 days into the committed `public/demos/` at build start, so running it can change tracked files. CI builds every pull request to `dev` and `main`.

**Never run:** `pnpm ready`, `pnpm fix`, `pnpm format`, `pnpm lint:fix` (they rewrite files), `pnpm build` (can rewrite `public/demos/`), `pnpm sync:paceline` (rewrites `src/data/paceline-scenes.json`), and anything under `vercel`.

## Platform constraints

- Static output with no adapter: every page is prerendered at build. Nothing request-time runs in `src/`; the only runtime code is the Vercel Node functions in `api/*.ts`, each `export async function POST(request: Request): Promise<Response>`. Functions are stateless between invocations.
- Imports inside `api/` keep `.js` extensions (`./_lib/email.js`, `../../src/consts.js`) for Node ESM resolution on Vercel.
- Env: `PUBLIC_TURNSTILE_SITE_KEY` is build-time, inlined into `InquiryForm.svelte` through `import.meta.env`. `TURNSTILE_SECRET_KEY` and `RESEND_API_KEY` are runtime, read with `process.env` only in `api/_lib/`. A new env var must be added in Vercel for Production and Preview and documented in `CLAUDE.md`.
- The outbound `fetch` calls in `api/_lib/turnstile.ts` and `api/_lib/email.ts` have no timeout, so a hung upstream runs until the function's maximum duration.
- Vercel builds need `build.env.ENABLE_EXPERIMENTAL_COREPACK=1` in `vercel.json` so Corepack provisions the pinned `pnpm@11.9.0`; without it the build falls back to pnpm 9 and fails on `pnpm-workspace.yaml`. `installCommand` stays plain `pnpm install --frozen-lockfile`; `npx pnpm@...` loses Corepack's integrity check.
- `trailingSlash: true` in `vercel.json` and `trailingSlash: 'always'` in `astro.config.mjs`. The Astro `redirects` (`/blog`) are emitted as meta-refresh pages in static output; only `vercel.json` `redirects` are real permanent redirects, so a renamed route belongs there.
- Mail sends from `roga.dev` through Resend. pnpm settings live in `pnpm-workspace.yaml` (`allowBuilds`, `minimumReleaseAgeExclude`, `overrides`), and `pnpm audit` must stay at 0.

## Risk map

Each row tells orc-review which surface a path is, and a path may sit in several rows (an auth endpoint is both Trust boundary and Server); the lanes come from orc-review's rules for every surface a changed file touches. **Surface** is one of orc-review's nine (Docs, Comments, Tests, UI, Logic, Server, Data, Trust boundary, Config and infra), optionally with a label in parentheses, for example `Server (API contract)`. A labelled row only attaches its repo lanes to those paths and never classifies them, so the generic lanes are unaffected. **Extra lanes** names repo lanes that run on top when a row matches. A path no row matches is classified by the generic rules. Paths are globs that exist in this repo, except a framework file convention the repo hasn't used yet, marked `(none yet)`; write `None` in a row that doesn't apply, with the reason. A row never hides Logic: a file whose hunks change behavior is also Logic, whatever rows match it.

| Surface              | Paths                                                                                                                                                                                                                                                                                                    | Extra lanes   |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Trust boundary       | `api/**`, `src/components/InquiryForm.svelte`, `src/components/BaseHead.astro` (JSON-LD `set:html`), `src/layouts/Base.astro` (inline theme script), `src/components/DemoFrame.astro`, `src/components/EmbeddedPage.astro`, `src/integrations/**`, `src/lib/snapshot-sanitize.ts`, `src/lib/demos.ts`, `public/embeds/**`, `vercel.json`, `src/middleware.ts` (none yet) |               |
| Server               | `api/**`                                                                                                                                                                                                                                                                                                 |               |
| Data                 | None: no database. Content collections and `src/data/` are UI; browser storage (the `theme` key) is Logic.                                                                                                                                                                                              |               |
| UI                   | `src/pages/**/*.astro`, `src/layouts/**`, `src/components/**`, `src/styles/**`, `src/content/**`, `src/data/**`, `src/consts.ts`, `src/assets/**`, `public/embeds/**`                                                                                                                                    |               |
| Tests                | `tests/**`                                                                                                                                                                                                                                                                                               |               |
| Config and infra     | `astro.config.mjs`, `svelte.config.js`, `tsconfig.json`, `src/content.config.ts`, `vercel.json`, `package.json`, `pnpm-workspace.yaml`, `.github/**`, `eslint.config.js`, `.oxlintrc.json`, `.prettierrc.json`, `.prettierignore`                                                                        |               |
| UI (accessibility)   | `src/pages/**/*.astro`, `src/layouts/**`, `src/components/**`, `src/styles/**`, `src/content/**`, `public/embeds/**`                                                                                                                                                                                     | `review-a11y` |
| UI (copy)            | `src/pages/**`, `src/layouts/**`, `src/components/**`, `src/content/**`, `src/data/**`, `src/consts.ts`, `src/lib/og-pages.ts`, `src/lib/schema.ts`, `api/**`                                                                                                                                             | `review-copy` |
| UI (performance)     | `src/pages/**`, `src/layouts/**`, `src/components/**`, `src/styles/**`, `src/assets/**`, `src/content/**`, `public/**`, `src/integrations/**`, `src/lib/og.ts`, `astro.config.mjs`, `package.json`                                                                                                       | `review-perf` |
| UI (SEO)             | `src/pages/**`, `src/layouts/**`, `src/components/BaseHead.astro`, `src/lib/schema.ts`, `src/lib/og-pages.ts`, `src/lib/og-path.ts`, `src/content/**`, `src/content.config.ts`, `src/consts.ts`, `astro.config.mjs`, `vercel.json`, `public/robots.txt`                                                   | `review-seo`  |

Markdown under `src/content/` is UI, not Docs: an article or case study is published copy, so it never takes the docs-only shortcut. Prose under `docs/`, `.claude/`, and the root `*.md` files is Docs.

## Repo lanes

Each lane is an agent in `.claude/agents/` that follows orc-review's repo-lane contract (`orc-review/references/lane-template.md`). **Owns** is what it reviews in depth, so the verifier merges duplicates toward the owner. **Runs when** is a condition on the change, or `always`, which means whenever one of the lane's risk-map rows matches; a lane with no risk-map row runs on any change outside the docs-only and tests-only shortcuts when its condition holds. **Standards** are the orc standards and playbooks it gets.

| Lane          | Owns                                                                                                                                                                                                                                                    | Runs when                                                                                                                                                                                                                         | Standards                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `review-a11y` | WCAG 2.2 AA in depth: contrast in both themes computed from the token hex values, semantics and landmarks, one `h1` and heading order, names and labels, ARIA, keyboard and focus order and management, visible focus, 44 px targets, reduced motion, form status announcements, `alt` text | markup, classes, styles, tokens, interactive behaviour, headings, or image `alt` text changed (not a prose-only edit inside an article body)                                                                                         | `ui.md`, `frameworks/astro.md`  |
| `review-copy` | The words: clarity, positioning and the ten-second test (`docs/BRIEF.md`), the "engineer" rule, names consistent with `src/consts.ts` and `src/data/`, CTAs, form and error messages, promises that disagree across pages, sentence case, spelling and grammar in the site's Canadian spelling | user-facing text changed: page or component copy, content collection bodies or frontmatter, display strings in `src/data/` or `src/consts.ts`, OG titles, JSON-LD text, or a message returned by `api/`                              | `ui.md`                         |
| `review-perf` | Front-end and build performance against the brief's bar (Lighthouse 100, LCP under 1 s fast and 2.5 s slow 4G, home JS under 30 KB gzipped, no CLS, renders without JS): islands and directives, client dependencies, images and the LCP element, fonts, render-blocking CSS and scripts, layout shift, iframes and embeds, animation cost, build cost of OG and snapshots | an island or client directive, a `<script>`, a client-side dependency, an image or asset, a font, global CSS, an iframe or embed, an integration, OG generation, or the above-the-fold markup of a page changed                     | `frameworks/astro.md`, `ui.md`  |
| `review-seo`  | Discoverability and sharing: titles and meta descriptions, canonical URLs and trailing slashes, Open Graph and Twitter tags, OG image registration, JSON-LD correctness, sitemap and `lastmod`, RSS, `robots.txt`, redirects, `noindex`, drafts, internal links to new pages | a page was added, renamed, or removed, or head metadata, a layout's `<head>` props, frontmatter that feeds meta, the OG registry, `src/lib/schema.ts`, the sitemap or RSS config, `robots.txt`, or a redirect changed             | `frameworks/astro.md`           |

## Ignore

Paths left out of the diff the reviewers read: `public/demos/**` (committed snapshots the build writes; review `src/integrations/demo-snapshots.ts` instead), `src/data/paceline-scenes.json` (generated by `pnpm sync:paceline`), `docs/archive/**` (historical Beads data), `.claude/agent-memory/**`.

## Architecture

- **Pages and routing:** `src/pages/` holds the file routes (`.astro`), the dynamic `insights/[...slug].astro`, `work/[...slug].astro`, and `services/[slug].astro`, `rss.xml.js`, and build-time OG endpoints under `src/pages/og/**` (satori, run at build, not runtime APIs). Layouts in `src/layouts/`: `Base.astro` (shell, head, no-FOUC theme script), `CaseStudy.astro`, `Insights.astro`.
- **Components:** `.astro` by default in `src/components/` (home sections in `home/`, tool demos in `tools/`). Svelte islands only where state or browser APIs are real: `ThemeToggle.svelte` (`client:idle`), `MobileNav.svelte` (`client:load`), `InquiryForm.svelte` (contact, support, media; `client:load`), and the `labs/` benchmarks chart.
- **Data:** two content collections in `src/content.config.ts` (`insights`, `work`); site constants in `src/consts.ts` (import, never hard-code); typed display data in `src/data/`; pure helpers in `src/lib/`. Work entries have two ids: frontmatter `data.id` (a display code such as `EAEO-004`) and the route id `entry.id` (the file name); mixing them breaks links.
- **Server boundary:** the only server code is `api/` (three endpoints plus `api/_lib/` for validation, Turnstile, and email). `api/` may import `src/consts.js`; nothing under `src/` imports from `api/`. The recipient and sender addresses live only in `api/_lib/email.ts`.
- **Styling:** Tailwind 4 with `@theme` tokens in `src/styles/global.css`, imported once in `src/components/BaseHead.astro`; no `tailwind.config.js` or PostCSS config. The theme is dark-first: `:root` is dark and `html.light` overrides the neutrals, so Tailwind's `dark:` variant follows the OS, not the site toggle.
- **Svelte 5 runes only:** `$props`, `$state`, `$derived`, `$effect`, snippets, `onclick`, callback props. `svelte.config.js` doesn't force runes mode, so legacy `export let`, `$:`, `<slot />`, `on:click`, or `createEventDispatcher` compile silently; each is a finding. Component order follows `CLAUDE.md`.
- **Where the repo overrides the playbooks:** forms post to the root `api/` Vercel functions, not `astro:actions`; env is read with `import.meta.env` (client, `PUBLIC_` only) and `process.env` (in `api/_lib/`), not `astro:env` or a config module. There is no component, end-to-end, or accessibility test setup, so `.astro` and `.svelte` rendering is covered by `astro check`, the build, and review; testable logic is pure code in `api/_lib/` and `src/lib/`, and modules that import `satori`, `sharp`, or `astro:*` can't run under Vitest (tests mirror such logic as literals, as `tests/og-coverage.test.ts` does).
- **Conventions:** TypeScript with `import type`; PascalCase components, kebab-case routes; Prettier owns formatting (tabs, single quotes, width 100), so formatting is never a finding. No raw smart quotes or non-breaking spaces in `.ts`, `.astro`, `.svelte`, or `.html`; markup encodes them as entities. Never call Ryan an "engineer" anywhere, including meta, JSON-LD, alt text, and OG titles (a protected title in BC).
- **Known pre-existing gaps** (count only where a change interacts): no skip link and no `id` on the `<main>` in `src/layouts/Base.astro`; `InquiryForm.svelte` shows its error with `text-red-600 dark:text-red-400` (raw palette plus `dark:`); its success message promises "two business days" (also `src/lib/og-pages.ts`) while `/contact/` and the rest of the site promise 48 hours; work entries with `status: 'draft'` still build a page and an OG image (`src/pages/work/[...slug].astro` and `src/pages/og/work/[...slug].png.ts` don't filter); `src/components/home/ClientLogos.astro` and `src/components/home/Industries.astro` (the only users of `Marquee.astro`) are rendered nowhere; `src/assets/blog-placeholder-*.jpg` and `src/assets/fonts/atkinson-*.woff` are unused; `CLAUDE.md` still says `/support` is the only server piece and the recipient lives in `api/support.ts`.

## Intentional non-issues

- Static output with no SSR adapter; don't recommend SSR, ISR, or an adapter unless the change needs one.
- No accounts, login, sessions, database, or CORS and CSRF configuration: the endpoints are public by design, protected by Turnstile plus the `website` honeypot, not by a rate limiter in code (Vercel's platform limits apply).
- The honeypot returns a fake `200 { ok: true }` on purpose, so bots learn nothing.
- `PUBLIC_TURNSTILE_SITE_KEY` is meant to be public, and the Turnstile script loads from `challenges.cloudflare.com` without SRI because Cloudflare forbids pinning it.
- `api/_lib/validation.ts` importing `../../src/consts.js` is the sanctioned direction; only `src/` importing `api/` is a problem.
- The benchmarks chart uses `client:load` on purpose (comment in `src/pages/labs/benchmarks.astro`).
- The accent written as an arbitrary value (`text-[var(--color-accent)]`), and the islands' `[var(--color-*)]` classes, resolve to the same tokens as the named utilities.
- `EmbeddedPage.astro` reaches into its same-origin embed's DOM by design.
- Live `DemoFrame.astro` iframes use `sandbox="allow-scripts allow-same-origin"` for cross-origin demo sites Ryan owns; the same-origin snapshot fallback gets an empty sandbox.
- English only (`docs/BRIEF.md` section 9); no i18n, no CMS, no newsletter.
- Static pages carry no sitemap `lastmod` (comment in `astro.config.mjs`); only insights do.
- `_references/` is excluded from lint and TypeScript on purpose.

## Extra focus

### security-reviewer: trust model

Reference: `.claude/skills/deep-review/references/security-reviewer.md`

- Blocker: a path reaches `sendEmail` without `verifyTurnstile` returning true.
- Blocker: a secret introduced as `PUBLIC_*`, or `TURNSTILE_SECRET_KEY` or `RESEND_API_KEY` read anywhere under `src/`.
- Blocker: `to`, `cc`, `bcc`, or `from` built from request input, or anything under `src/` importing `api/_lib/email.ts`.
- Blocker: a new HTML sink (`set:html`, `{@html}`, `innerHTML`, `srcdoc`) fed by input an anonymous visitor or a third-party origin controls.

### ui-reviewer: design system and visitor flow

Reference: `.claude/skills/deep-review/references/design-system.md`

- Warning: a drop shadow, a raw palette class (`text-gray-500`, `bg-blue-600`) or raw hex in markup, a `dark:` utility, or a second accent colour. Hairline borders and lighter surfaces carry structure.
- Warning: a page title (`h1`) or section heading that breaks the type scale its siblings use: the Work, Services, Insights, Tools, and About index pages share one `h1` size, and section headings and closing bands sit a step below the page's `h1`, following `src/components/Section.astro` and `src/components/home/EndCTA.astro`. Heading-scale drift is the most common real defect in this site's reviews.
- Visitor flow: can a cold visitor tell what Ryan does and reach `/contact/`; the inquiry form's pending, success, failure, validation, and Turnstile states; what renders without JavaScript; what a visitor sees when a `DemoFrame.astro` demo origin is down (the snapshot fallback, a snapshot that doesn't exist yet); dead links, dead ends, the 404 path; internal links in trailing-slash form (`/work/`).
- Rendering: Playwright isn't a dependency of this repo, so install it into the scratch folder, never the repo. Set the theme with localStorage `theme` (`light` or `dark`) before load. Astro 7 runs one dev server per project: check `pnpm exec astro dev status` and use a running server first; stop only a server you started. Starting `astro dev` re-captures any snapshot older than 7 days into the committed `public/demos/` in the background, so name any `public/demos/` change it causes in the report and leave it in place. The `api/` functions don't run under `astro dev`, and without `PUBLIC_TURNSTILE_SITE_KEY` the submit button stays disabled, so form submission can't be rendered locally.

### quality-reviewer, architecture-reviewer: Astro and Svelte code

Paths: `src/**`

- Warning: legacy Svelte syntax (`export let`, `$:`, `<slot />`, `on:click`, `createEventDispatcher`) in a `.svelte` file.
- The laziest client directive that works; props that cross an island boundary are serializable; `$effect` cleans up listeners and timers; no hydration mismatch from reading `window`, `localStorage`, or the date during render.
- Collection queries filter `draft` the way the insights routes do (`({ data }) => !data.draft`); a route uses `entry.id`, never `data.id`.
- Local raster images go through `astro:assets` (`<Image>`, `image()` in schemas); `is:inline` scripts ship verbatim and unprocessed.
- Display constants come from `src/consts.ts` or `src/data/`, not inline literals in a page.

### quality-reviewer, test-coverage-reviewer: the form endpoints

Paths: `api/**`, `src/components/InquiryForm.svelte`, `tests/support-validation.test.ts`

- The pipeline in every endpoint: parse JSON (400) → `validate*Submission` (400 with a user-facing `error`) → honeypot fake 200 → 500 when Turnstile or email isn't configured → `verifyTurnstile` (400) → `buildEmail` → `sendEmail` (502) → `200 { ok: true }`. The three endpoints stay consistent.
- Warning: a status code or the `{ ok }` / `{ error }` shape changed on one side of the contract without the other: `InquiryForm.svelte` posts to its `endpoint` prop and shows the `error` string from a non-2xx response.
- Warning: changed validation, Turnstile, or email logic in `api/_lib/` without a matching test in `tests/`.

### architecture-reviewer, security-reviewer: release safety

Paths: `vercel.json`, `package.json`, `pnpm-workspace.yaml`, `.github/**`, `astro.config.mjs`

- Blocker: `vercel.json` loses `build.env.ENABLE_EXPERIMENTAL_COREPACK`, or `installCommand` or `buildCommand` switches to `npx pnpm@...`.
- Warning: a route renamed or removed with no permanent redirect in `vercel.json`.
- Warning: a new `allowBuilds` entry (install scripts run on every install, in CI and on Vercel), a `minimumReleaseAgeExclude` entry that isn't an exact version with a reason, or an `overrides` change that reopens an advisory.
- Warning: a new env var not documented in `CLAUDE.md`, or read without the `isXConfigured` 500 path the endpoints use.

## After verification

`review-advisor` runs when at least one Blocker or Warning survives verification. It reads the verified findings, researches each fix in this repo's own helpers and components and in the official Astro, Svelte, Tailwind, Vercel, and W3C docs, and returns each finding as one plain-language problem and one recommended fix, plus cross-cutting recommendations and a fix order. Its answer replaces the wording and order of the Blockers and Warnings in the report and adds a **Recommendations** and **Fix order** section; it never changes a severity or the verdict.

## Report destination

`tmp/reviews/` (gitignored). No record command.
