/**
 * Registry of external demo sites we embed on rogadigital.com.
 *
 * Each entry is a project with public `/demo/*` routes that serve the real UI
 * with simulated data and permissive `frame-ancestors`, so we can iframe them.
 * The demo-snapshots integration (src/integrations/demo-snapshots.ts) captures
 * a self-contained HTML snapshot of every page listed here into public/demos/,
 * and DemoFrame.astro falls back to that snapshot when the live site is down.
 */

export interface DemoPage {
	/** Stable id — also the snapshot filename (public/demos/<id>.html). */
	id: string;
	/** Path of the embeddable demo route on the live site. */
	path: string;
	/** Path of the real public page the demo mirrors. */
	publicPath: string;
	/** URL shown in the browser-chrome bar of the frame (the "real" address). */
	label: string;
	/**
	 * The route renders in the theme `?theme=light|dark` asks for, so the frame
	 * follows the site theme and a dark snapshot is captured beside the light one.
	 */
	themed?: boolean;
}

/** The site's two color themes, as a themed demo route accepts them. */
export type DemoTheme = 'light' | 'dark';

export interface DemoSite {
	id: string;
	name: string;
	origin: string;
	pages: DemoPage[];
}

export const DEMO_SITES: DemoSite[] = [
	{
		id: 'dispatch',
		name: 'Roga Dispatch',
		origin: 'https://trips.roga.dev',
		pages: [
			{
				id: 'dispatch-board',
				path: '/preview/board',
				publicPath: '/demo',
				label: 'trips.roga.dev/dispatch',
				themed: true,
			},
			{
				id: 'dispatch-driver',
				path: '/preview/driver',
				publicPath: '/demo',
				label: 'trips.roga.dev/driver',
				themed: true,
			},
		],
	},
	{
		id: 'puntledge',
		name: 'Puntledge Tube Report',
		origin: 'https://puntledge.ca',
		pages: [
			{ id: 'puntledge-home', path: '/demo/home', publicPath: '/', label: 'puntledge.ca' },
			{ id: 'puntledge-map', path: '/demo/map', publicPath: '/map', label: 'puntledge.ca/map' },
			{
				id: 'puntledge-report',
				path: '/demo/report',
				publicPath: '/report',
				label: 'puntledge.ca/report',
			},
		],
	},
];

export function demoSite(siteId: string): DemoSite {
	const site = DEMO_SITES.find((s) => s.id === siteId);
	if (!site) throw new Error(`Unknown demo site: ${siteId}`);
	return site;
}

export function demoPage(site: DemoSite, pageId: string): DemoPage {
	const page = site.pages.find((p) => p.id === pageId);
	if (!page) throw new Error(`Unknown demo page: ${pageId} on ${site.id}`);
	return page;
}

export function demoUrl(site: DemoSite, page: DemoPage): string {
	return site.origin + page.path;
}

/** URL of the real public page the demo mirrors. */
export function publicUrl(site: DemoSite, page: DemoPage): string {
	return site.origin + page.publicPath;
}

/** Returns `url` asking a themed demo route to render in `theme`. */
export function themedUrl(url: string, theme: DemoTheme): string {
	const themed = new URL(url);
	themed.searchParams.set('theme', theme);
	return themed.href;
}

/**
 * Id of the snapshot for `page` in `theme`, which is also its filename stem.
 * A themed page's dark snapshot gets a `-dark` suffix; every other snapshot,
 * including any page's light one, uses the page id.
 */
export function snapshotId(page: DemoPage, theme: DemoTheme = 'light'): string {
	return page.themed && theme === 'dark' ? `${page.id}-dark` : page.id;
}

/** Public URL of the captured fallback snapshot for a demo page. */
export function snapshotPath(page: DemoPage, theme: DemoTheme = 'light'): string {
	return `/demos/${snapshotId(page, theme)}.html`;
}

/** One page the demo-snapshots integration captures. */
export interface SnapshotCapture {
	/** Snapshot id: the manifest key and the filename stem in public/demos/. */
	id: string;
	/** Live URL to capture. */
	url: string;
	/** The theme the capture must render in, for a themed page. */
	theme?: DemoTheme;
}

/** Every snapshot to capture for `site`: one per page, two for a themed page. */
export function snapshotCaptures(site: DemoSite): SnapshotCapture[] {
	return site.pages.flatMap((page) => {
		const url = demoUrl(site, page);
		if (!page.themed) return [{ id: page.id, url }];
		return (['light', 'dark'] as const).map((theme) => ({
			id: snapshotId(page, theme),
			url: themedUrl(url, theme),
			theme,
		}));
	});
}

/**
 * Returns `true` when a rendered page's root `<html>` carries the `dark`
 * class, which is how a themed demo route renders `?theme=dark`.
 */
export function rendersDark(html: string): boolean {
	const root = /<html\b[^>]*>/i.exec(html)?.[0] ?? '';
	return /\sclass=["'][^"']*\bdark\b/i.test(root);
}
