/**
 * Single source of truth for page-level Open Graph card copy.
 *
 * `src/pages/og/[page].png.ts` (renders the PNGs) and `src/lib/og-path.ts`
 * (used by BaseHead.astro to pick which PNG a page links to) both read from
 * this module, so the two can never drift out of sync — that drift is what
 * let `/og/default.png` ship pre-pivot copy for months after the hero
 * changed (see issue #193).
 *
 * Pure data only: no satori/sharp imports, so this stays importable from
 * vitest without pulling in the render pipeline.
 */

import { SITE_LOCATION } from '../consts';

export interface OgPageConfig {
	/** Big headline. Should say the same thing as the page's h1 + dek, not necessarily match verbatim. */
	title: string;
	/** Small mono uppercase label above the title. */
	eyebrow?: string;
	/** Small mono uppercase label below the title. */
	footnote: string;
}

/**
 * Keyed by the URL segment (`/about/` -> `about`). Every key here gets its
 * own static PNG at `/og/<key>.png` via `src/pages/og/[page].png.ts`.
 */
export const OG_PAGES: Record<string, OgPageConfig> = {
	about: {
		eyebrow: 'About',
		title: 'We build the software your business runs on.',
		footnote: SITE_LOCATION,
	},
	contact: {
		eyebrow: 'Contact',
		title: "Let's talk about your project.",
		footnote: 'Free 30-min call · Reply ≤ 48h',
	},
	services: {
		eyebrow: 'Services',
		title: 'What we work on, in detail.',
		footnote: 'Product · Architecture · Code · AI · Ops',
	},
	resume: {
		eyebrow: 'Resume',
		title: 'Ryan Roga — Lead Full-Stack Product Developer · Roga Digital.',
		footnote: 'Founder · Roga Digital',
	},
	work: {
		eyebrow: 'Selected work',
		title: 'Selected work, in production.',
		footnote: 'Real projects · Real outcomes',
	},
	insights: {
		eyebrow: 'Insights',
		title: 'Professional notes, opinions, and forecasts.',
		footnote: 'Studio updates · tooling · AI takes',
	},
	media: {
		eyebrow: 'Media',
		title: 'Working on a story?',
		footnote: 'Interviews · background · fact-checks',
	},
	support: {
		eyebrow: 'Support',
		title: 'Need a hand with a product?',
		footnote: 'Reply within two business days',
	},
};

/**
 * Route segments that have their own OG card. Derived from `OG_PAGES` —
 * never hand-duplicate this list (that duplication is the regression this
 * module exists to prevent; see `tests/og-coverage.test.ts`).
 */
export const STATIC_PAGE_OGS: ReadonlySet<string> = new Set(Object.keys(OG_PAGES));

/**
 * The home page's card. Also the catch-all fallback for every route that
 * isn't a key in `OG_PAGES` and isn't a `/work/*` or `/insights/*` slug —
 * see `deriveOgPath` in `./og-path.ts` (covers `/privacy/`, `/terms-of-service/`,
 * `/labs*`, and `/404`). Framed to work as both: it states the studio's
 * offer rather than something specific to any one fallback route.
 */
export const DEFAULT_OG: OgPageConfig = {
	title: 'We build business websites & web applications.',
	footnote: `Software studio · ${SITE_LOCATION}`,
};
