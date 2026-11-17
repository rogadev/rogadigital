/**
 * Pure HTML transforms that make a captured demo page safe to serve from our
 * own origin. src/integrations/demo-snapshots.ts runs them after every
 * stylesheet and asset is inlined, so inlined content gets the same cleanup.
 */

/** Forbids scripts, forms, and nested frames wherever a snapshot is opened. */
export const SNAPSHOT_CSP =
	"default-src 'none'; img-src data: https:; style-src 'unsafe-inline' https:; font-src data: https:; form-action 'none'; base-uri 'none'";

const SCRIPT = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;
// An attribute can follow whitespace, a slash, or a closing quote (`alt=""onerror=`).
// The whitespace goes with the handler; a slash or quote is kept.
const EVENT_HANDLER = /(?:\s+|([/"']))on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const PRELOAD_LINK = /<link\b[^>]*\brel=["'](?:modulepreload|preload)["'][^>]*>/gi;

/**
 * Removes scripts, inline event handlers, and preload links.
 *
 * Repeats until nothing changes, because removing one construct can join the
 * text around it into another (`<scr<script></script>ipt>` becomes `<script>`).
 */
export function stripActiveContent(html: string): string {
	let previous: string;
	let current = html;
	do {
		previous = current;
		current = current.replace(SCRIPT, '').replace(EVENT_HANDLER, '$1').replace(PRELOAD_LINK, '');
	} while (current !== previous);
	return current;
}

const HEAD_TAG = /<head\b[^>]*>/i;

/**
 * Adds the snapshot CSP as the first child of `<head>`.
 *
 * @throws {Error} If the page has no `<head>` tag, so the capture fails and
 *     the previous snapshot is kept instead of one served without its CSP.
 */
export function injectSnapshotCsp(html: string): string {
	if (!HEAD_TAG.test(html)) throw new Error('page has no <head> to carry the snapshot CSP');
	return html.replace(
		HEAD_TAG,
		(head) => `${head}\n<meta http-equiv="Content-Security-Policy" content="${SNAPSHOT_CSP}">`,
	);
}

/** Strips active content, then adds the snapshot CSP. */
export function sanitizeSnapshotHtml(html: string): string {
	return injectSnapshotCsp(stripActiveContent(html));
}

const MIME_TYPE = /^[a-z]+\/[a-z0-9][a-z0-9.+-]*$/;

/**
 * Returns a `type/subtype` safe to put in a `data:` URI, or
 * `application/octet-stream` for a missing or malformed `Content-Type`.
 */
export function dataUriMimeType(contentType: string | null): string {
	const type = contentType?.split(';')[0].trim().toLowerCase() ?? '';
	return MIME_TYPE.test(type) ? type : 'application/octet-stream';
}
