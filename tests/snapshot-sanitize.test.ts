import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	SNAPSHOT_CSP,
	dataUriMimeType,
	injectSnapshotCsp,
	sanitizeSnapshotHtml,
	stripActiveContent,
} from '../src/lib/snapshot-sanitize';

describe('stripActiveContent', () => {
	it('removes script elements, including ones with attributes', () => {
		expect(stripActiveContent('<p>a</p><script type="module">x()</script><p>b</p>')).toBe(
			'<p>a</p><p>b</p>',
		);
		expect(stripActiveContent('<SCRIPT>x()</SCRIPT >')).toBe('');
	});

	it('removes a script that only forms once an inner script is stripped', () => {
		const html = '<scr<script></script>ipt>alert(1)</scr<script></script>ipt>';
		expect(stripActiveContent(html)).not.toMatch(/<script/i);
	});

	it('removes a script that only forms once an event handler is stripped', () => {
		const html = '<scr onx="y"ipt>alert(1)</scr onx="y"ipt>';
		expect(stripActiveContent(html)).not.toMatch(/<script/i);
	});

	it('removes event handlers in every quoting style', () => {
		expect(stripActiveContent('<img src="a.png" onerror="x()">')).toBe('<img src="a.png">');
		expect(stripActiveContent("<img src='a.png' onerror='x()'>")).toBe("<img src='a.png'>");
		expect(stripActiveContent('<img src=a.png onerror=x()>')).toBe('<img src=a.png>');
	});

	it('removes event handlers after a slash or a closing quote', () => {
		expect(stripActiveContent('<svg/onload="x()">')).toBe('<svg/>');
		expect(stripActiveContent('<img alt=""onerror="x()">')).toBe('<img alt="">');
	});

	it('removes preload and modulepreload links but keeps stylesheets', () => {
		const html =
			'<link rel="modulepreload" href="/a.js"><link rel="preload" href="/b.css"><link rel="stylesheet" href="/c.css">';
		expect(stripActiveContent(html)).toBe('<link rel="stylesheet" href="/c.css">');
	});

	it('leaves ordinary attributes alone', () => {
		const html = '<a href="/x" class="online" data-one="1">Go</a>';
		expect(stripActiveContent(html)).toBe(html);
	});
});

describe('injectSnapshotCsp', () => {
	it('adds the CSP meta as the first child of head', () => {
		expect(injectSnapshotCsp('<html><head lang="en"><title>t</title></head></html>')).toBe(
			`<html><head lang="en">\n<meta http-equiv="Content-Security-Policy" content="${SNAPSHOT_CSP}"><title>t</title></head></html>`,
		);
	});

	it('throws when the page has no head, so the old snapshot is kept', () => {
		expect(() => injectSnapshotCsp('<html><body>no head</body></html>')).toThrow(/<head>/);
	});

	it('does not mistake a <header> element for the head', () => {
		expect(() => injectSnapshotCsp('<html><body><header>x</header></body></html>')).toThrow();
	});

	it('forbids scripts by default', () => {
		expect(SNAPSHOT_CSP).toContain("default-src 'none'");
		expect(SNAPSHOT_CSP).not.toMatch(/script-src/);
	});
});

describe('vercel.json /demos/ header', () => {
	it('serves snapshots with the snapshot CSP plus sandbox', () => {
		const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as {
			headers: { source: string; headers: { key: string; value: string }[] }[];
		};
		const demos = config.headers.find((h) => h.source === '/demos/(.*)');
		const csp = demos?.headers.find((h) => h.key === 'Content-Security-Policy')?.value;
		expect(csp).toBe(`sandbox; ${SNAPSHOT_CSP}`);
	});
});

describe('sanitizeSnapshotHtml', () => {
	it('strips a script inside inlined CSS and adds the CSP', () => {
		const html = '<head></head><style>a{}</style><script>x()</script><style>b{}</style>';
		const out = sanitizeSnapshotHtml(html);
		expect(out).not.toMatch(/<script/i);
		expect(out).toContain('Content-Security-Policy');
	});
});

describe('dataUriMimeType', () => {
	it('keeps a plain type and drops parameters', () => {
		expect(dataUriMimeType('image/png')).toBe('image/png');
		expect(dataUriMimeType('font/woff2; charset=binary')).toBe('font/woff2');
		expect(dataUriMimeType('Image/SVG+XML')).toBe('image/svg+xml');
	});

	it('falls back for a missing or malformed type', () => {
		expect(dataUriMimeType(null)).toBe('application/octet-stream');
		expect(dataUriMimeType('')).toBe('application/octet-stream');
		expect(dataUriMimeType('text/html,<script>x()</script>')).toBe('application/octet-stream');
		expect(dataUriMimeType('image/png"onload="x()')).toBe('application/octet-stream');
	});
});
