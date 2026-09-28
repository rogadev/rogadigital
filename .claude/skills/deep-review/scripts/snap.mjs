#!/usr/bin/env node
// Renders pages from a running local dev server so the UX lanes can look at them.
// For each URL, width, and theme it saves a screenshot and records facts a reviewer
// cannot get from source: HTTP status, console errors, horizontal overflow, small
// tap targets, images without alt, and axe-core violations when axe is installed.
//
// Usage (run from the repo root):
//   node snap.mjs --base http://localhost:4321 --urls /a/,/b/ --out <dir>
//     [--resolve-from <dir>] [--widths 390,768,1440] [--themes light,dark]
//     [--cookie name=value]... [--max-height 2400] [--timeout 30000]
//
// Playwright and axe-core resolve from --resolve-from (a scratch folder where the
// orchestrator installed them) first, then from the repo.
//
// Writes <dir>/<slug>-<width>-<theme>.png, <dir>/summary.json, <dir>/summary.md.
// Exits 0 even when pages fail; failures are data for the reviewers.

import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = parseArgs(process.argv.slice(2));
const base = (args.base || '').replace(/\/$/, '');
const urls = (args.urls || '').split(',').map((u) => u.trim()).filter(Boolean);
const out = resolve(args.out || 'renders');
const widths = (args.widths || '390,768,1440').split(',').map(Number);
const themes = (args.themes || 'light,dark').split(',');
const maxHeight = Number(args['max-height'] || 2400);
const timeout = Number(args.timeout || 30000);

if (!base || !urls.length) {
	process.stderr.write('snap: need --base and --urls\n');
	process.exit(2);
}
// Git Bash rewrites a bare "/a" argument into "C:/Program Files/Git/a" unless MSYS_NO_PATHCONV=1.
const mangled = urls.filter((u) => !u.startsWith('/'));
if (mangled.length) {
	process.stderr.write(`snap: URLs must start with "/"; got ${mangled.join(', ')}. In Git Bash, prefix the command with MSYS_NO_PATHCONV=1.\n`);
	process.exit(2);
}
mkdirSync(out, { recursive: true });

const roots = [args['resolve-from'] && resolve(args['resolve-from']), process.cwd()].filter(Boolean);
let req;
let chromium;
outer: for (const dir of roots) {
	const r = createRequire(join(dir, 'package.json'));
	for (const mod of ['playwright', 'playwright-core', '@playwright/test']) {
		try {
			chromium = r(mod).chromium;
			req = r;
			break outer;
		} catch {
			// not installed under this name here; try the next one
		}
	}
}
if (!chromium) {
	writeFileSync(join(out, 'summary.md'), '# Renders\n\nNot rendered: Playwright is not installed (repo or --resolve-from).\n');
	process.exit(0);
}
const axeSource = loadAxe();

const results = [];
let browser;
try {
	browser = await chromium.launch();
} catch (e) {
	const why = String(e.message || e).split('\n')[0].slice(0, 200);
	writeFileSync(join(out, 'summary.md'), `# Renders\n\nNot rendered: Chromium failed to launch (${why}). Run "npx playwright install chromium" in the --resolve-from folder.\n`);
	process.exit(0);
}
try {
	for (const theme of themes) {
		const context = await browser.newContext({ colorScheme: theme === 'dark' ? 'dark' : 'light', reducedMotion: 'reduce' });
		if (args.cookie) {
			const cookies = [].concat(args.cookie).map((c) => {
				const i = c.indexOf('=');
				return { name: c.slice(0, i), value: c.slice(i + 1), url: base };
			});
			await context.addCookies(cookies);
		}
		// The no-FOUC script in src/layouts/Base.astro reads localStorage "theme" before paint.
		await context.addInitScript((mode) => {
			try {
				localStorage.setItem('theme', mode);
			} catch {
				// storage blocked on this origin; the default theme renders
			}
		}, theme);

		for (const width of widths) {
			const page = await context.newPage();
			await page.setViewportSize({ width, height: 900 });
			for (const url of urls) results.push(await capture(page, url, width, theme));
			await page.close();
		}
		await context.close();
	}
} finally {
	await browser.close();
}

writeFileSync(join(out, 'summary.json'), JSON.stringify(results, null, '\t'));
writeFileSync(join(out, 'summary.md'), summarize(results));
process.stdout.write(summarize(results));

async function capture(page, url, width, theme) {
	const console = [];
	const onConsole = (m) => m.type() === 'error' && console.length < 5 && console.push(m.text().slice(0, 200));
	const onError = (e) => console.length < 5 && console.push(`pageerror: ${String(e.message).slice(0, 200)}`);
	page.on('console', onConsole);
	page.on('pageerror', onError);
	const rec = { url, width, theme, status: null, file: null, console, overflowX: false, offenders: [], smallTargets: 0, under44: 0, imgNoAlt: 0, axe: null, error: null };
	try {
		// Third-party widgets (Turnstile, embeds) keep the network busy, so networkidle is best-effort.
		const res = await page.goto(base + url, { waitUntil: 'load', timeout });
		await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
		rec.status = res ? res.status() : null;
		await page.waitForTimeout(400);
		Object.assign(rec, await page.evaluate(measure, width));
		if (axeSource) rec.axe = await runAxe(page);
		const slug = url.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root';
		rec.file = join(out, `${slug}-${width}-${theme}.png`);
		const height = await page.evaluate(() => document.documentElement.scrollHeight);
		await page.screenshot({ path: rec.file, clip: { x: 0, y: 0, width, height: Math.min(height, maxHeight) } });
	} catch (e) {
		rec.error = String(e.message || e).split('\n')[0].slice(0, 200);
	}
	page.off('console', onConsole);
	page.off('pageerror', onError);
	return rec;
}

// Runs in the page.
function measure(width) {
	const doc = document.documentElement;
	const offenders = [];
	for (const el of document.body.querySelectorAll('*')) {
		const r = el.getBoundingClientRect();
		if (r.width && r.right > width + 1 && offenders.length < 5) {
			const cls = typeof el.className === 'string' ? el.className.split(' ').slice(0, 3).join('.') : '';
			offenders.push(`${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} (right edge ${Math.round(r.right)}px)`);
		}
	}
	let smallTargets = 0;
	let under44 = 0;
	for (const el of document.querySelectorAll('a[href], button, [role="button"], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])')) {
		const r = el.getBoundingClientRect();
		if (!r.width || !r.height) continue;
		if (r.width < 24 || r.height < 24) smallTargets++;
		if (r.width < 44 || r.height < 44) under44++;
	}
	const imgNoAlt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length;
	return { overflowX: doc.scrollWidth > doc.clientWidth + 1, offenders, smallTargets, under44, imgNoAlt };
}

async function runAxe(page) {
	try {
		await page.addScriptTag({ content: axeSource });
		return await page.evaluate(async () => {
			const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
			return r.violations.map((v) => ({ id: v.id, impact: v.impact, count: v.nodes.length, sample: v.nodes[0]?.target?.join(' ') }));
		});
	} catch (e) {
		return [{ id: 'axe-error', impact: null, count: 0, sample: String(e.message).slice(0, 120) }];
	}
}

function loadAxe() {
	const tries = [() => req.resolve('axe-core/axe.min.js'), () => createRequire(req.resolve('@axe-core/playwright')).resolve('axe-core/axe.min.js')];
	for (const t of tries) {
		try {
			const p = t();
			if (existsSync(p)) return readFileSync(p, 'utf8');
		} catch {
			// not resolvable this way; try the next location
		}
	}
	return null;
}

function summarize(list) {
	const lines = ['# Renders', '', `Base: ${base} | Widths: ${widths.join(', ')} | Themes: ${themes.join(', ')} | axe: ${axeSource ? 'yes' : 'not installed'}`, ''];
	lines.push('| URL | Width | Theme | Status | Overflow | Targets <24px | Targets <44px | Img no alt | axe | Console | Screenshot |');
	lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
	for (const r of list) {
		const axe = r.axe ? (r.axe.length ? r.axe.map((v) => `${v.id}(${v.count})`).join(' ') : 'clean') : '-';
		lines.push(`| ${r.url} | ${r.width} | ${r.theme} | ${r.error ? 'ERROR' : r.status} | ${r.overflowX ? 'YES' : 'no'} | ${r.smallTargets} | ${r.under44} | ${r.imgNoAlt} | ${axe} | ${r.console.length} | ${r.file || '-'} |`);
	}
	const detail = list.filter((r) => r.error || r.console.length || r.offenders.length);
	if (detail.length) {
		lines.push('', '## Details');
		for (const r of detail) {
			lines.push(`- ${r.url} @${r.width} ${r.theme}:${r.error ? ` error: ${r.error};` : ''}${r.offenders.length ? ` overflowing: ${r.offenders.join(', ')};` : ''}${r.console.length ? ` console: ${r.console.join(' | ')}` : ''}`);
		}
	}
	return lines.join('\n') + '\n';
}

function parseArgs(argv) {
	const o = {};
	for (let i = 0; i < argv.length; i++) {
		if (!argv[i].startsWith('--')) continue;
		const k = argv[i].slice(2);
		const v = argv[i + 1];
		i++;
		if (k in o) o[k] = [].concat(o[k], v);
		else o[k] = v;
	}
	return o;
}
