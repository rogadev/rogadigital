/**
 * Pick the right OG endpoint for a route. Endpoints emit static PNGs at
 * build time:
 *   /og/default.png                   — home + any unmatched route
 *   /og/[page].png                    — keys of STATIC_PAGE_OGS (og-pages.ts)
 *   /og/services.png                  — /services and every /services/<slug> page
 *   /og/work/[slug].png               — individual case study
 *   /og/insights/[slug].png           — individual insights post
 *
 * Extracted from `BaseHead.astro` so it's importable from vitest without
 * pulling in an Astro component.
 */

import { STATIC_PAGE_OGS } from './og-pages';

export function deriveOgPath(pathname: string): string {
	const trimmed = pathname.replace(/\/$/, '');

	const insightsMatch = trimmed.match(/^\/insights\/(.+)$/);
	if (insightsMatch) return `/og/insights/${insightsMatch[1]}.png`;

	const workMatch = trimmed.match(/^\/work\/(.+)$/);
	if (workMatch) return `/og/work/${workMatch[1]}.png`;

	// Service pages share the services card rather than falling back to the home card.
	if (/^\/services\/.+$/.test(trimmed)) return '/og/services.png';

	const segment = trimmed.replace(/^\//, '');
	if (STATIC_PAGE_OGS.has(segment)) return `/og/${segment}.png`;

	return '/og/default.png';
}
