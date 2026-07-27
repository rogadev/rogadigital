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

// https://astro.build/config
export default defineConfig({
	site: 'https://rogadigital.com',
	integrations: [mdx(), sitemap(), svelte()],

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
