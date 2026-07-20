/**
 * Data for the /labs/apps page. Hand-edited; intentionally a plain typed module
 * (not a content collection) to match the src/consts.ts and src/data/benchmarks.ts
 * idiom. Add a new app by appending to LAB_APPS — the page renders them in order.
 */

export interface LabApp {
	/** Product name as shown on the card. */
	name: string;
	/** Canonical, fully-qualified URL. The visible domain is derived from this. */
	url: string;
	/** One plain-language line on what it does. */
	description: string;
	/** Short category label, e.g. "Utility", "SaaS". Optional. */
	tag?: string;
}

/**
 * Personal apps and tools, distinct from client engagements on /work. Most are
 * free browser utilities; a couple are full products. Ordered newest-interest
 * first — reorder freely, the page follows array order.
 */
export const LAB_APPS: LabApp[] = [
	{
		name: 'CopyCleanse',
		url: 'https://copycleanse.com',
		description:
			'Strips zero-width characters, smart quotes, em dashes, and tracking junk out of AI-generated text. Browser-only, no sign-up, nothing stored.',
		tag: 'Utility',
	},
	{
		name: 'EzEval',
		url: 'https://ezeval.app',
		description:
			'Tap-to-quote field tool for window-cleaning crews — capture itemized on-site evaluations at a flat monthly price.',
		tag: 'SaaS',
	},
	{
		name: 'Roga Dispatch',
		url: 'https://trips.roga.dev',
		description:
			'Dispatch and billing platform for medical and assisted-transport companies — coordinate drivers, auto-generate recurring trips, and invoice by payor.',
		tag: 'SaaS',
	},
	{
		name: 'Plants',
		url: 'https://plants.roga.dev',
		description:
			'Lab-management platform for plant tissue culture — track explants, manage protocols, and aggregate production costs.',
		tag: 'Platform',
	},
	{
		name: 'E&EO',
		url: 'https://eaeo.ca',
		description:
			'Career-investigation tool built on official Canadian labour-market data — search NOC occupations and read 3-year regional employment outlooks.',
		tag: 'Tool',
	},
	{
		name: 'Image Converter',
		url: 'https://converter.roga.dev',
		description: 'Drop in an image, pick a format, and convert it right in the browser.',
		tag: 'Utility',
	},
	{
		name: 'Password Generator',
		url: 'https://passwords.roga.dev',
		description: 'Generates strong passwords entirely on-device — they never touch a network.',
		tag: 'Utility',
	},
];
