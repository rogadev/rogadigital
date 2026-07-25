import { describe, expect, it } from 'vitest';
import {
	buildContactEmail,
	buildEmail,
	buildMediaEmail,
	validateContactSubmission,
	validateMediaSubmission,
	validateSubmission,
} from '../api/_lib/validation';

const valid = {
	name: 'Jane Doe',
	email: 'jane@example.com',
	product: 'ezeval',
	message: 'The export button does nothing.',
	website: '',
	token: 'XXXX.turnstile-token',
};

describe('validateSubmission', () => {
	it('accepts a valid submission and trims fields', () => {
		const result = validateSubmission({ ...valid, name: '  Jane Doe  ' });
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data.name).toBe('Jane Doe');
	});

	it('rejects non-object bodies', () => {
		expect(validateSubmission(null).ok).toBe(false);
		expect(validateSubmission('hi').ok).toBe(false);
	});

	it('rejects missing or empty required fields', () => {
		for (const field of ['name', 'email', 'message', 'token'] as const) {
			expect(validateSubmission({ ...valid, [field]: '' }).ok).toBe(false);
			expect(validateSubmission({ ...valid, [field]: undefined }).ok).toBe(false);
		}
	});

	it('rejects malformed emails', () => {
		expect(validateSubmission({ ...valid, email: 'not-an-email' }).ok).toBe(false);
		expect(validateSubmission({ ...valid, email: 'a@b' }).ok).toBe(false);
	});

	it('rejects unknown product slugs', () => {
		expect(validateSubmission({ ...valid, product: 'nope' }).ok).toBe(false);
	});

	it('accepts every known product slug', () => {
		for (const slug of [
			'copycleanse',
			'ezeval',
			'outlooks',
			'carevo',
			'dispatch',
			'puntledge',
			'other',
		]) {
			expect(validateSubmission({ ...valid, product: slug }).ok).toBe(true);
		}
	});

	it('enforces max lengths', () => {
		expect(validateSubmission({ ...valid, name: 'x'.repeat(201) }).ok).toBe(false);
		expect(validateSubmission({ ...valid, email: `${'x'.repeat(250)}@a.com` }).ok).toBe(false);
		expect(validateSubmission({ ...valid, message: 'x'.repeat(5001) }).ok).toBe(false);
	});

	it('passes the honeypot value through untouched', () => {
		const result = validateSubmission({ ...valid, website: 'spam' });
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data.website).toBe('spam');
	});
});

describe('buildEmail', () => {
	it('builds subject with product label and sender name', () => {
		const result = validateSubmission(valid);
		if (!result.ok) throw new Error('expected valid');
		const { subject } = buildEmail(result.data, '2026-07-01T00:00:00.000Z');
		expect(subject).toBe('[Support] EzEval: Jane Doe');
	});

	it('includes all fields and the timestamp in the body', () => {
		const result = validateSubmission(valid);
		if (!result.ok) throw new Error('expected valid');
		const { text } = buildEmail(result.data, '2026-07-01T00:00:00.000Z');
		expect(text).toContain('Jane Doe');
		expect(text).toContain('jane@example.com');
		expect(text).toContain('ezeval');
		expect(text).toContain('The export button does nothing.');
		expect(text).toContain('2026-07-01T00:00:00.000Z');
	});
});

const validContact = {
	name: 'Jane Doe',
	email: 'jane@example.com',
	message: 'I have a project involving inventory dashboards.',
	website: '',
	token: 'XXXX.turnstile-token',
};

describe('validateContactSubmission', () => {
	it('accepts a valid submission without a product field', () => {
		expect(validateContactSubmission(validContact).ok).toBe(true);
	});

	it('rejects missing or empty required fields', () => {
		for (const field of ['name', 'email', 'message', 'token'] as const) {
			expect(validateContactSubmission({ ...validContact, [field]: '' }).ok).toBe(false);
			expect(validateContactSubmission({ ...validContact, [field]: undefined }).ok).toBe(false);
		}
	});

	it('rejects malformed emails and over-length fields', () => {
		expect(validateContactSubmission({ ...validContact, email: 'nope' }).ok).toBe(false);
		expect(validateContactSubmission({ ...validContact, name: 'x'.repeat(201) }).ok).toBe(false);
		expect(validateContactSubmission({ ...validContact, message: 'x'.repeat(5001) }).ok).toBe(
			false,
		);
	});

	it('passes the honeypot value through', () => {
		const result = validateContactSubmission({ ...validContact, website: 'spam' });
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data.website).toBe('spam');
	});
});

describe('buildContactEmail', () => {
	it('builds a [Contact] subject and includes all fields', () => {
		const result = validateContactSubmission(validContact);
		if (!result.ok) throw new Error('expected valid');
		const { subject, text } = buildContactEmail(result.data, '2026-07-01T00:00:00.000Z');
		expect(subject).toBe('[Contact] Jane Doe');
		expect(text).toContain('jane@example.com');
		expect(text).toContain('inventory dashboards');
		expect(text).toContain('2026-07-01T00:00:00.000Z');
	});
});

const validMedia = {
	name: 'Jane Doe',
	email: 'jane@example.com',
	outlet: 'Comox Valley Record',
	deadline: 'Friday 5pm PT',
	message: 'Writing a piece on the Puntledge Tube Report — can we set up an interview?',
	website: '',
	token: 'XXXX.turnstile-token',
};

describe('validateMediaSubmission', () => {
	it('accepts a valid submission and trims fields', () => {
		const result = validateMediaSubmission({ ...validMedia, outlet: '  Comox Valley Record  ' });
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data.outlet).toBe('Comox Valley Record');
	});

	it('requires an outlet', () => {
		expect(validateMediaSubmission({ ...validMedia, outlet: '' }).ok).toBe(false);
		expect(validateMediaSubmission({ ...validMedia, outlet: undefined }).ok).toBe(false);
	});

	it('treats deadline as optional and defaults it to an empty string', () => {
		const result = validateMediaSubmission({ ...validMedia, deadline: undefined });
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data.deadline).toBe('');
	});

	it('rejects missing or empty common fields', () => {
		for (const field of ['name', 'email', 'message', 'token'] as const) {
			expect(validateMediaSubmission({ ...validMedia, [field]: '' }).ok).toBe(false);
			expect(validateMediaSubmission({ ...validMedia, [field]: undefined }).ok).toBe(false);
		}
	});

	it('enforces max lengths on outlet and deadline', () => {
		expect(validateMediaSubmission({ ...validMedia, outlet: 'x'.repeat(201) }).ok).toBe(false);
		expect(validateMediaSubmission({ ...validMedia, deadline: 'x'.repeat(201) }).ok).toBe(false);
	});

	it('passes the honeypot value through', () => {
		const result = validateMediaSubmission({ ...validMedia, website: 'spam' });
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data.website).toBe('spam');
	});
});

describe('buildMediaEmail', () => {
	it('builds a [Media] subject with outlet and sender name', () => {
		const result = validateMediaSubmission(validMedia);
		if (!result.ok) throw new Error('expected valid');
		const { subject, text } = buildMediaEmail(result.data, '2026-07-01T00:00:00.000Z');
		expect(subject).toBe('[Media] Comox Valley Record: Jane Doe');
		expect(text).toContain('jane@example.com');
		expect(text).toContain('Friday 5pm PT');
		expect(text).toContain('2026-07-01T00:00:00.000Z');
	});

	it('marks a missing deadline as not specified', () => {
		const result = validateMediaSubmission({ ...validMedia, deadline: undefined });
		if (!result.ok) throw new Error('expected valid');
		const { text } = buildMediaEmail(result.data, '2026-07-01T00:00:00.000Z');
		expect(text).toContain('Deadline: Not specified');
	});
});
