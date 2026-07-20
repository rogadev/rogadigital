# roga.dev

[![Astro 6](https://img.shields.io/badge/Astro-6-ff5d01.svg)](https://astro.build/)
[![Svelte 5](https://img.shields.io/badge/Svelte-5-ff3e00.svg)](https://svelte.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black.svg)](https://vercel.com/)

Portfolio and business website for **Roga Digital** — a software studio building internal tools, dashboards, integrations, and AI features for businesses.

**Live site**: [roga.dev](https://roga.dev)

> **Status**: mid-redesign. Stack pivoted from SvelteKit to Astro + Svelte islands in May 2026 (`package.json` 2.0.0 marks the cutover). The previous SvelteKit build is preserved read-only at `_references/old-svelte-site/` for content lift only. Design principles and the phased migration plan live in [`docs/BRIEF.md`](docs/BRIEF.md) and [`docs/PLAN.md`](docs/PLAN.md).

## Tech stack

- **[Astro 6](https://astro.build/)** — static output, no SSR adapter. Vercel auto-detects `dist/`.
- **[Svelte 5](https://svelte.dev/)** islands via `@astrojs/svelte`. Runes mode only.
- **[Tailwind CSS v4](https://tailwindcss.com/)** via `@tailwindcss/vite` — no `tailwind.config.js`, no PostCSS config. Tokens live in `src/styles/global.css` under `@theme`.
- **[MDX](https://mdxjs.com/)** + Astro content collections for posts (`src/content/insights/`).
- **[Shiki](https://shiki.style/)** with dual `github-dark-default` / `github-light` themes for code blocks.
- **[Geist](https://vercel.com/font)** + **Geist Mono** via `@fontsource-variable`.
- **[Satori](https://github.com/vercel/satori)** for OG image generation.
- **TypeScript** everywhere.
- **[Vercel](https://vercel.com/)** for hosting (static `dist/`).

## Getting started

### Prerequisites

- **Node.js** ≥ 22.12
- **pnpm** (required)

### Install & run

```bash
git clone https://github.com/rogadev/rogadigital.git
cd rogadigital
pnpm install
pnpm dev
```

Dev server runs at [http://localhost:4321](http://localhost:4321).

If `pnpm install` aborts with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`, prefix with `CI=true`. `sharp` and `esbuild` are allowlisted under `pnpm.onlyBuiltDependencies` so their post-install scripts run.

## Scripts

| Command          | Action                                                 |
| :--------------- | :----------------------------------------------------- |
| `pnpm dev`       | Start dev server at `localhost:4321`                   |
| `pnpm devo`      | Start dev server and open browser                      |
| `pnpm build`     | Build static site to `dist/`                           |
| `pnpm preview`   | Preview the production build                           |
| `pnpm check`     | `astro check` — TypeScript + content schema validation |
| `pnpm lint`      | `oxlint` then `eslint`                                 |
| `pnpm lint:fast` | `oxlint` only                                          |
| `pnpm lint:fix`  | Auto-fix lint issues                                   |
| `pnpm format`    | Prettier write                                         |
| `pnpm fix`       | Format + format-check + lint:fix + lint                |
| `pnpm ready`     | `pnpm fix && pnpm check` — pre-commit gate             |

## Project structure

```
src/
├── assets/             # Imported assets (optimized at build time)
├── components/         # .astro for static, .svelte only when interactivity is real
├── content/
│   └── insights/       # MDX/Markdown posts (collection)
├── layouts/            # Shared page layouts
├── pages/              # File-based routing (.astro, .md, .mdx, endpoints)
│   ├── insights/       # /insights index + [...slug] post route
│   └── rss.xml.js      # RSS feed
├── styles/
│   └── global.css      # Tailwind v4 import + @theme tokens
├── consts.ts           # Site-wide constants (title, tagline, social, roles)
└── content.config.ts   # Content collection schemas

public/                 # Static assets served as-is
docs/                   # BRIEF.md, PLAN.md
_references/            # Read-only archives (gitignored)
```

`/blog` and `/blog/[...slug]` redirect to `/insights` (configured in `astro.config.mjs`).

## Conventions

- **Components**: PascalCase filenames. Default to `.astro`; reach for `.svelte` only when state, events, or browser APIs are actually required.
- **Routes**: kebab-case directories.
- **TypeScript**: `import type` for type-only imports.
- **Styling**: Tailwind utilities first; use `@theme` tokens before raw values.
- **Content**: prefer MDX for posts that embed components; plain `.md` is fine otherwise.
- **Site constants**: import from `src/consts.ts` rather than hard-coding titles, social links, etc.

### Svelte 5 (when writing islands)

Runes mode only — no Svelte 4 patterns:

- `$props()` not `export let`
- `$state()`, `$derived()`, `$effect()` not `$:` reactive statements
- `{@render children?.()}` not `<slot />`; named snippets not named slots
- `onclick={handler}` not `on:click={handler}`
- Callback props (e.g. `onPageChange`) not `createEventDispatcher`

To hydrate an island, add a client directive when importing into an `.astro` file (`client:load`, `client:idle`, `client:visible`). Without one, Svelte renders as static HTML.

## Quality bars

Every component and page must satisfy all three (full detail in [`CLAUDE.md`](CLAUDE.md)):

- **Mobile-first** — author base styles for the smallest viewport, then layer up. Touch targets ≥ 44×44 px.
- **Fully responsive** — no horizontal scroll from 320 px to 1920 px+. Fluid typography preferred.
- **Accessible (WCAG 2.2 AA)** — semantic HTML first, visible focus, keyboard-operable, color is never the only signal, motion respects `prefers-reduced-motion`.

## Deployment

Static output, deployed on Vercel from the `main` branch. Vercel auto-detects `dist/`. No SSR adapter is configured — if edge image optimization or ISR is ever needed, add `@astrojs/vercel`.

## Issue tracking

This project uses **GitHub Issues** for work tracking and **Claude Code Tasks** for agent session coordination. See [`CLAUDE.md`](CLAUDE.md) for the full workflow.

## Contact

**Ryan Roga** — Roga Digital, Vancouver Island, BC

- Website: [roga.dev](https://roga.dev)
- Book a call: [cal.com/ryanroga](https://cal.com/ryanroga)
- LinkedIn: [linkedin.com/in/ryanroga](https://linkedin.com/in/ryanroga)
- GitHub: [github.com/rogadev](https://github.com/rogadev)
