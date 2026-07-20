/**
 * Open Graph image generator — Satori + Sharp pipeline.
 *
 * Endpoints under `src/pages/og/*` import `generateOgImage` and return a PNG.
 * Build-time only — output is static. No runtime cost.
 *
 * Layout: 1200×630 (the canonical OG size). Dark studio palette.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import sharp from 'sharp';

// Resolve fonts from node_modules at build time. Satori requires raw font data.
const sansRegularPath = fileURLToPath(
	import.meta.resolve('@fontsource/geist-sans/files/geist-sans-latin-400-normal.woff'),
);
const sansMediumPath = fileURLToPath(
	import.meta.resolve('@fontsource/geist-sans/files/geist-sans-latin-500-normal.woff'),
);
const monoRegularPath = fileURLToPath(
	import.meta.resolve('@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff'),
);

let cachedFonts: Awaited<ReturnType<typeof loadFonts>> | null = null;

async function loadFonts() {
	const [sansRegular, sansMedium, monoRegular] = await Promise.all([
		readFile(sansRegularPath),
		readFile(sansMediumPath),
		readFile(monoRegularPath),
	]);
	return [
		{ name: 'Geist', data: sansRegular, weight: 400 as const, style: 'normal' as const },
		{ name: 'Geist', data: sansMedium, weight: 500 as const, style: 'normal' as const },
		{ name: 'Geist Mono', data: monoRegular, weight: 400 as const, style: 'normal' as const },
	];
}

interface OgInput {
	/** Big headline (post title, case study client/headline, or page name). */
	title: string;
	/** Small mono uppercase label above the title. */
	eyebrow?: string;
	/** Small mono uppercase label below the title (e.g. ID + industry, tags). */
	footnote?: string;
}

const TOKENS = {
	bg: '#0a0a0b',
	fg: '#f5f5f6',
	fgMuted: '#a1a1a8',
	fgSubtle: '#6c6c75',
	border: '#1f1f23',
	accent: '#5b67ff',
};

/**
 * Build the vnode tree directly. Satori is strict about parent layout —
 * every parent with >1 child must have `display: flex`. Constructing
 * children as arrays (no template literals, no conditional whitespace)
 * avoids stray text nodes that Satori counts as children.
 */
function buildTree({ title, eyebrow, footnote }: OgInput) {
	const titleSize = title.length > 80 ? 56 : title.length > 50 ? 64 : 76;

	const middleChildren: unknown[] = [];
	if (eyebrow) {
		middleChildren.push({
			type: 'div',
			props: {
				style: {
					fontFamily: 'Geist Mono',
					fontSize: 18,
					letterSpacing: '0.18em',
					textTransform: 'uppercase',
					color: TOKENS.accent,
				},
				children: eyebrow,
			},
		});
	}
	middleChildren.push({
		type: 'div',
		props: {
			style: {
				fontSize: titleSize,
				fontWeight: 500,
				lineHeight: 1.1,
				letterSpacing: '-0.02em',
				color: TOKENS.fg,
				maxWidth: 1000,
				display: 'flex',
			},
			children: title,
		},
	});

	return {
		type: 'div',
		props: {
			style: {
				width: 1200,
				height: 630,
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				padding: '64px 72px',
				backgroundColor: TOKENS.bg,
				backgroundImage: `linear-gradient(to right, ${TOKENS.border} 1px, transparent 1px), linear-gradient(to bottom, ${TOKENS.border} 1px, transparent 1px)`,
				backgroundSize: '60px 60px',
				fontFamily: 'Geist',
				color: TOKENS.fg,
			},
			children: [
				// Top — studio mark
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							alignItems: 'center',
							gap: 12,
							fontFamily: 'Geist Mono',
							fontSize: 18,
							letterSpacing: '0.18em',
							textTransform: 'uppercase',
							color: TOKENS.fgMuted,
						},
						children: [
							{
								type: 'div',
								props: {
									style: {
										width: 12,
										height: 12,
										borderRadius: 3,
										backgroundColor: TOKENS.fg,
									},
								},
							},
							'Roga Digital',
						],
					},
				},
				// Middle — eyebrow + title
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							flexDirection: 'column',
							gap: 24,
						},
						children: middleChildren,
					},
				},
				// Bottom — footnote + url
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'flex-end',
							fontFamily: 'Geist Mono',
							fontSize: 18,
							letterSpacing: '0.16em',
							textTransform: 'uppercase',
						},
						children: [
							{
								type: 'div',
								props: {
									style: { color: TOKENS.fgSubtle, display: 'flex' },
									children: footnote ?? 'Software, end-to-end.',
								},
							},
							{
								type: 'div',
								props: {
									style: { color: TOKENS.fgMuted, display: 'flex' },
									children: 'rogadigital.com',
								},
							},
						],
					},
				},
			],
		},
	};
}

export async function generateOgImage(input: OgInput): Promise<ArrayBuffer> {
	if (!cachedFonts) cachedFonts = await loadFonts();

	const tree = buildTree(input);

	// Satori accepts vnode-shaped objects directly. Cast for the typing.
	const svg = await satori(tree as Parameters<typeof satori>[0], {
		width: 1200,
		height: 630,
		fonts: cachedFonts,
	});

	const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
	// Return an exact-size ArrayBuffer so the fetch Response BodyInit type is satisfied.
	// (TS 5.7+ made Uint8Array generic over ArrayBufferLike, which no longer fits BodyInit.)
	return new Uint8Array(pngBuffer).buffer;
}
