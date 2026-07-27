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
import { defineConfig } from 'astro/config';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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

// https://astro.build/config
export default defineConfig({
	site: 'https://rogadigital.com',
	integrations: [
		mdx(),
		sitemap({
			// A per-URL freshness hint. Without it the sitemap is a bare list of
			// <loc> elements and Google has nothing to prioritise crawling on.
			serialize(item) {
				const lastmod = LASTMODS.get(new URL(item.url).pathname);
				return lastmod ? { ...item, lastmod } : item;
			},
		}),
		svelte(),
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
