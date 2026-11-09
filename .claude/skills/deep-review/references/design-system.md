# Design system: rogadigital.com

`ui-reviewer` reads this before the diff. The rule book is `docs/BRIEF.md` sections 3 (design principles) and 7 (visual system), plus the tokens in `src/styles/global.css`. Checked against `dev` on 2026-11-09; when the code disagrees, trust the code.

## Tokens

Tailwind 4 `@theme` tokens in `src/styles/global.css`, used as utilities (`bg-bg`, `text-fg-muted`, `border-border`, `max-w-page`). There is no `tailwind.config.js`.

| Token            | Dark (`:root`) | Light (`html.light`) |
| ---------------- | -------------- | -------------------- |
| `bg`             | `#0a0a0b`      | `#ffffff`            |
| `bg-soft`        | `#101012`      | `#fafafa`            |
| `bg-elevated`    | `#161618`      | `#f4f4f5`            |
| `fg`             | `#f5f5f6`      | `#0a0a0b`            |
| `fg-muted`       | `#a1a1a8`      | `#52525b`            |
| `fg-subtle`      | `#82828a`      | `#6d6d76`            |
| `border`         | `#1f1f23`      | `#e5e5e8`            |
| `border-strong`  | `#2a2a31`      | `#d4d4d8`            |
| `accent`         | `#5b67ff`      | same                 |
| `accent-hover`   | `#4751f0`      | same                 |
| `accent-fg`      | `#ffffff`      | `#ffffff`            |

Status colours `positive` (`#22c55e`), `warning` (`#f59e0b`), and `negative` (`#ef4444`) are used sparingly. Radii `xs`, `sm`, `md`, `lg`; `--container-page: 1240px`. The type scale runs `text-2xs` (11 px) to `text-6xl` (76 px) with paired line heights. Fonts are Geist Variable and Geist Mono Variable from `@fontsource-variable/*`, imported in `global.css`.

## Theming

- Dark-first: `:root` holds the dark values and `html.light` overrides the neutrals. The inline script in `src/layouts/Base.astro` sets the class before paint from localStorage `theme` (`'light'` or `'dark'`), falling back to `prefers-color-scheme`; `ThemeToggle.svelte` writes the same key.
- Tailwind's `dark:` variant isn't wired to that class, so a `dark:` utility follows the OS, not the toggle. Theme differences belong in tokens. Dark and light are peers (brief 3.10): check both.
- Light and dark product screenshots go through `ThemedImage.astro` (a work entry's `heroImage` and `heroImageDark`).

## Rules that change a verdict

- **One accent** (`#5b67ff`), for action, status, or emphasis, never decoration; everything else is the grayscale ramp (brief 3.3).
- **Borders, not shadows** (3.6): 1 px hairlines define structure, and elevation is a lighter surface. `WindowCard.astro`'s `shadow-[0_0_0_1px_...]` is a 1 px ring, not a drop shadow.
- **Typography builds hierarchy** through weight, size, and tracking, not colour (3.2). Mono (`font-mono`) for technical content: code, IDs, timestamps, paths, labels (3.8).
- **Motion is purposeful**: 40 to 200 ms, no scroll-triggered fade-ins or parallax (3.4). The theme cross-fade and smooth scrolling in `global.css` sit inside `prefers-reduced-motion: no-preference`; new motion follows that pattern.
- **Real product screenshots**, never abstract illustrations or gradients (3.5). `Screenshot.astro` and `ScreenshotPending.astro` are the primitives.
- **Empty, error, and loading states are designed** (3.7).
- **Off-system:** raw palette classes (`text-gray-500`, `bg-blue-600`) and raw hex in markup.

## Layout and primitives

- Content regions use `max-w-page` with auto margins; styles are mobile-first (`sm:`, `md:`, `lg:`), with no horizontal scroll from 320 px to 1920 px and touch targets of at least 44 px (`min-h-11 min-w-11`).
- Shared building blocks in `src/components/`: `Section.astro` (section heading at `text-3xl sm:text-4xl`), `WindowCard.astro`, `Screenshot.astro`, `ThemedImage.astro`, `StatusIndicator.astro`, `Marquee.astro`, `DemoFrame.astro`, `EmbeddedPage.astro`, `WorkCard.astro`. A new card, frame, or section that forks one of these is a finding.
- Focus: `*:focus-visible` in `global.css` draws a 2 px accent outline with a 2 px offset; never remove it without a replacement.

## Pages to render

For a token or shared-component change, render `/` and `/work/`, plus one case study (`/work/telus-tc-tools/`) and one article from `src/content/insights/`, in both themes at phone and desktop widths.
