# Lane catalog

The reviewers `/deep-review` can dispatch. Each lane owns one surface, so lanes can run in parallel without duplicating each other. The "owns" column is the boundary: when two lanes could both claim a defect, the lane that owns the consequence takes it.

All agent files live in `.claude/agents/`. Every lane reads `references/profile.md` first.

## Families and lanes

### Checks

| Lane | Model | Owns | Runs when |
| --- | --- | --- | --- |
| `review-gate` | haiku | Running the repo's check-only commands: Prettier check, oxlint, ESLint, `astro check`, `vitest run`, and `astro build` when the change can break the build. Reports facts, judges nothing. | Any code, config, style, or content change. |

### User experience (judged from the visitor's side of the screen)

| Lane | Model | Owns | Runs when |
| --- | --- | --- | --- |
| `review-ux-visual` | fable | Look and feel: hierarchy, spacing and alignment, typography, the one-accent rule, borders not shadows, tokens over raw values, dark and light as peers, responsive layout from 320 to 1920 px, long text and overflow, real screenshots over illustrations, motion restraint. Uses renders when available. | Any markup, style, or token change. The only UX lane a style-only change always needs. |
| `review-ux-a11y` | sonnet | Accessibility (WCAG 2.2 AA): contrast in both themes, semantic HTML and landmarks, one `<h1>` and heading order, names and labels, ARIA used correctly, keyboard operation, focus order and focus management (mobile nav, dialogs), visible focus, 44 px targets, reduced motion, announcements for dynamic content (form status), skip link, `alt` text. | Any markup, style, or token change. Strong when interactive elements, colours, or tokens change. |
| `review-ux-flow` | sonnet | Visitor journeys: can a prospect understand the offer and reach contact, navigation and wayfinding, form flow (pending, success, failure, validation, Turnstile), empty and error states, dead links and dead ends, what happens without JavaScript, the 404 path, broken or missing states when an external demo is down. | New or changed pages, interactive islands, forms, nav. Not for style-only changes. |
| `review-ux-copy` | sonnet | Words: clarity, plain language, positioning and the ten-second test, the "engineer" rule, consistency of names (products, clients, services) with `src/consts.ts` and the rest of the site, sentence case, CTAs that name the action, error and status messages, spelling and grammar in pages and content collections. | Changed user-facing text, MDX or Markdown content, or data modules with display strings. |

### Frontend code

| Lane | Model | Owns | Runs when |
| --- | --- | --- | --- |
| `review-fe-framework` | sonnet | Astro and Svelte correctness: `.astro` versus island choice, client directives, props that cross the island boundary (serializable only), Svelte 5 runes and effect cleanup, hydration mismatches, inline scripts (`is:inline` versus processed `<script>`), `getStaticPaths` and content-collection queries (`getCollection`, draft filtering, sorting), `astro:assets` usage, `import.meta.env` versus `process.env`, the static-output constraint (no request-time data in pages), redirects and trailing slashes in links. | Svelte islands, `.astro` components with logic or scripts, pages, layouts, content config, integrations. |

### Server

| Lane | Model | Owns | Runs when |
| --- | --- | --- | --- |
| `review-api` | sonnet | The Vercel functions in `api/`: logic errors, validation (shape, length, required fields; not injection), status codes and the `{ ok }` / `{ error }` contract with `InquiryForm.svelte`, error handling and propagation, Turnstile and Resend failure modes, timeouts on outbound calls, honeypot behaviour, consistency across the three endpoints and `api/_lib/`. | Any change under `api/`, or a change to `InquiryForm.svelte` that alters what it sends or expects. |

### Cross-cutting

| Lane | Model | Owns | Runs when |
| --- | --- | --- | --- |
| `review-seo` | sonnet | Discoverability and sharing: `<title>` and meta description per page, canonical URLs and trailing slashes, OG and Twitter tags, OG image registration (`src/lib/og-pages.ts`), JSON-LD correctness (`src/lib/schema.ts`), sitemap and `lastmod`, RSS, `robots.txt`, redirects in `astro.config.mjs` and `vercel.json`, `noindex` use, heading structure as it affects search, internal linking to new pages. | New or renamed pages, head or layout changes, content frontmatter, OG, schema, sitemap, RSS, redirects. |
| `review-perf` | sonnet | Performance against the brief's bar (Lighthouse 100, LCP under 1 s fast and 2.5 s slow 4G, home JS under 30 KB gzipped, no CLS): island weight and directive choice, new dependencies shipped to the client, images (`<Image>`, sizes, formats, dimensions), fonts, render-blocking scripts and CSS, layout shift, third-party embeds and iframes, build-time cost of integrations and OG generation. | Islands, new client dependencies, images, fonts, global CSS, embeds, integrations. Medium-plus changes. |
| `review-ops` | sonnet | Release safety: `vercel.json` (Corepack env, headers, redirects, install and build commands), CI workflow, Dependabot, `pnpm-workspace.yaml` (`allowBuilds`, `overrides`), `packageManager` pin, env var handling and documentation, dependency choice and licence, build-time integrations that call the network. Security consequences stay with `review-security`. | Config, CI, deps, env, `vercel.json`, integrations. |
| `review-quality` | sonnet | Maintainability: readability, naming, component and function size, duplication (Rule of Three), dead code, TypeScript types (`any`, unchecked casts, `!`, suppressions without a reason), the repo's lint-invisible conventions (Svelte 5 patterns, component order, `import type`, constants from `src/consts.ts`), smart quotes in source, comments that mislead. | Medium-plus changes with real code. |
| `review-architecture` | sonnet | Structure: file placement against the repo map, `.astro` versus `.svelte` placement, layouts versus components versus pages, data in `src/data/` or `src/consts.ts` rather than inline, a second module duplicating an existing one, server code outside `api/`, secrets or the recipient address under `src/`, new top-level directories. | New files, moves, deletes, or large changes. |
| `review-tests` | sonnet | Test coverage and quality: changed logic in `api/_lib/` and `src/lib/` has meaningful Vitest tests, assertions prove behaviour, tests not weakened to pass, registries pinned by tests stay pinned (OG coverage). Reads tests; the gate runs them. Does not demand tests for `.astro` markup. | Logic changed, or test files changed. |
| `review-intent` | sonnet | Alignment with requirements: does the change do what its GitHub issue, PR description, task, or `docs/superpowers/specs/` design asks; acceptance criteria met or visibly missing; unrequested scope; `docs/PLAN.md` phase exit criteria when the change claims one. | Medium-plus changes where an issue, PR body, or spec exists. |

### Security

| Lane | Model | Owns | Runs when |
| --- | --- | --- | --- |
| `review-security` | opus | Exploitable issues: the `api/` functions (Turnstile bypass, header or email injection, abuse as a spam relay, error bodies that leak), secrets (`PUBLIC_` exposure, the recipient address under `src/`), HTML sinks (`set:html`, `{@html}`, `innerHTML`, JSON-LD escaping), iframes and embeds (`sandbox`, `allow`, third-party origins), inline scripts, open redirects in `vercel.json` or Astro redirects, supply chain (new dependencies, `allowBuilds`, overrides), CI permissions. | `api/`, env, HTML sinks, iframes, scripts, redirects, CI, dependencies. Never dropped for budget when the change really touches one of these; skipped (with a stated reason) for copy, colour, layout, content, docs, and test-only changes. |

### After the lanes

| Agent | Model | Job |
| --- | --- | --- |
| `review-verifier` | opus | Re-reads every finding against the code. Confirms, downgrades, marks pre-existing, discards, or flags needs-human. Merges duplicates across lanes. Adds nothing new except up to three incidentals. |
| `review-advisor` | opus | Turns the verified list into recommendations: groups findings by root cause, researches fix options in this repo and official docs, recommends one option per problem with the trade-off, and writes each problem and solution in plain language. |

## Boundaries that are easy to blur

- **Contrast**: `review-ux-a11y` owns contrast ratios. `review-ux-visual` owns whether the colour is the right token and looks right.
- **Form states**: `review-ux-flow` owns whether the visitor is well served (is there a pending, success, and error state, does it help). `review-fe-framework` owns whether the island code produces it correctly (state bugs, effect cleanup). `review-ux-copy` owns the words. `review-api` owns what the server returns.
- **The form contract**: `review-api` owns the response shape and status codes. `review-fe-framework` owns whether `InquiryForm.svelte` handles every shape.
- **Tokens in code**: `review-ux-visual` owns token use in markup and CSS. `review-quality` does not re-report it.
- **Validation**: `review-api` owns wrong-shape or out-of-range input causing wrong behaviour. `review-security` owns input that becomes an attack (header injection, HTML in email).
- **Headings**: `review-ux-a11y` owns heading order and the single `<h1>` as accessibility. `review-seo` owns titles and meta. Report a heading defect once, under a11y.
- **Meta copy**: `review-seo` owns whether a title or description exists, is unique, and fits length limits. `review-ux-copy` owns its wording, including the "engineer" rule.
- **Images**: `review-perf` owns format, size, and loading. `review-ux-a11y` owns `alt`. `review-ux-visual` owns whether it is a real screenshot and looks right.
- **Islands**: `review-fe-framework` owns whether the directive and island code are correct. `review-perf` owns the cost of the JS it ships. `review-architecture` owns whether it should be an island at all when that is a placement question.
- **Placement and duplication**: `review-architecture` owns a second module doing what an existing one does. `review-quality` owns copy-pasted code within the change.
- **Config**: `review-ops` owns whether `vercel.json`, CI, or `pnpm-workspace.yaml` changes are safe to ship. `review-security` owns exploitable consequences (an open redirect, a workflow with write permissions on PRs). `review-seo` owns the SEO effect of redirects.
- **Tests for security controls**: `review-tests` owns them; a missing test on changed validation or Turnstile logic is a Warning there.
- **Promised tests**: `review-intent` reports a test the issue explicitly promised and the change lacks, once. `review-tests` owns coverage in general.
- **Spelling**: `review-quality` owns code identifiers. `review-ux-copy` owns user-facing text.
- **Error context**: `review-quality` owns lost debugging context (a swallowed error). `review-api` owns the failure-mode consequence.
