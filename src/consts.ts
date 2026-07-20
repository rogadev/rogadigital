/**
 * Site-wide constants. Imported by layouts and head components.
 */

export const SITE_TITLE = 'Roga Digital · Software Studio';
export const SITE_TAGLINE = 'Built, shipped, and still on call.';
export const SITE_DESCRIPTION =
	'Roga Digital is a software studio building internal tools, dashboards, integrations, and AI features for businesses. Full-stack web development, systems architecture, product management, and AI consulting from Ryan Roga.';
export const SITE_AUTHOR = 'Ryan Roga';
export const SITE_LOCATION = 'Vancouver Island, BC, Canada';

export const BOOKING_URL = 'https://cal.com/ryanroga';

export const SOCIAL = {
	github: 'https://github.com/rogadev',
	linkedin: 'https://linkedin.com/in/ryanroga',
} as const;

/**
 * Industries / sectors with at least one shipped project of real scope.
 * Each entry must be backed by a delivered engagement, not a one-off favor.
 */
/**
 * Products listed in the /support form dropdown. `slug` doubles as the
 * accepted value for the `?product=` query param on /support.
 */
export const SUPPORT_PRODUCTS = [
	{ slug: 'copycleanse', label: 'CopyCleanse' },
	{ slug: 'ezeval', label: 'EzEval' },
	{ slug: 'outlooks', label: 'Employment and Education Outlooks' },
	{ slug: 'carevo', label: 'Carevo Lot Logistics' },
	{ slug: 'dispatch', label: 'Roga Dispatch' },
	{ slug: 'other', label: 'Other / general' },
] as const;

export const INDUSTRIES = [
	'Telecom',
	'Healthcare',
	'Education',
	'Horticulture',
	'Logistics',
	'Transportation',
	'Trades',
] as const;
