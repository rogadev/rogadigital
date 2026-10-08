/**
 * Refreshes src/data/paceline-scenes.json from the paceline repo at a pinned
 * ref. Resolves the ref to a full commit sha, fetches docs/demo/scenes.json at
 * that sha, validates it, and writes it with a `source` key recording where it
 * came from.
 *
 * Usage: pnpm sync:paceline [ref]
 *   ref   Tag, branch, or sha to pin. Defaults to DEFAULT_REF.
 *   GITHUB_TOKEN (optional) is sent as a Bearer token to raise API rate limits.
 *
 * The site build never fetches this. The JSON is committed so Vercel builds
 * do not depend on GitHub.
 */

import { writeFileSync } from 'node:fs';

const DEFAULT_REF = 'v1.6.0';
const REPO = 'rogadev/paceline';
const SOURCE_PATH = 'docs/demo/scenes.json';
const SUPPORTED_VERSION = 1;
const OUT_FILE = new URL('../src/data/paceline-scenes.json', import.meta.url);

/** Print an error and exit non-zero. Nothing has been written at any call site. */
function fail(message) {
	console.error(`sync-paceline: ${message}`);
	process.exit(1);
}

/** Fetch a URL and return the response, failing loudly on a network or HTTP error. */
async function get(url, headers = {}) {
	let res;
	try {
		res = await fetch(url, { headers });
	} catch (err) {
		return fail(`request to ${url} failed: ${err instanceof Error ? err.message : err}`);
	}
	if (!res.ok) {
		return fail(`${url} returned HTTP ${res.status} ${res.statusText}`);
	}
	return res;
}

/** Resolve a tag, branch, or sha to a full 40-character commit sha. */
async function resolveCommit(ref) {
	const headers = {
		Accept: 'application/vnd.github.sha',
		'User-Agent': 'ryanroga.com-sync-paceline',
	};
	if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
	const res = await get(
		`https://api.github.com/repos/${REPO}/commits/${encodeURIComponent(ref)}`,
		headers,
	);
	const sha = (await res.text()).trim();
	if (!/^[0-9a-f]{40}$/.test(sha)) fail(`expected a 40-character sha for "${ref}", got "${sha}"`);
	return sha;
}

/** Throw-free validation: returns an error string, or null when the data is usable. */
function validate(data) {
	if (data === null || typeof data !== 'object' || Array.isArray(data)) {
		return 'scenes.json is not a JSON object';
	}
	if (data.version !== SUPPORTED_VERSION) {
		return `scenes.json version is ${JSON.stringify(data.version)}, expected ${SUPPORTED_VERSION}. A schema change needs the demo component updated before syncing.`;
	}
	if (!Array.isArray(data.scenes) || data.scenes.length === 0) {
		return '"scenes" must be a non-empty array';
	}
	for (const [s, scene] of data.scenes.entries()) {
		for (const [t, step] of (scene?.steps ?? []).entries()) {
			for (const [l, line] of (step?.statusLines ?? []).entries()) {
				const where = `scene ${s}, step ${t}, status line ${l}`;
				if (typeof line?.plain !== 'string' || !Array.isArray(line?.runs)) {
					return `${where}: expected "plain" (string) and "runs" (array)`;
				}
				const joined = line.runs.map((run) => run.text).join('');
				if (joined !== line.plain) {
					return `${where}: runs concatenate to ${JSON.stringify(joined)} but plain is ${JSON.stringify(line.plain)}`;
				}
			}
		}
	}
	return null;
}

const ref = process.argv[2] ?? DEFAULT_REF;
const commit = await resolveCommit(ref);

const raw = await (
	await get(`https://raw.githubusercontent.com/${REPO}/${commit}/${SOURCE_PATH}`)
).text();

let data;
try {
	data = JSON.parse(raw);
} catch (err) {
	fail(`${SOURCE_PATH} at ${commit} is not valid JSON: ${err.message}`);
}

const problem = validate(data);
if (problem) fail(`${SOURCE_PATH} at ${commit}: ${problem}`);

const output = { source: { repo: REPO, ref, commit, path: SOURCE_PATH }, ...data };
writeFileSync(OUT_FILE, JSON.stringify(output, null, '\t') + '\n');

console.log(`Synced ${REPO}@${ref} (${commit.slice(0, 7)}): ${data.scenes.length} scenes`);
