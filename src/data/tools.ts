/**
 * Data for the /tools page. Hand-edited; a plain typed module to match the
 * src/data/apps.ts idiom. Add a tool by appending to TOOLS and giving it a
 * page at `href`; the index renders them in array order.
 */

export interface Tool {
	/** Tool name as shown on the card and its page. */
	name: string;
	/** Internal showcase page for the tool. */
	href: string;
	/** Public source repository. */
	repo: string;
	/** Live site, for tools that run as a hosted service. The card shows it instead of the repo. */
	liveUrl?: string;
	/** One plain-language line on what it does. */
	description: string;
	/** Short category label, for example "Claude Code". */
	tag: string;
}

/**
 * Developer tooling Ryan built for his own work and published because others
 * can use it too. Distinct from /labs/apps, which lists end-user apps.
 */
export const TOOLS: Tool[] = [
	{
		name: 'orc-pack',
		href: '/tools/orc-pack/',
		repo: 'https://github.com/rogadev/orc-pack',
		description:
			'An autonomous orchestrator for Claude Code. Hand it an issue or a sentence, and a team of specialist agents plans, builds, reviews, and commits the work.',
		tag: 'Claude Code',
	},
	{
		name: 'paceline',
		href: '/tools/paceline/',
		repo: 'https://github.com/rogadev/paceline',
		description:
			'A Claude Code status line that turns your weekly usage limit into a daily budget, so you know whether to push or ease off, and tells your sessions apart at a glance.',
		tag: 'Claude Code',
	},
	{
		name: 'copy-cleanse',
		href: '/tools/copy-cleanse/',
		repo: 'https://github.com/rogadev/copy-cleanse',
		liveUrl: 'https://copycleanse.com',
		description:
			'Cleans your AI-written copy. It strips the em dashes, curly quotes, invisible characters, and tracking links that give machine-written copy away.',
		tag: 'Writing',
	},
];
