import { SUPPORT_PRODUCTS } from '../../src/consts.js';

interface CommonFields {
	name: string;
	email: string;
	message: string;
	/** Honeypot field — must be empty for real users. */
	website: string;
	/** Turnstile response token. */
	token: string;
}

export interface SupportSubmission extends CommonFields {
	product: string;
}

export type ContactSubmission = CommonFields;

export interface MediaSubmission extends CommonFields {
	outlet: string;
	/** Optional free-text deadline — empty string when not provided. */
	deadline: string;
}

export type ValidationResult = { ok: true; data: SupportSubmission } | { ok: false; error: string };

export type ContactValidationResult =
	{ ok: true; data: ContactSubmission } | { ok: false; error: string };

export type MediaValidationResult =
	{ ok: true; data: MediaSubmission } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRODUCT_SLUGS = new Set<string>(SUPPORT_PRODUCTS.map((p) => p.slug));

function asTrimmedString(value: unknown): string | null {
	return typeof value === 'string' ? value.trim() : null;
}

function validateCommonFields(
	body: unknown,
): { ok: true; data: CommonFields } | { ok: false; error: string } {
	if (typeof body !== 'object' || body === null) {
		return { ok: false, error: 'Invalid request body.' };
	}
	const record = body as Record<string, unknown>;

	const name = asTrimmedString(record.name);
	if (!name || name.length > 200) return { ok: false, error: 'Please provide your name.' };

	const email = asTrimmedString(record.email);
	if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
		return { ok: false, error: 'Please provide a valid email address.' };
	}

	const message = asTrimmedString(record.message);
	if (!message || message.length > 5000) {
		return { ok: false, error: 'Please include a message (up to 5000 characters).' };
	}

	const token = asTrimmedString(record.token);
	if (!token) return { ok: false, error: 'Verification incomplete — please try again.' };

	const website = typeof record.website === 'string' ? record.website : '';

	return { ok: true, data: { name, email, message, website, token } };
}

export function validateSubmission(body: unknown): ValidationResult {
	const common = validateCommonFields(body);
	if (!common.ok) return common;

	const record = body as Record<string, unknown>;
	const product = asTrimmedString(record.product);
	if (!product || !PRODUCT_SLUGS.has(product)) {
		return { ok: false, error: 'Please choose a product.' };
	}

	return { ok: true, data: { ...common.data, product } };
}

export function validateContactSubmission(body: unknown): ContactValidationResult {
	return validateCommonFields(body);
}

export function validateMediaSubmission(body: unknown): MediaValidationResult {
	const common = validateCommonFields(body);
	if (!common.ok) return common;

	const record = body as Record<string, unknown>;
	const outlet = asTrimmedString(record.outlet);
	if (!outlet || outlet.length > 200) {
		return { ok: false, error: 'Please provide your outlet or organization.' };
	}

	const deadline = asTrimmedString(record.deadline) ?? '';
	if (deadline.length > 200) {
		return { ok: false, error: 'Please keep the deadline under 200 characters.' };
	}

	return { ok: true, data: { ...common.data, outlet, deadline } };
}

export function buildEmail(
	data: SupportSubmission,
	submittedAt: string,
): { subject: string; text: string } {
	const label = SUPPORT_PRODUCTS.find((p) => p.slug === data.product)?.label ?? data.product;
	return {
		subject: `[Support] ${label}: ${data.name}`,
		text: [
			`New support request via roga.dev/support`,
			``,
			`Name: ${data.name}`,
			`Email: ${data.email}`,
			`Product: ${label} (${data.product})`,
			`Submitted: ${submittedAt}`,
			``,
			`Message:`,
			data.message,
		].join('\n'),
	};
}

export function buildContactEmail(
	data: ContactSubmission,
	submittedAt: string,
): { subject: string; text: string } {
	return {
		subject: `[Contact] ${data.name}`,
		text: [
			`New inquiry via roga.dev/contact`,
			``,
			`Name: ${data.name}`,
			`Email: ${data.email}`,
			`Submitted: ${submittedAt}`,
			``,
			`Message:`,
			data.message,
		].join('\n'),
	};
}

export function buildMediaEmail(
	data: MediaSubmission,
	submittedAt: string,
): { subject: string; text: string } {
	return {
		subject: `[Media] ${data.outlet}: ${data.name}`,
		text: [
			`New media inquiry via roga.dev/media`,
			``,
			`Name: ${data.name}`,
			`Email: ${data.email}`,
			`Outlet: ${data.outlet}`,
			`Deadline: ${data.deadline || 'Not specified'}`,
			`Submitted: ${submittedAt}`,
			``,
			`Message:`,
			data.message,
		].join('\n'),
	};
}
