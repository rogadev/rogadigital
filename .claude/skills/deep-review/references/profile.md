# Project profile: rogadigital.com

Read before the diff. Verified against `dev` at `b7528df` (2026-09-28). Paths are repo-relative. If the code in front of you disagrees, trust the code and note it under `Profile drift`.

## What the site is and who uses it

- The marketing and portfolio site for Roga Digital, the one-person software studio of Ryan Roga (Vancouver Island, BC). Package name `rogadigital`; canonical origin `https://rogadigital.com` (`site` in `astro.config.mjs`).
- Readers: prospective clients (business owners, managers, technical leads) deciding whether to hire Ryan, recruiters, and people reading his writing. Success is a cold visitor stating what Ryan does within ten seconds (`docs/BRIEF.md` section 10), then reaching `/contact/`.
- Main surfaces: home `/`, `/work/` and case studies `/work/<slug>/`, `/services/`, `/insights/` and articles `/insights/<slug>/`, `/tools/` (orc-pack, paceline), `/labs/` (apps, benchmarks), `/about/`, `/resume/`, `/contact/`, `/support/`, `/media/`, `/privacy/`, `/terms-of-service/`, `404`.
- Primary nav (`src/components/Header.astro`): Work, Services, Insights, Tools, About, plus a Contact button. Mobile nav is the `MobileNav.svelte` island.

## Stack and versions (`package.json` on dev)

- Astro `^7.3` (Rust compiler, Vite 8/Rolldown, Satteri markdown are default-on), `@astrojs/svelte` `^9` with Svelte `^5.57` (runes only), `@astrojs/mdx` `^8`, `@astrojs/sitemap`, `@astrojs/rss`, Tailwind CSS `^4.3` through `@tailwindcss/vite`, TypeScript `^6` (`astro/tsconfigs/strict`), `satori` + `sharp` for build-time OG images, Shiki transformers for code blocks.
- Tooling: Vitest `^5` (no config file; defaults), oxlint, ESLint 10 (typescript-eslint, `eslint-plugin-astro`, `eslint-plugin-svelte`), Prettier 3 with the astro and svelte plugins. No Playwright, no axe, no component-test setup.
- pnpm pinned to `pnpm@11.9.0` with an integrity hash; Node `>=24`. **pnpm config lives in `pnpm-workspace.yaml`**, not `package.json`: `allowBuilds` (sharp, esbuild), `minimumReleaseAgeExclude` (exact versions allowed past pnpm's minimum release age), and `overrides` for security advisories. `pnpm audit` must stay at 0.
- Output is **static** (`dist/`), no SSR adapter. Deployed on Vercel.

## Repo map

- `astro.config.mjs` - integrations (mdx, sitemap with a `lastmod` serializer read from insight frontmatter, svelte, `demoSnapshots`), `trailingSlash: 'always'`, `/blog` redirects, Shiki dual themes (`defaultColor: false`, swapped by `html.light` in CSS).
- `src/pages/` - file-based routes (`.astro`), dynamic `insights/[...slug].astro` and `work/[...slug].astro` (use `getStaticPaths` over content collections), `rss.xml.js`, and build-time OG endpoints `og/[page].png.ts`, `og/default.png.ts`, `og/insights/[...slug].png.ts`, `og/work/[...slug].png.ts`.
- `src/layouts/` - `Base.astro` (the shell: `<html lang>`, head, no-FOUC theme script, header, footer; there is no skip link today), `CaseStudy.astro` (work entries), `Insights.astro` (articles).
- `src/components/` - `.astro` by default; Svelte islands only where state or browser APIs are real: `ThemeToggle.svelte` (`client:idle`), `MobileNav.svelte` (`client:load`), `InquiryForm.svelte` (contact, support, and media forms; `client:load`), `labs/SchmeckleChart.svelte` + `BarsView.svelte` + `DotsView.svelte` (benchmarks chart; deliberately `client:load`, see the comment in `src/pages/labs/benchmarks.astro`). Home sections in `components/home/`, tool demos in `components/tools/`. Shared building blocks: `Section.astro`, `WindowCard.astro`, `Screenshot.astro`, `ScreenshotPending.astro`, `StatusIndicator.astro`, `Marquee.astro`, `DemoFrame.astro`, `EmbeddedPage.astro`.
- `src/content/` + `src/content.config.ts` - two collections with glob loaders and zod schemas: `insights` (title, description, pubDate, updatedDate?, heroImage?, tags, readingTime?, draft) and `work` (id, client, industry, headline, outcome, tags, period, role, status enum, featured, order, heroImage?, liveUrl?, repoUrl?, highlight?).
- `src/consts.ts` - site-wide constants (SITE_TITLE, SITE_DESCRIPTION, SITE_AUTHOR, SITE_LOCATION, SOCIAL, SUPPORT_PRODUCTS, INDUSTRIES). Import from here; never hard-code them.
- `src/data/` - typed data modules (`apps.ts`, `benchmarks.ts`, `tools.ts`).
- `src/lib/` - `schema.ts` (JSON-LD builders: organization, person, blogPosting, breadcrumb), `og.ts` (satori render; pulls in sharp, cannot run under Vitest), `og-pages.ts` and `og-path.ts` (OG title registry and path derivation), `demos.ts` (demo site list), `marquee.ts`.
- `src/integrations/demo-snapshots.ts` - a build-time integration that captures self-contained HTML snapshots of external demo sites into `public/demos/` (committed) so `DemoFrame.astro` can fall back when a live site is down. A failed capture never fails the build.
- `src/styles/global.css` - the design tokens and base layer; imported once in `src/components/BaseHead.astro`.
- `api/` - Vercel serverless functions built alongside the static output: `contact.ts`, `support.ts`, `media.ts` (each `export async function POST(request: Request): Promise<Response>`), and shared helpers in `api/_lib/` (`validation.ts`, `turnstile.ts`, `email.ts`). The recipient and sender addresses live only in `api/_lib/email.ts`.
- `public/` - static files served as-is, including `public/demos/*.html` (snapshots), `public/embeds/` (standalone HTML embeds), favicons, `manifest.json`, `robots.txt`.
- `tests/` - Vitest unit tests: `support-validation.test.ts` (the `api/_lib/validation.ts` functions), `og-coverage.test.ts` (OG registry stays in sync).
- `docs/BRIEF.md` (design principles), `docs/PLAN.md` (phased migration), `docs/superpowers/specs/` and `plans/` (dated design specs and plans for past features: benchmarks, support form, contact form booking terms; plus `2026-07-01-self-hosted-booking-brief.md` for planned work). Specs are point-in-time designs that later work can supersede.
- `src/types/turnstile.d.ts` - the Turnstile global types. `.fallowrc.json` - ignore patterns for the optional fallow tool; no script or CI runs it.
- `_references/` is a gitignored read-only archive of the old SvelteKit site. Ignore it; never recommend editing it.

## Design system

The rule book is `docs/BRIEF.md` section 3 and section 7, plus the tokens in `src/styles/global.css`.

- **Tokens** (Tailwind v4 `@theme` in `global.css`; there is no `tailwind.config.js`): neutrals `bg`, `bg-soft`, `bg-elevated`, `fg`, `fg-muted`, `fg-subtle`, `border`, `border-strong`; one accent `accent` (`#5b67ff`), `accent-hover`, `accent-fg`; status `positive`, `warning`, `negative` (used sparingly); radii `xs`/`sm`/`md`/`lg`; `--container-page: 1240px`; a custom type scale from `text-2xs` to `text-6xl` with paired line heights. Use them as utilities (`bg-bg`, `text-fg-muted`, `border-border`, `max-w-page`). The accent is written as an arbitrary value today (`text-[var(--color-accent)]`, `bg-[var(--color-accent)]`), and the islands use `[var(--color-*)]` throughout; both forms resolve to the same token, so neither is a finding.
- **Dark-first theming.** `:root` values are dark; `html.light` overrides the neutrals. The theme is a class on `<html>` (`light` or absent), set before paint by the inline script in `Base.astro` from localStorage key `theme` (`'light' | 'dark'`), falling back to `prefers-color-scheme`. `ThemeToggle.svelte` writes the same key. Tailwind's `dark:` variant is not wired to this class, so a `dark:` utility is almost always a bug; theme differences belong in tokens.
- **Rules** (each can change a verdict): one accent, used for action, status, or emphasis, never decoration; everything else is the grayscale ramp (3.3). **No drop shadows**; hairline 1px borders define structure, and elevation is a lighter surface (3.6). Typography builds hierarchy through weight, size, and tracking, not colour (3.2). Mono (`font-mono`, Geist Mono) for technical content: code, IDs, timestamps, paths, labels (3.8). Purposeful motion only, 40 to 200 ms, no scroll-triggered fade-ins or parallax (3.4). Real product screenshots, never abstract illustrations or gradients (3.5). Empty, error, and loading states are designed, not afterthoughts (3.7). Dark and light are peers (3.10).
- Raw palette classes (`text-gray-500`, `bg-blue-600`) and raw hex values in markup are off-system; use the tokens.
- Fonts: Geist Variable and Geist Mono Variable, imported in `global.css` from `@fontsource-variable/*`. `src/lib/og.ts` reads the static `@fontsource/geist-sans` and `@fontsource/geist-mono` `.woff` files for satori. `src/assets/fonts/atkinson-*.woff` are unused leftovers.
- Layout: content regions use `max-w-page` (or similar) with auto margins; mobile-first Tailwind (`sm:`, `md:`, `lg:`).
- Focus: `*:focus-visible` gets a 2px accent outline with a 2px offset in `global.css`. Never remove it without a replacement.

## Quality bars from `CLAUDE.md` (hard requirements)

- **Mobile-first**: base styles for the smallest viewport, then layer up. Touch targets at least 44 by 44 px (`min-h-11 min-w-11`). Test mentally at 320 px.
- **Fully responsive**: no horizontal scroll from 320 px to 1920 px. Astro `<Image>` for raster images; images `max-width: 100%; height: auto`. Fluid type (`clamp()` or stepped utilities).
- **WCAG 2.2 AA**: semantic HTML first; every `<img>` has `alt` (decorative is `alt=""`); contrast at least 4.5:1 for text and 3:1 for large text and UI; visible focus; keyboard operable; `Esc` closes overlays, focus trapped in dialogs and restored on close; labels paired to inputs, errors through `aria-describedby`; colour never the only signal; `prefers-reduced-motion` respected; `lang` on `<html>`, a unique `<title>`, exactly one `<h1>`, a skip link as the first focusable element.

## Conventions and hard rules

- **Never call Ryan an "engineer".** It is a protected title in BC (Engineers and Geoscientists BC). No "Software Engineer", "engineering lead", "built by one engineer", including meta tags, JSON-LD `jobTitle`, alt text, and OG titles. Use Developer, Technical Lead, Specialist, or a role-specific title. Generic references to other companies' engineering practices are fine. A violation in new copy is a Blocker.
- Default to `.astro` components. A `.svelte` island needs real state, events, or browser APIs, and a client directive (`client:load`, `client:idle`, `client:visible`); without one it renders as static HTML.
- Svelte 5 runes only (not enforced by `svelte.config.js`, so a legacy `export let` or `$:` compiles silently in legacy mode; treat it as a finding): `$props()`, `$state()`, `$derived()`, `$effect()`, `{@render children?.()}`, `onclick={...}`, callback props. No `export let`, `$:`, `<slot />` in Svelte, `on:click`, or `createEventDispatcher`. Component order: type imports, imports, `$props`, `$state`, `$derived`, `$effect`, functions, template, styles.
- TypeScript everywhere; `import type` for type-only imports. PascalCase component filenames; kebab-case route directories.
- Tailwind utilities over custom CSS for layout, spacing, and typography; `@theme` tokens over raw values.
- Site constants come from `src/consts.ts`. The email recipient lives only in `api/_lib/email.ts`, never under `src/`.
- With static output and no adapter, the `redirects` in `astro.config.mjs` (`/blog`) are emitted as meta-refresh HTML pages, not HTTP redirects. Only the `redirects` in `vercel.json` are real permanent (308) redirects, so a renamed route belongs there.
- Canonical URLs end with a slash (`trailingSlash: 'always'` in Astro, `"trailingSlash": true` in `vercel.json`). Internal links use the trailing-slash form (`/work/`, not `/work`).
- Formatting (Prettier owns it): tabs, single quotes, trailing commas `all`, width 100, LF. Do not report formatting.
- No smart quotes or non-breaking spaces as raw characters in `.ts`, `.astro`, `.svelte`, or `.html` source; encode typography as entities (`&rsquo;`, `&mdash;`) in markup or `\u2019` in strings. Prose files (`.md`, `.mdx` content) carry real typography.
- Commits: conventional (`type(scope): subject`). Work lands on `dev`; a PR from `dev` to `main` ships.

## Server side: the Vercel functions

- Three endpoints, one pattern: parse JSON (400 on failure) -> `validate*Submission` from `api/_lib/validation.ts` (400 with a user-facing `error`) -> honeypot `website` field non-empty returns a fake 200 -> 500 if Turnstile or email is not configured -> `verifyTurnstile(token, remoteip)` (400 on failure) -> `buildEmail` -> `sendEmail({ subject, text, replyTo })` through Resend (502 on failure) -> 200 `{ ok: true }`.
- Env: `PUBLIC_TURNSTILE_SITE_KEY` (build-time, inlined into `InquiryForm.svelte` through `import.meta.env`), `TURNSTILE_SECRET_KEY` and `RESEND_API_KEY` (runtime, `process.env` in `api/_lib/`). A new env var must be added in Vercel for Production and Preview.
- The client contract: `InquiryForm.svelte` posts to its `endpoint` prop and shows the `error` string from a non-2xx response. Changing a status code or the `error`/`ok` shape on one side must be matched on the other.
- Imports inside `api/` use `.js` extensions (`./_lib/email.js`) for Node ESM resolution on Vercel; keep them.

## Build-time pieces

- OG images are generated at build by satori (`src/pages/og/**`), cached immutable by `vercel.json` headers. `src/lib/og-pages.ts` registers the titles; `tests/og-coverage.test.ts` pins the registry. A new static page that should share well needs an entry.
- Sitemap `lastmod` comes only from insight `updatedDate`/`pubDate`; static pages deliberately have none (comment in `astro.config.mjs`).
- JSON-LD is built in `src/lib/schema.ts` and emitted in `BaseHead.astro` with `set:html={JSON.stringify(schema)}` inside `<script type="application/ld+json">`. That is the only `set:html` site today.
- `demoSnapshots` runs at build and dev start; snapshots and `public/demos/manifest.json` are committed.

## Deployment and CI

- Vercel serves `dist/` from its CDN; `api/*.ts` become functions. `vercel.json` sets `framework: astro`, `buildCommand: pnpm build`, `installCommand: pnpm install --frozen-lockfile`, `trailingSlash: true`, long-cache headers for `/og/`, and permanent redirects for old work URLs. **`build.env.ENABLE_EXPERIMENTAL_COREPACK=1` is required** so Vercel provisions the pinned pnpm 11 through Corepack; without it the build falls back to pnpm 9 and fails on `pnpm-workspace.yaml`. Never swap in `npx pnpm@...` (loses the integrity check).
- CI (`.github/workflows/ci.yml`, on push and PR to `main` and `dev`): `pnpm install --frozen-lockfile`, `format:check`, `lint`, `check`, `build`. **CI does not run `pnpm test`**, so the review gate is often the only place the unit tests run.
- Dependabot (`.github/dependabot.yml`) opens update PRs; the `/auditfix` skill consolidates them.

## Documented decisions that are NOT findings

- Static output with no SSR adapter; the only server code is `api/`. Do not recommend SSR, ISR, or an adapter unless the change needs one.
- No login, no user accounts, no database. The forms are protected by Turnstile plus a honeypot, not by rate limiting in code (Vercel's platform limits apply).
- Honeypot hits return a fake success on purpose.
- The benchmarks chart uses `client:load` on purpose (comment in `src/pages/labs/benchmarks.astro`).
- No i18n (`docs/BRIEF.md` section 9): English only. Do not ask for localization.
- No newsletter, no CMS: content is files in the repo.
- Static pages carry no sitemap `lastmod`.
- Demo snapshots in `public/demos/` are committed build artifacts, not hand-written code; review the integration, not the snapshot HTML.
- `_references/` is ignored by lint and TypeScript on purpose.

## Tests

- `pnpm test` is `vitest run` with no config: it picks up `**/*.test.ts` (today only `tests/`). Tests import source by relative path (`../api/_lib/validation`, `../src/lib/og-path`).
- Anything that imports `satori`, `sharp`, or `astro:*` virtual modules cannot run under plain Vitest; tests mirror such logic as literals (see the comment in `og-coverage.test.ts`).
- There are no component, e2e, or accessibility tests. Pure logic in `api/_lib/` and `src/lib/` is the testable surface; `.astro` and `.svelte` rendering is checked by `astro check`, `astro build`, and review.

## Check commands (check-only)

- `pnpm format:check` (Prettier `--check`), `pnpm exec oxlint`, `pnpm exec eslint .`, `pnpm check` (`astro check`: TypeScript plus content-schema validation), `pnpm test` (`vitest run`), `pnpm build` (writes the gitignored `dist/` and `.astro/`).
- Do not run `pnpm ready`, `pnpm fix`, `pnpm format`, or `pnpm lint:fix`: they rewrite files.

## Local dev and renders

- `pnpm dev` serves on `http://localhost:4321` (Astro default). Astro 7 runs one dev server per project (`astro dev status`, `astro dev stop`); it often runs in the background. No login is needed. Without `PUBLIC_TURNSTILE_SITE_KEY`, the form still loads the Turnstile widget with no site key; it never produces a token, so the submit button stays disabled. The `api/` functions do not run under `astro dev` (they need `vercel dev`), so form submission cannot be exercised locally by a render.
- Theme: set localStorage `theme` to `light` or `dark` before load (Playwright `addInitScript`); without it the page follows `prefers-color-scheme`.
- The most-used pages for a design-token change: `/` and `/work/`, plus one case study (`/work/telus-tc-tools/`) and one article from `src/content/insights/`.
- Playwright is not a dependency of this repo. Renders need it installed into the review's scratch directory (see the skill's Phase 3).

## Known pre-existing issues (recognize, do not count)

- `CLAUDE.md` describes `/support` as the one server-side piece and `api/support.ts` as the recipient's home; in fact there are three endpoints (`contact`, `support`, `media`) and the addresses live in `api/_lib/email.ts`.
- `CLAUDE.md` lists `pnpm test` as covering the support form only; it also covers the contact and media validators and the OG registry.
- CI skips `pnpm test`, and so does `pnpm ready`.
- Leftover starter assets: `src/assets/blog-placeholder-*.jpg`, `src/assets/fonts/atkinson-*.woff`.
- Work entries with `status: 'draft'` are hidden from `/work/` and the home page but still build `/work/<id>/`, an OG image, and a sitemap entry: `src/pages/work/[...slug].astro` and `src/pages/og/work/[...slug].png.ts` do not filter them. Insights filter `draft` correctly.
- The sitemap has no `filter`, so a page marked `noindex` is still listed.
- `verifyTurnstile` and `sendEmail` (`api/_lib/`) have no timeout and do not catch network or JSON errors, so an unreachable upstream produces a platform 500 instead of the documented JSON error.
- `src/integrations/demo-snapshots.ts` strips only `<script>` blocks from remote HTML, and `DemoFrame.astro` serves the snapshot same-origin without `sandbox`.
- `BaseHead.astro` emits JSON-LD with `set:html={JSON.stringify(schema)}`, which does not escape `<`; today only repo authors write those fields.
- No security headers in `vercel.json` (no CSP, no `frame-ancestors`); no top-level `permissions:` in `ci.yml`.
- `ClientLogos.astro` (and so `Marquee.astro`) is not rendered on any page.
- There is no skip link and no `#main-content` target, although `CLAUDE.md` requires one. New layout work should add it; a change that does not touch the shell does not own it.
- `InquiryForm.svelte` shows errors with `text-red-600 dark:text-red-400`: a raw palette colour plus a `dark:` class, so the error colour follows the OS theme, not the site toggle.
- The home hero `animate-ping` dot ignores `prefers-reduced-motion`.
- The theme toggle and mobile-menu button are 28 px, below the 44 px bar; the mobile menu does not move or trap focus.
- Measured token contrast: dark `fg-subtle` on `bg` is 3.81:1 (below 4.5:1 for body text); the accent as text in light mode and white on the accent are both 4.35:1.
- The form success card promises a reply in "two business days" while `/contact/` promises 48 hours; the E&EO name is expanded three different ways across the site.
- Rendered pages show axe `color-contrast` violations in both themes on `/` and `/contact/` (measured 2026-09-28); new code must not add to them.
- Work entries have two ids: frontmatter `data.id` (a display code such as `EAEO-004`) and the route id `entry.id` (the file name, such as `eaeo`). Mixing them breaks links.
