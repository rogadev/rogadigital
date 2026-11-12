// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import {
	transformerNotationDiff,
	transformerNotationFocus,
	transformerNotationHighlight,
	transformerMetaHighlight,
} from '@shikijs/transformers';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import demoSnapshots from './src/integrations/demo-snapshots';

/**
 * Canonical URL path -> ISO timestamp, read from insight frontmatter.
 *
 * Only pages with a real authored date get a `lastmod`. Stamping the build
 * time on every URL would tell Google the entire site changes on every deploy,
 * which trains it to distrust the signal entirely — worse than sending none.
 * Static pages and case studies carry no date in their frontmatter, so they
 * are deliberately left without one.
 */
function insightLastmods() {
	const dir = 'src/content/insights';
	const map = new Map();

	for (const file of readdirSync(dir)) {
		if (!/\.mdx?$/.test(file)) continue;

		const frontmatter = readFileSync(join(dir, file), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
		if (!frontmatter) continue;

		/** @param {string} key */
		const read = (key) =>
			frontmatter[1].match(new RegExp(`^${key}:\\s*['"]?(\\d{4}-\\d{2}-\\d{2})`, 'm'))?.[1];

		const date = read('updatedDate') ?? read('pubDate');
		if (!date) continue;

		map.set(`/insights/${file.replace(/\.mdx?$/, '')}/`, new Date(date).toISOString());
	}

	return map;
}

const LASTMODS = insightLastmods();

// Unicode ranges of Fontsource's latin and latin-ext subsets.
const LATIN =
	'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT =
	'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

/**
 * A variable Geist family served from the Fontsource package files.
 *
 * Astro preloads these and generates a metric-matched fallback face, so text
 * keeps its line breaks when the web font replaces the system font on load.
 *
 * @param {string} name The `font-family` name.
 * @param {string} cssVariable The CSS variable the family is exposed on.
 * @param {string} file The Fontsource file prefix, such as `geist/files/geist`.
 * @param {string[]} fallbacks Fallback families; the last generic one is metric-matched.
 */
function geistFamily(name, cssVariable, file, fallbacks) {
	const variant = (/** @type {string} */ subset, /** @type {string} */ range) => ({
		src: /** @type {[string]} */ ([`@fontsource-variable/${file}-${subset}-wght-normal.woff2`]),
		weight: '100 900',
		style: /** @type {const} */ ('normal'),
		unicodeRange: /** @type {[string]} */ ([range]),
	});
	return {
		provider: fontProviders.local(),
		name,
		cssVariable,
		fallbacks,
		options: {
			variants: /** @type {[ReturnType<typeof variant>, ReturnType<typeof variant>]} */ ([
				variant('latin', LATIN),
				variant('latin-ext', LATIN_EXT),
			]),
		},
	};
}

// https://astro.build/config
export default defineConfig({
	site: 'https://rogadigital.com',
	fonts: [
		geistFamily('Geist Variable', '--font-geist', 'geist/files/geist', [
			'ui-sans-serif',
			'system-ui',
			'sans-serif',
		]),
		geistFamily('Geist Mono Variable', '--font-geist-mono', 'geist-mono/files/geist-mono', [
			'ui-monospace',
			'SFMono-Regular',
			'Menlo',
			'monospace',
		]),
	],
	integrations: [
		mdx(),
		sitemap({
			// The /labs pages are noindex, so listing them makes Search Console
			// report "Submitted URL marked noindex" for each one.
			filter: (page) => !new URL(page).pathname.startsWith('/labs/'),
			// A per-URL freshness hint. Without it the sitemap is a bare list of
			// <loc> elements and Google has nothing to prioritise crawling on.
			serialize(item) {
				const lastmod = LASTMODS.get(new URL(item.url).pathname);
				return lastmod ? { ...item, lastmod } : item;
			},
		}),
		svelte(),
		demoSnapshots(),
	],

	// Canonical URLs carry a trailing slash (the sitemap and <link rel="canonical">
	// both emit one). Vercel enforces this at the edge via "trailingSlash": true in
	// vercel.json; this keeps the dev server consistent with production.
	trailingSlash: 'always',

	redirects: {
		'/blog': '/insights/',
		'/blog/[...slug]': '/insights/[...slug]',
	},

	markdown: {
		shikiConfig: {
			// Dual themes — defaultColor: false emits CSS variables for both,
			// so we swap based on the html.light class (see global.css).
			themes: {
				dark: 'github-dark-default',
				light: 'github-light',
			},
			defaultColor: false,
			wrap: true,
			transformers: [
				transformerNotationHighlight(),
				transformerNotationFocus(),
				transformerNotationDiff(),
				transformerMetaHighlight(),
			],
		},
	},

	vite: {
		plugins: /** @type {any} */ (tailwindcss()),
	},
});
