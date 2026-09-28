#!/usr/bin/env node
// Builds the review handoff for /deep-review: the diff, the changed-file list, a
// per-file surface classification, a size tier, suggested lanes, candidate URLs
// for UI and content files, and intent sources. Read-only against the repo; writes
// only to --out.
//
// Usage (run from the repo root):
//   node change-map.mjs --out <dir> [--base <ref> | --range <a..b> | --pr <n> | --working]
//
// Writes to <dir>: diff.patch, files.txt, stat.txt, change-map.json, change-map.md

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

const args = parseArgs(process.argv.slice(2));
let root, branch, target, files;

function main() {
	if (!args.out) die('missing --out <dir>');
	mkdirSync(args.out, { recursive: true });

	root = git(['rev-parse', '--show-toplevel']).trim();
	process.chdir(root);

	branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
	target = resolveTarget();
	const patch = target.patch;
	writeFileSync(join(args.out, 'diff.patch'), patch);

	files = parsePatch(patch);
	for (const f of files) classify(f);
	const counted = files.filter((f) => !f.ignoredForSize);
	const size = {
		files: files.length,
		countedFiles: counted.length,
		added: counted.reduce((n, f) => n + f.added, 0),
		removed: counted.reduce((n, f) => n + f.removed, 0),
		newFiles: files.filter((f) => f.status === 'added').length,
	};
	size.changed = size.added + size.removed;

	const surfaces = {};
	for (const f of files) for (const s of f.surfaces) (surfaces[s] ||= []).push(f.path);

	const blast = blastRadius(files);
	const tier = suggestTier(size, surfaces, blast);
	const lanes = suggestLanes(surfaces, files, tier);
	const urls = candidateUrls(files);
	const intent = gatherIntent();

	writeFileSync(join(args.out, 'files.txt'), files.map((f) => f.path).join('\n') + '\n');
	writeFileSync(join(args.out, 'stat.txt'), statText(files, size));

	const map = { branch, target: target.label, base: target.base, size, tier, surfaces, blast, lanes, urls, intent, files };
	writeFileSync(join(args.out, 'change-map.json'), JSON.stringify(map, null, '\t'));
	writeFileSync(join(args.out, 'change-map.md'), summaryMarkdown(map));
	process.stdout.write(summaryMarkdown(map));
}

function parseArgs(argv) {
	const out = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--working') out.working = true;
		else if (a.startsWith('--')) out[a.slice(2)] = argv[++i];
	}
	return out;
}

function die(msg) {
	process.stderr.write(`change-map: ${msg}\n`);
	process.exit(2);
}

function git(argv, opts = {}) {
	try {
		return execFileSync('git', argv, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
	} catch (e) {
		// `git diff --no-index` exits 1 when the files differ; that output is the point.
		if (e.status === 1 && typeof e.stdout === 'string') return e.stdout;
		if (opts.soft) return '';
		throw e;
	}
}

function refExists(ref) {
	return git(['rev-parse', '--verify', '--quiet', ref], { soft: true }).trim() !== '';
}

function untrackedPatch() {
	const list = git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean);
	let out = '';
	for (const f of list) {
		try {
			if (statSync(f).size > 2 * 1024 * 1024) continue;
		} catch {
			continue;
		}
		out += git(['diff', '--no-index', '--', '/dev/null', f], { soft: true });
	}
	return out;
}

function resolveTarget() {
	if (args.pr) {
		const n = String(args.pr).replace(/^#/, '');
		const patch = execFileSync('gh', ['pr', 'diff', n], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
		let base = 'PR base';
		try {
			base = JSON.parse(execFileSync('gh', ['pr', 'view', n, '--json', 'baseRefName'], { encoding: 'utf8' })).baseRefName;
		} catch {
			// gh pr view failed; keep the generic base label
		}
		return { label: `PR #${n}`, base, patch };
	}
	if (args.range) return { label: args.range, base: args.range.split('..')[0], patch: git(['diff', '-M', args.range]) };
	if (args.base) {
		const mb = git(['merge-base', 'HEAD', args.base], { soft: true }).trim() || args.base;
		return { label: `${branch} + working tree vs ${args.base}`, base: args.base, patch: git(['diff', '-M', mb]) + untrackedPatch() };
	}
	if (args.working) return { label: 'uncommitted changes', base: 'HEAD', patch: git(['diff', '-M', 'HEAD']) + untrackedPatch() };

	// Auto: review what this branch would bring to its integration branch.
	// Feature branches integrate into dev; dev ships to main.
	let baseRef;
	if (branch === 'main' || branch === 'master') baseRef = null;
	else if (branch === 'dev') baseRef = refExists('origin/main') ? 'origin/main' : 'main';
	else baseRef = ['origin/dev', 'dev', 'origin/main', 'main'].find(refExists);

	if (baseRef) {
		const mb = git(['merge-base', 'HEAD', baseRef], { soft: true }).trim();
		if (mb) {
			const patch = git(['diff', '-M', mb]) + untrackedPatch();
			if (patch.trim()) return { label: `${branch} (commits + working tree) vs ${baseRef}`, base: baseRef, patch };
		}
	}
	const working = git(['diff', '-M', 'HEAD']) + untrackedPatch();
	if (working.trim()) return { label: 'uncommitted changes', base: 'HEAD', patch: working };
	const note = baseRef ? `nothing new vs ${baseRef} and no uncommitted changes; reviewing the last commit` : 'last commit';
	return { label: note, base: 'HEAD~1', patch: git(['diff', '-M', 'HEAD~1']) };
}

function parsePatch(text) {
	const out = [];
	let cur = null;
	for (const line of text.split('\n')) {
		if (line.startsWith('diff --git ')) {
			const m = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
			cur = { path: m ? m[2] : line.slice(11), status: 'modified', added: 0, removed: 0, plus: [], minus: [], surfaces: [] };
			out.push(cur);
		} else if (!cur) continue;
		else if (line.startsWith('new file mode') || line.startsWith('--- /dev/null')) cur.status = 'added';
		else if (line.startsWith('deleted file mode') || line.startsWith('+++ /dev/null')) cur.status = 'deleted';
		else if (line.startsWith('rename from ')) cur.status = 'renamed';
		else if (line.startsWith('+++ b/')) cur.path = line.slice(6);
		else if (line.startsWith('+') && !line.startsWith('+++')) {
			cur.added++;
			if (cur.plus.length < 4000) cur.plus.push(line.slice(1));
		} else if (line.startsWith('-') && !line.startsWith('---')) {
			cur.removed++;
			if (cur.minus.length < 4000) cur.minus.push(line.slice(1));
		}
	}
	return out;
}

const RX = {
	lock: /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$/,
	generated: /^(public\/demos\/|dist\/|\.astro\/|\.vercel\/)|\.snap$/,
	content: /^src\/content\/.+\.(md|mdx)$/,
	docs: /\.(md|txt)$/i,
	test: /(\.(spec|test)\.[cm]?[jt]sx?$)|^tests?\//,
	markup: /\.(astro|svelte)$/,
	style: /\.(css|scss|pcss)$/,
	page: /^src\/pages\/.+\.(astro|md|mdx)$/,
	layout: /^src\/layouts\//,
	island: /\.svelte$/,
	buildEndpoint: /^src\/pages\/.+\.[cm]?[jt]s$/,
	serverEntry: /^api\/[^_/][^/]*\.[cm]?[jt]s$/,
	serverLib: /^api\/_lib\//,
	contentSchema: /^src\/content\.config\.ts$/,
	integration: /^src\/integrations\//,
	infra: /^(\.github\/workflows\/|\.github\/dependabot\.yml$|vercel\.json$|pnpm-workspace\.yaml$)/,
	config: /^(astro\.config\.[cm]?[jt]s|svelte\.config\.[cm]?js|tsconfig.*\.json|eslint\.config\.[cm]?js|\.oxlintrc\.json|\.prettierrc.*|\.prettierignore|\.fallowrc\.json|\.env\.example|vitest\.config\.[cm]?[jt]s)$/,
	tokens: /^src\/styles\/global\.css$/,
	sharedUi: /^src\/(components\/[^/]+\.(astro|svelte)|layouts\/[^/]+\.astro)$/,
	seo: /^(src\/components\/BaseHead\.astro|src\/lib\/(schema|og|og-pages|og-path)\.ts|src\/pages\/og\/|src\/pages\/rss\.xml\.[jt]s|public\/(robots\.txt|manifest\.json)|src\/consts\.ts)/,
	embed: /^public\/.+\.html$/,
	secretsPath: /(^|\/)(\.env|api\/_lib\/(turnstile|email)\.ts)/,
	sharedLogic: /^src\/(lib|data)\/|^src\/consts\.ts$/,
};

const HTML_SINK = /(set:html|\{@html|innerHTML|outerHTML|insertAdjacentHTML|srcdoc|document\.write)/;
const IFRAME = /<iframe\b|sandbox=|allow=/;
const INLINE_SCRIPT = /<script\b/;
const FETCH = /\bfetch\s*\(|axios|undici/;
const ENV = /process\.env|import\.meta\.env/;
const DIRECTIVE = /client:(load|idle|visible|only|media)/;
const REDIRECT = /redirects?\b|Location|window\.location|\bredirect\(/;
const HEAD_TAG = /<(title|meta|link)\b|og:|twitter:|canonical|noindex|ld\+json/;
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*|<!--|#(?!!)|\{\/\*)/;
const COPY_LINE = /(>\s*[A-Za-z][^<>{}]{3,}\s*<)|^\s*[A-Z][a-z]+(\s+[a-z',.]+){3,}|\b(label|title|placeholder|aria-label|alt|description|headline|outcome|message|heading|error)\s*[=:]\s*['"`][A-Za-z][^'"`]{3,}/;
const CLASS_ATTR = /\s(class|className|class:list)=("[^"]*"|'[^']*'|\{[^}]*\})|\sclass:[\w-]+(=\{[^}]*\})?/g;
const STATE_CONTENT = /\$(state|derived|effect|props|bindable)\b|onMount|onDestroy|addEventListener|localStorage|sessionStorage|matchMedia|IntersectionObserver|getCollection|getEntry|getStaticPaths|Astro\.(props|url|params)/;
const PERF_CONTENT = /(for\s*\(|\.map\(|\.filter\(|\.sort\(|while\s*\(|Promise\.all|setInterval|setTimeout|addEventListener|requestAnimationFrame|<img\b|<Image\b|<Picture\b|<video\b|loading=|fetchpriority|@import|@font-face|client:load)/;
const OPS_CONTENT = /(console\.|process\.env|import\.meta\.env|timeout|AbortSignal|retry)/;

function classify(f) {
	const p = f.path;
	const add = (s) => f.surfaces.includes(s) || f.surfaces.push(s);
	const plus = f.plus.join('\n');
	const both = plus + '\n' + f.minus.join('\n');

	if (RX.lock.test(p)) {
		add('deps');
		f.ignoredForSize = true;
		return;
	}
	if (RX.generated.test(p)) {
		add('generated');
		f.ignoredForSize = true;
		return;
	}
	if (/(^|\/)package\.json$/.test(p)) {
		if (/"(dependencies|devDependencies|peerDependencies)"|^\s*"[@\w/.-]+":\s*"[\^~]?\d/m.test(both)) add('deps');
		if (/"packageManager"|"engines"|"scripts"/.test(both)) add('infra');
	}
	if (RX.test.test(p)) {
		add('test');
		return;
	}
	if (RX.content.test(p)) {
		add('content');
		add('copy');
		if (/^\s*(title|description|pubDate|updatedDate|heroImage|draft|headline|outcome):/m.test(both)) add('seo');
		if (/^(import|export)\s|<[A-Z]\w*/m.test(plus)) add('mdx-components');
		if (HTML_SINK.test(plus) || IFRAME.test(plus) || INLINE_SCRIPT.test(plus)) add('html-sink');
		if (f.status === 'added') add('new-file');
		return;
	}
	if (RX.docs.test(p)) {
		add(/^docs\/superpowers\/specs\//.test(p) ? 'spec' : 'docs');
		return;
	}
	if (RX.infra.test(p)) add('infra');
	if (RX.config.test(p)) add('config');
	if (RX.contentSchema.test(p)) add('content-schema');
	if (RX.integration.test(p)) add('integration');
	if (RX.tokens.test(p)) add('design-tokens');
	if (RX.sharedUi.test(p)) add('shared-ui');
	if (RX.seo.test(p)) add('seo');
	if (RX.embed.test(p)) {
		add('embed');
		add('html-sink');
	}
	if (/^astro\.config\./.test(p) && /redirects|sitemap|site:|trailingSlash/.test(both)) add('seo');
	if (/^vercel\.json$/.test(p) && /redirects|trailingSlash|headers/.test(both)) add('seo');

	const isMarkup = RX.markup.test(p);
	if (isMarkup) {
		add('ui');
		if (RX.page.test(p)) add('page');
		if (RX.layout.test(p)) add('layout');
		if (RX.island.test(p)) add('island');
		if (isStyleOnly(f)) add('style-only');
		else if (isCopyOnly(f)) add('copy-only');
		if (f.plus.some((l) => COPY_LINE.test(l))) add('copy');
		if (STATE_CONTENT.test(both) || INLINE_SCRIPT.test(plus)) add('client-state');
		if (/<(form|input|select|textarea|button|dialog|details)\b|role=|aria-|tabindex|onkey|onclick|on:click/i.test(plus)) add('interactive');
		if (DIRECTIVE.test(both)) add('hydration');
		if (HEAD_TAG.test(both)) add('seo');
		if (INLINE_SCRIPT.test(plus)) add('script');
	}
	if (RX.style.test(p)) add('style');

	if (RX.serverEntry.test(p)) add('server-entry');
	if (RX.serverLib.test(p)) add('server-logic');
	if (RX.buildEndpoint.test(p)) add('build-endpoint');
	if (!isMarkup && RX.sharedLogic.test(p) && /\.[cm]?[jt]s$/.test(p)) add(isCopyOnly(f) ? 'copy-only' : 'shared-logic');
	if (f.surfaces.includes('copy-only')) add('copy');

	if (RX.secretsPath.test(p) || ENV.test(both)) add('secrets');
	if (HTML_SINK.test(plus) || IFRAME.test(plus)) add('html-sink');
	if (FETCH.test(plus)) add('outbound-fetch');
	if (REDIRECT.test(plus) && (/^(vercel\.json|astro\.config)/.test(p) || f.surfaces.includes('server-entry'))) add('redirect');
	if (PERF_CONTENT.test(plus)) add('perf-shaped');
	if (OPS_CONTENT.test(plus)) add('ops-shaped');
	if (f.plus.some((l) => COMMENT_LINE.test(l))) add('comments');
	if (f.status === 'added') add('new-file');
	if (f.status === 'renamed' || f.status === 'deleted') add('move-or-delete');
	if (!f.surfaces.length) add('other');
}

function isStyleOnly(f) {
	if (!f.plus.length && !f.minus.length) return false;
	const norm = (l) => l.replace(CLASS_ATTR, '').replace(/\s+/g, ' ').trim();
	const a = f.plus.map(norm).filter(Boolean).sort();
	const b = f.minus.map(norm).filter(Boolean).sort();
	return a.length === b.length && a.every((x, i) => x === b[i]);
}

// True when the change only edits text: tag text and string literals differ, structure does not.
function isCopyOnly(f) {
	if (!f.plus.length && !f.minus.length) return false;
	const norm = (l) =>
		l
			.replace(/>[^<>{}]*</g, '><')
			.replace(/(["'`])(?:(?!\1).)*\1/g, '""')
			.replace(/^[^<>{}=;()]*$/, '')
			.replace(/\s+/g, ' ')
			.trim();
	const a = f.plus.map(norm).filter(Boolean).sort();
	const b = f.minus.map(norm).filter(Boolean).sort();
	return a.length === b.length && a.every((x, i) => x === b[i]);
}

function blastRadius(list) {
	const out = [];
	for (const f of list) {
		const shared = f.surfaces.includes('shared-ui') || f.surfaces.includes('design-tokens') || (f.surfaces.includes('shared-logic') && f.status !== 'added');
		if (!shared) continue;
		if (f.surfaces.includes('design-tokens')) {
			out.push({ path: f.path, importers: 'global', note: 'design tokens apply to every page' });
			continue;
		}
		if (/^src\/layouts\/Base\.astro$|^src\/components\/(BaseHead|Header|Footer)\.astro$/.test(f.path)) {
			out.push({ path: f.path, importers: 'global', note: 'part of the shell every page renders' });
			continue;
		}
		const stem = basename(f.path).replace(/\.(astro|svelte|[cm]?[jt]s)$/, '');
		if (stem.length < 3) continue;
		const hits = git(['grep', '-l', '-F', stem, '--', 'src', 'api'], { soft: true }).split('\n').filter((x) => x && x !== f.path && !RX.test.test(x));
		out.push({ path: f.path, importers: hits.length, sample: hits.slice(0, 5) });
	}
	return out;
}

function suggestTier(sz, surf, br) {
	const has = (k) => Boolean(surf[k]);
	const code = Object.keys(surf).filter((k) => !['docs', 'spec', 'generated', 'deps', 'test'].includes(k));
	if (!code.length && !has('deps')) return { tier: 0, name: 'trivial', why: 'docs, specs, or tests only' };
	let t = sz.countedFiles <= 3 && sz.changed <= 60 ? 1 : sz.countedFiles <= 12 && sz.changed <= 400 ? 2 : 3;
	const why = [`${sz.countedFiles} files, ${sz.changed} changed lines`];
	const risky = ['server-entry', 'server-logic', 'infra', 'html-sink', 'secrets', 'embed', 'redirect', 'content-schema', 'integration'].filter(has);
	if (risky.length && t < 2) {
		t = 2;
		why.push(`risk surface: ${risky.join(', ')}`);
	}
	const wide = br.filter((b) => b.importers === 'global' || b.importers >= 8);
	if (wide.length && t < 2) {
		t = 2;
		why.push(`shared code with wide reach: ${wide.map((b) => basename(b.path)).join(', ')}`);
	}
	const newPages = (surf.page || []).filter((p) => files.find((f) => f.path === p && f.status === 'added')).length;
	if ((sz.newFiles >= 6 || newPages >= 2) && t < 3) {
		t = 3;
		why.push('new feature surface (several new files or pages)');
	}
	if (sz.countedFiles > 40 || sz.changed > 2500) {
		t = 4;
		why.push('very large change; shard the lanes');
	}
	return { tier: t, name: ['trivial', 'small', 'medium', 'large', 'very large'][t], why: why.join('; ') };
}

function suggestLanes(surf, list, tier) {
	const has = (k) => Boolean(surf[k]);
	const lanes = [];
	const push = (lane, strength, why) => lanes.push({ lane, strength, why });
	const uiFiles = surf.ui || [];
	const styleOnly = uiFiles.length > 0 && uiFiles.every((p) => (surf['style-only'] || []).includes(p)) && !has('server-entry') && !has('server-logic') && !has('content');
	const textOnly = uiFiles.every((p) => (surf['copy-only'] || []).includes(p)) && !has('shared-logic') && !has('server-entry') && !has('server-logic') && !has('style') && !has('design-tokens');
	const contentOnly = (has('content') || has('copy-only')) && (textOnly || Object.keys(surf).every((k) => ['content', 'copy', 'copy-only', 'seo', 'new-file', 'docs', 'spec', 'generated', 'comments'].includes(k)));

	if (tier.tier === 0) return [{ lane: 'none', strength: 'strong', why: 'no code changed; the orchestrator reads it directly' }];

	push('review-gate', 'strong', 'any code, config, or content change');
	const pkgDeps = has('deps') && list.some((f) => /package\.json$/.test(f.path));
	if (has('server-entry') || has('server-logic') || has('html-sink') || has('embed') || has('outbound-fetch') || has('secrets') || has('infra') || has('redirect') || has('script') || pkgDeps)
		push('review-security', 'strong', 'api functions, env, HTML sinks, iframes or embeds, scripts, redirects, CI, or dependencies');
	const visual = (has('ui') && !textOnly) || has('style') || has('design-tokens') || has('mdx-components');
	if (visual) push('review-ux-visual', 'strong', styleOnly ? 'style-only markup change' : 'UI or style change');
	if (visual)
		push('review-ux-a11y', has('interactive') || has('design-tokens') || has('island') || styleOnly ? 'strong' : 'medium', 'contrast, semantics, keyboard, and screen reader impact');
	if ((has('page') || has('interactive') || has('island') || has('layout')) && !styleOnly && !contentOnly) push('review-ux-flow', has('page') || has('interactive') ? 'strong' : 'medium', 'visitor journey, forms, states, and navigation');
	if (has('copy') || has('content')) push('review-ux-copy', 'strong', contentOnly ? 'content-only change' : 'user-facing text changed');
	if ((has('island') || has('client-state') || has('hydration') || has('content-schema') || has('integration') || has('build-endpoint') || (has('page') && !contentOnly)) && !styleOnly && !contentOnly)
		push('review-fe-framework', has('island') || has('client-state') || has('content-schema') ? 'strong' : 'medium', 'islands, directives, scripts, content collections, static build');
	if (has('server-entry') || has('server-logic') || (has('island') && list.some((f) => /InquiryForm\.svelte$/.test(f.path) && /fetch|endpoint|error|ok\b/.test(f.plus.join('\n')))))
		push('review-api', 'strong', 'Vercel functions or the form contract changed');
	if (has('seo') || (has('page') && list.some((f) => f.surfaces.includes('page') && (f.status === 'added' || f.status === 'renamed' || f.status === 'deleted')))) push('review-seo', 'strong', 'head, meta, OG, schema, sitemap, redirects, or pages added or moved');
	if ((has('island') || has('hydration') || has('design-tokens') || pkgDeps || has('embed') || has('integration')) && tier.tier >= 1) push('review-perf', has('hydration') || pkgDeps ? 'strong' : 'medium', 'client JS, dependencies, global CSS, embeds, or build-time work');
	else if (has('perf-shaped') && tier.tier >= 2) push('review-perf', 'medium', 'images, fonts, loops, or timers on a page');
	if (has('infra') || has('config') || has('deps') || has('integration') || (has('ops-shaped') && (has('server-logic') || has('server-entry')))) push('review-ops', has('infra') || has('deps') ? 'strong' : 'medium', 'Vercel, CI, pnpm config, deps, env, or integrations');
	if (!styleOnly && (has('server-logic') || has('server-entry') || has('shared-logic') || has('build-endpoint'))) push('review-tests', has('server-logic') || has('server-entry') ? 'strong' : 'medium', 'logic changed');
	else if (has('test')) push('review-tests', 'medium', 'tests changed');
	if (tier.tier >= 2 && !styleOnly && !contentOnly) push('review-quality', 'medium', 'readability, duplication, types, conventions');
	if ((has('new-file') && tier.tier >= 2 && !contentOnly) || has('move-or-delete') || tier.tier >= 3) push('review-architecture', tier.tier >= 3 ? 'strong' : 'medium', 'new modules, moves, or a large change');
	if (tier.tier >= 2) push('review-intent', 'medium', 'check the change against its issue, task, or spec');

	const seen = new Map();
	for (const l of lanes) {
		const prev = seen.get(l.lane);
		if (!prev || (prev.strength !== 'strong' && l.strength === 'strong')) seen.set(l.lane, l);
	}
	return [...seen.values()];
}

function candidateUrls(list) {
	const urls = new Set();
	const sample = (collection) => {
		try {
			const f = readdirSync(`src/content/${collection}`).find((x) => /\.mdx?$/.test(x));
			return f ? f.replace(/\.mdx?$/, '') : null;
		} catch {
			return null;
		}
	};
	const toUrl = (routePath) => {
		const seg = routePath.replace(/^src\/pages\//, '').replace(/\.(astro|md|mdx)$/, '').replace(/(^|\/)index$/, '');
		const m = seg.match(/^(insights|work)\/\[\.\.\.slug\]$/);
		if (m) {
			const s = sample(m[1]);
			return s ? `/${m[1]}/${s}/` : `DYNAMIC:/${seg}`;
		}
		if (/\[.*\]/.test(seg)) return `DYNAMIC:/${seg}`;
		if (seg === '404') return '/404/';
		return seg ? `/${seg}/` : '/';
	};

	for (const f of list) {
		if (f.status === 'deleted') continue;
		let m;
		if (RX.page.test(f.path)) urls.add(toUrl(f.path));
		else if ((m = f.path.match(/^src\/content\/(insights|work)\/(.+)\.mdx?$/))) urls.add(`/${m[1]}/${m[2]}/`);
	}
	for (const f of list.filter((x) => (x.surfaces.includes('ui') || x.surfaces.includes('style')) && !x.surfaces.includes('page') && x.status !== 'deleted')) {
		if (f.surfaces.includes('layout') && /Base\.astro$/.test(f.path)) {
			urls.add('/');
			continue;
		}
		if (/^src\/components\/(BaseHead|Header|Footer|ThemeToggle|MobileNav)\./.test(f.path)) {
			urls.add('/');
			continue;
		}
		if (/^src\/layouts\/CaseStudy\.astro$/.test(f.path)) {
			const s = sample('work');
			if (s) urls.add(`/work/${s}/`);
			continue;
		}
		if (/^src\/layouts\/Insights\.astro$/.test(f.path)) {
			const s = sample('insights');
			if (s) urls.add(`/insights/${s}/`);
			continue;
		}
		const stem = basename(f.path).replace(/\.(astro|svelte|css)$/, '');
		if (stem.length < 3 || stem === 'index' || stem === 'global') continue;
		const pages = git(['grep', '-l', '-F', stem, '--', 'src/pages'], { soft: true })
			.split('\n')
			.filter((p) => /\.(astro|mdx?)$/.test(p))
			.slice(0, 3);
		for (const p of pages) urls.add(toUrl(p));
	}
	if ((list.some((f) => f.surfaces.includes('design-tokens')))) ['/', '/work/'].forEach((u) => urls.add(u));
	return [...urls].slice(0, 8);
}

function gatherIntent() {
	const out = { branch, issueNumbers: [], commits: [], specsTouched: [], relatedSpecs: [] };
	const range = target.base && target.base !== 'HEAD' && target.base !== 'PR base' ? `${git(['merge-base', 'HEAD', target.base], { soft: true }).trim()}..HEAD` : null;
	if (range && !range.startsWith('..')) out.commits = git(['log', '--format=%s', range], { soft: true }).split('\n').filter(Boolean).slice(0, 40);
	const text = [branch, ...out.commits].join('\n');
	out.issueNumbers = [...new Set([...text.matchAll(/(?:#|\bissue[-_/]?|\bgh-)(\d{1,5})\b/gi)].map((m) => m[1]))].slice(0, 5);
	const specDirs = ['docs/superpowers/specs', 'docs/superpowers/plans'];
	out.specsTouched = files.filter((f) => specDirs.some((d) => f.path.startsWith(d + '/')) || /^docs\/(BRIEF|PLAN)\.md$/.test(f.path)).map((f) => f.path);
	const specs = specDirs.filter((d) => existsSync(d)).flatMap((d) => git(['ls-files', d], { soft: true }).split('\n').filter((p) => p.endsWith('.md')));
	const stop = new Set(['pages', 'components', 'layouts', 'index', 'tests', 'astro', 'svelte', 'content', 'insights', 'styles', 'global', 'config']);
	const words = new Set(
		files
			.flatMap((f) => f.path.split(/[/.[\]()+_-]/))
			.map((w) => w.toLowerCase())
			.filter((w) => w.length > 4 && !stop.has(w)),
	);
	out.relatedSpecs = specs.filter((s) => [...words].some((w) => basename(s).toLowerCase().includes(w))).slice(0, 6);
	return out;
}

function statText(list, sz) {
	const rows = list.map((f) => `${String(f.added).padStart(5)} +${String(f.removed).padStart(5)} -  ${f.status.padEnd(8)} ${f.path}`);
	return rows.join('\n') + `\n${sz.files} files (${sz.countedFiles} counted), +${sz.added} -${sz.removed}\n`;
}

function summaryMarkdown(m) {
	const lines = [];
	lines.push(`# Change map`);
	lines.push(`Branch: ${m.branch} | Target: ${m.target}`);
	lines.push(`Size: ${m.size.countedFiles} files counted (${m.size.files} total), +${m.size.added} -${m.size.removed}, ${m.size.newFiles} new`);
	lines.push(`Suggested tier: ${m.tier.tier} (${m.tier.name}) - ${m.tier.why}`);
	lines.push('');
	lines.push('## Surfaces');
	for (const [k, v] of Object.entries(m.surfaces).sort()) lines.push(`- ${k} (${v.length}): ${v.slice(0, 6).join(', ')}${v.length > 6 ? ` +${v.length - 6} more` : ''}`);
	if (m.blast.length) {
		lines.push('');
		lines.push('## Blast radius (shared code)');
		for (const b of m.blast) lines.push(`- ${b.path}: ${b.importers === 'global' ? b.note : `${b.importers} files reference it`}`);
	}
	lines.push('');
	lines.push('## Suggested lanes');
	for (const l of m.lanes) lines.push(`- ${l.lane} [${l.strength}] - ${l.why}`);
	if (m.urls.length) {
		lines.push('');
		lines.push(`## Candidate URLs: ${m.urls.join(', ')}`);
	}
	lines.push('');
	lines.push('## Intent sources');
	lines.push(`- Issues referenced: ${m.intent.issueNumbers.join(', ') || 'none'}`);
	lines.push(`- Specs touched: ${m.intent.specsTouched.join(', ') || 'none'}`);
	lines.push(`- Related specs: ${m.intent.relatedSpecs.join(', ') || 'none'}`);
	lines.push(`- Commits (${m.intent.commits.length}): ${m.intent.commits.slice(0, 8).join(' | ') || 'none'}`);
	return lines.join('\n') + '\n';
}

main();
