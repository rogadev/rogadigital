/**
 * Data for the /tools page. Hand-edited; a plain typed module to match the
 * src/data/apps.ts idiom. Add a tool by appending to TOOLS; the index renders
 * each group in array order. Give a tool a page at `href` when it has one.
 */

import type { ImageMetadata } from 'astro';
import copyCleanseShot from '../assets/work/copycleanse/01-hero.png';
import blobbiesShot from '../assets/tools/blobbies.png';
import campcastShot from '../assets/tools/campcast.png';
import converterShot from '../assets/tools/converter.png';
import orcPackShot from '../assets/tools/orc-pack.png';
import pacelineShot from '../assets/tools/paceline.png';
import passwordsShot from '../assets/tools/passwords.png';

/**
 * `mod`: something that changes Claude Code (a mod, plugin, or skill pack).
 * `app`: a desktop productivity app that works on its own. `site`: a website
 * anyone can open.
 */
export type ToolKind = 'mod' | 'app' | 'site';

export interface Tool {
	/** Tool name as shown on the card and its page. */
	name: string;
	kind: ToolKind;
	/** Short category label, for example "Claude Code mod". */
	tag: string;
	/** One plain-language line on what it does. */
	description: string;
	/** Internal showcase page, when the tool has one. */
	href?: string;
	/** Source repository. Set only when the repository is public. */
	repo?: string;
	/** Live site, for tools that run as a hosted service. */
	liveUrl?: string;
	/** A real screenshot or the tool's own artwork. */
	image?: ImageMetadata;
	/** True while the tool is unreleased: no public repository or download yet. */
	unreleased?: boolean;
}

/**
 * Tools Ryan built for his own work. Distinct from /work, which lists client
 * and studio systems, and from /labs/apps, which is not indexed.
 */
export const TOOLS: Tool[] = [
	{
		name: 'orc-pack',
		kind: 'mod',
		tag: 'Claude Code skill pack',
		href: '/tools/orc-pack/',
		repo: 'https://github.com/rogadev/orc-pack',
		description:
			'An autonomous orchestrator for Claude Code. Hand it an issue or a sentence, and a team of specialist agents plans, builds, reviews, and commits the work.',
		image: orcPackShot,
	},
	{
		name: 'paceline',
		kind: 'mod',
		tag: 'Claude Code mod',
		href: '/tools/paceline/',
		repo: 'https://github.com/rogadev/paceline',
		description:
			'A Claude Code status line that turns your weekly usage limit into a daily budget, so you know whether to push or ease off, and tells your sessions apart at a glance.',
		image: pacelineShot,
	},
	{
		name: 'Claude Blobbies',
		kind: 'mod',
		tag: 'Claude Code mod',
		description:
			'Turns a pane into a lava lamp. A blob rises while Claude works and buds off a smaller one for every subagent, so you can see how much is running without reading the stream.',
		image: blobbiesShot,
		unreleased: true,
	},
	{
		name: 'glance',
		kind: 'mod',
		tag: 'Claude Code plugin',
		repo: 'https://github.com/rogadev/glance',
		description:
			'Tints your terminal pane while Claude Code works and resets it the moment Claude needs you, so you can tell from across the room which sessions are waiting.',
	},
	{
		name: 'stp',
		kind: 'app',
		tag: 'Windows · macOS · Linux',
		description:
			"Speech To Prompt. Push-to-talk dictation that works in any desktop app. It transcribes on your own computer and pastes the text where you're typing, as spoken or cleaned up.",
		unreleased: true,
	},
	{
		name: 'Launchpad',
		kind: 'app',
		tag: 'Windows',
		description:
			'A Windows tray app that opens Claude Code sessions for your projects from one grid of tiles, in place of a desktop full of shortcuts.',
		unreleased: true,
	},
	{
		name: 'CopyCleanse',
		kind: 'site',
		tag: 'Writing',
		href: '/tools/copy-cleanse/',
		liveUrl: 'https://copycleanse.com',
		description:
			'Cleans your AI-written copy. It strips the em dashes, curly quotes, invisible characters, and tracking links that give machine-written copy away.',
		image: copyCleanseShot,
	},
	{
		name: 'Campcast',
		kind: 'site',
		tag: 'Weather',
		liveUrl: 'https://camp.roga.dev',
		description:
			"Ranks camping areas on Vancouver Island and the Gulf Islands by next weekend's forecast, against your own thresholds for temperature, sun, rain, and wind.",
		image: campcastShot,
	},
	{
		name: 'Password Generator',
		kind: 'site',
		tag: 'Utility',
		liveUrl: 'https://passwords.roga.dev',
		repo: 'https://github.com/rogadev/passwords.roga.dev',
		description:
			'Generates strong passwords entirely on your device. They never touch a network, and it works offline.',
		image: passwordsShot,
	},
	{
		name: 'Image Converter',
		kind: 'site',
		tag: 'Utility',
		liveUrl: 'https://converter.roga.dev',
		repo: 'https://github.com/rogadev/converter.roga.dev',
		description:
			'Converts images between PNG, JPEG, WebP, and AVIF, and MP4 to GIF, in the browser. Your files never leave your device.',
		image: converterShot,
	},
];
