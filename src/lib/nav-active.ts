function normalize(value: string): string {
	return value.endsWith('/') ? value : `${value}/`;
}

/**
 * Decide whether a nav item's href matches the current path, either
 * exactly or as a section ancestor (for example `/tools/` matching
 * `/tools/orc-pack/`).
 *
 * Both `pathname` and `href` are normalized to a single trailing slash
 * before comparing, so callers don't need to worry about whether either
 * value already ends in `/`. The root path (`/`) only ever matches itself
 * — it must never be treated as an ancestor of every other route.
 *
 * Shared by `Header.astro` (desktop nav) and `MobileNav.svelte` (mobile
 * nav) so the "current section" rule can't drift between the two.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
	const path = normalize(pathname);
	const target = normalize(href);

	if (target === '/') return path === '/';

	return path === target || path.startsWith(target);
}
