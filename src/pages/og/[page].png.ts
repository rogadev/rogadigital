import type { APIRoute, GetStaticPaths } from 'astro';
import { generateOgImage } from '../../lib/og';

interface OgConfig {
	eyebrow: string;
	title: string;
	footnote: string;
}

const pages: Record<string, OgConfig> = {
	about: {
		eyebrow: 'About',
		title: 'A studio for the software businesses run on.',
		footnote: 'Vancouver Island, BC, Canada',
	},
	contact: {
		eyebrow: 'Contact',
		title: "Let's talk about your project.",
		footnote: 'Free 30-min call · Reply ≤ 48h',
	},
	services: {
		eyebrow: 'Services',
		title: 'What we work on, in detail.',
		footnote: 'Product · Architecture · Code · AI · Ops',
	},
	resume: {
		eyebrow: 'Resume',
		title: 'Ryan Roga — full-stack developer, systems architect, AI consultant.',
		footnote: 'Founder · Roga Digital',
	},
	work: {
		eyebrow: 'Selected work',
		title: "Software that's still running.",
		footnote: 'Real projects · Real outcomes',
	},
	insights: {
		eyebrow: 'Insights',
		title: 'Notes from the work.',
		footnote: 'Studio updates · tooling · AI takes',
	},
	media: {
		eyebrow: 'Media',
		title: 'Working on a story?',
		footnote: 'Interviews · background · fact-checks',
	},
};

export const getStaticPaths: GetStaticPaths = () =>
	Object.entries(pages).map(([page, config]) => ({
		params: { page },
		props: { config },
	}));

interface Props {
	config: OgConfig;
}

export const GET: APIRoute<Props> = async ({ props }) => {
	const png = await generateOgImage(props.config);
	return new Response(png, {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=31536000, immutable',
		},
	});
};
