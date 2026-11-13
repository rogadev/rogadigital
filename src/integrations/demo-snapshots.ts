/**
 * demo-snapshots — build-time fallback snapshots for embedded demo sites.
 *
 * For every page in src/lib/demos.ts this integration captures a self-contained
 * HTML snapshot into public/demos/: scripts and event handlers are stripped
 * (the demo pages are fully server-rendered), stylesheets are inlined,
 * same-origin assets (fonts, images) become data: URIs, and remaining
 * root-relative URLs are absolutized against the live origin. The result renders our own origin with zero requests
 * to the live site, so DemoFrame.astro can serve it when the live site is down.
 * A themed page (one that accepts ?theme=) gets a light and a dark snapshot,
 * listed by snapshotCaptures() in src/lib/demos.ts.
 *
 * Snapshots and public/demos/manifest.json are committed to git — that is the
 * "past snapshot" store. A snapshot younger than MAX_AGE_DAYS is left alone;
 * older ones are re-captured at build (and on dev-server start, non-blocking).
 * A failed capture never fails the build: the existing snapshot is kept.
 */
import type { AstroIntegration, AstroIntegrationLogger } from 'astro';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_SITES, rendersDark, snapshotCaptures } from '../lib/demos';
import {
	dataUriMimeType,
	sanitizeSnapshotHtml,
	stripActiveContent,
} from '../lib/snapshot-sanitize';

const MAX_AGE_DAYS = 7;
const FETCH_TIMEOUT_MS = 15_000;
/** Assets larger than this stay as absolute URLs instead of data: URIs. */
const MAX_INLINE_BYTES = 2 * 1024 * 1024;

const OUT_DIR = fileURLToPath(new URL('../../public/demos/', import.meta.url));
const MANIFEST_FILE = join(OUT_DIR, 'manifest.json');

type Manifest = Record<string, { url: string; capturedAt: string }>;

export default function demoSnapshots(): AstroIntegration {
	return {
		name: 'demo-snapshots',
		hooks: {
			'astro:build:start': async ({ logger }) => {
				await refreshSnapshots(logger);
			},
			// In dev, refresh in the background so the fallback works locally too.
			'astro:server:start': ({ logger }) => {
				void refreshSnapshots(logger).catch(() => {});
			},
		},
	};
}

async function refreshSnapshots(logger: AstroIntegrationLogger): Promise<void> {
	mkdirSync(OUT_DIR, { recursive: true });
	const manifest = readManifest();
	let dirty = false;

	for (const site of DEMO_SITES) {
		for (const { id, url, theme } of snapshotCaptures(site)) {
			const file = join(OUT_DIR, `${id}.html`);
			const entry = manifest[id];
			const ageMs = entry ? Date.now() - Date.parse(entry.capturedAt) : Infinity;

			if (entry && existsSync(file) && ageMs < MAX_AGE_DAYS * 86_400_000) {
				logger.info(`${id}: snapshot fresh (${Math.round(ageMs / 86_400_000)}d old), skipping`);
				continue;
			}

			try {
				// oxlint-disable-next-line no-await-in-loop -- capture pages one at a time to keep load on the live site gentle
				const html = await archivePage(url, site.origin);
				// A live site that predates ?theme= serves its light page; saving
				// that as the dark snapshot would show light inside a dark site.
				if (theme === 'dark' && !rendersDark(html)) {
					throw new Error('the live page ignored ?theme=dark');
				}
				writeFileSync(file, html);
				manifest[id] = { url, capturedAt: new Date().toISOString() };
				dirty = true;
				logger.info(`${id}: captured (${Math.round(html.length / 1024)} KB)`);
			} catch (err) {
				const reason = err instanceof Error ? err.message : String(err);
				const kept = existsSync(file) ? 'keeping existing snapshot' : 'no snapshot available';
				logger.warn(`${id}: capture failed (${reason}) — ${kept}`);
			}
		}
	}

	if (dirty) writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, '\t') + '\n');
}

function readManifest(): Manifest {
	try {
		return JSON.parse(readFileSync(MANIFEST_FILE, 'utf8')) as Manifest;
	} catch {
		return {};
	}
}

async function fetchOk(url: string, redirect: RequestRedirect = 'follow'): Promise<Response> {
	const res = await fetch(url, {
		redirect,
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		headers: { 'user-agent': 'rogadigital.com demo-snapshots (+https://rogadigital.com)' },
	});
	if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
	return res;
}

/** Fetch a same-origin asset and return it as a data: URI, or null to fall back. */
async function assetDataUri(url: string): Promise<string | null> {
	try {
		const res = await fetchOk(url, 'error');
		const buf = Buffer.from(await res.arrayBuffer());
		if (buf.byteLength > MAX_INLINE_BYTES) return null;
		const type = dataUriMimeType(res.headers.get('content-type'));
		return `data:${type};base64,${buf.toString('base64')}`;
	} catch {
		return null;
	}
}

async function replaceAsync(
	input: string,
	pattern: RegExp,
	replacer: (match: RegExpExecArray) => Promise<string>,
): Promise<string> {
	const parts: string[] = [];
	let last = 0;
	for (const match of input.matchAll(pattern)) {
		// oxlint-disable-next-line no-await-in-loop -- replacements must land in document order
		parts.push(input.slice(last, match.index), await replacer(match));
		last = match.index + match[0].length;
	}
	parts.push(input.slice(last));
	return parts.join('');
}

/** Inline same-origin url(...) references inside a stylesheet. */
async function inlineCssAssets(css: string, cssUrl: string, origin: string): Promise<string> {
	return replaceAsync(css, /url\(\s*(['"]?)([^'")]+)\1\s*\)/g, async (match) => {
		const raw = match[2];
		if (raw.startsWith('data:')) return match[0];
		const resolved = new URL(raw, cssUrl);
		if (resolved.origin !== origin) return match[0];
		const dataUri = await assetDataUri(resolved.href);
		return `url(${dataUri ?? resolved.href})`;
	});
}

async function archivePage(url: string, origin: string): Promise<string> {
	// A demo route that redirects (for example to a login page) is not the
	// sample-data page we mean to publish, so the capture fails instead.
	const res = await fetchOk(url, 'error');
	let html = await res.text();

	// The demo pages are fully server-rendered; the snapshot is static on purpose.
	// Stripping here keeps preloads and script assets from being fetched below.
	html = stripActiveContent(html);

	// Inline stylesheets (and the fonts/images they reference).
	html = await replaceAsync(html, /<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi, async (match) => {
		const href = /\bhref=["']([^"']+)["']/.exec(match[0])?.[1];
		if (!href) return '';
		const cssUrl = new URL(href, url).href;
		try {
			const css = await inlineCssAssets(
				await (await fetchOk(cssUrl, 'error')).text(),
				cssUrl,
				origin,
			);
			return `<style>${css}</style>`;
		} catch {
			return match[0].replace(href, cssUrl);
		}
	});

	// Responsive srcset variants would multiply the inlined weight; the plain
	// src fallback below is enough for a frozen snapshot.
	html = html.replace(/\s(?:srcset|imagesrcset)=["'][^"']*["']/gi, '');

	// Inline same-origin images/media; leave third-party URLs untouched.
	html = await replaceAsync(html, /(\s(?:src|poster)=["'])([^"']+)(["'])/gi, async (match) => {
		const raw = match[2];
		if (raw.startsWith('data:')) return match[0];
		const resolved = new URL(raw, url);
		if (resolved.origin !== origin) return match[0];
		const dataUri = await assetDataUri(resolved.href);
		return `${match[1]}${dataUri ?? resolved.href}${match[3]}`;
	});

	// Whatever still points at the live origin gets an absolute URL, so links
	// and leftovers resolve once the site is back rather than 404ing on ours.
	html = html.replace(/(\s(?:href|action)=["'])\/(?!\/)/gi, `$1${origin}/`);

	// Strip again now that stylesheets are inlined, then add the CSP: belt and
	// braces with the iframe sandbox in DemoFrame.astro.
	html = sanitizeSnapshotHtml(html);

	return html.replace(
		/(<!doctype[^>]*>)/i,
		`$1\n<!-- Snapshot of ${url} captured ${new Date().toISOString()} — fallback for when the live site is unreachable. -->`,
	);
}
