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
}

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
			},
			{
				id: 'dispatch-driver',
				path: '/preview/driver',
				publicPath: '/demo',
				label: 'trips.roga.dev/driver',
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

/** Public URL of the captured fallback snapshot for a demo page. */
export function snapshotPath(page: DemoPage): string {
	return `/demos/${page.id}.html`;
}
