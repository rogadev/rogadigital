# Contact Form Rework + Booking Terms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `/contact` a real message form via a new `/api/contact` function (reusing Turnstile + Resend), and publish paid-call qualifying terms.

**Architecture:** Shared plumbing (Turnstile verify, Resend send) extracts from `api/support.ts` into `api/_lib/`; `api/contact.ts` composes the same helpers. `SupportForm.svelte` generalizes into `InquiryForm.svelte` (props: `endpoint`, `showProduct`) used by both pages. Terms land as a linkable section in `/terms-of-service` plus a short notice at the `/contact` booking CTA.

**Tech Stack:** Astro 7, Svelte 5 runes, Vercel Functions (Web handlers), Cloudflare Turnstile, Resend REST, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-01-contact-form-booking-terms-design.md`

## Global Constraints

- `ryan@roga.dev` exists ONLY under `api/` (it moves to `api/_lib/email.ts`) — never under `src/`, never in `dist/`.
- Consultation terms exact values: **USD $120 per hour, one hour minimum; net 30; 2% per month (26.82% per annum); collections after six months**.
- Never use the word "engineer" for Ryan/Roga Digital.
- Svelte 5 runes only; component structure order per CLAUDE.md.
- Relative imports inside `api/` use explicit `.js` extensions (Vercel's function build type-checks with nodenext — TS2835 otherwise).
- Quality bars: mobile-first, no horizontal scroll at 320px, WCAG 2.2 AA, ≥44px touch targets.
- Run `pnpm ready` before each commit; conventional-commit messages.

---

### Task 1: Extract Turnstile + email helpers, recompose `api/support.ts`

**Files:**

- Create: `api/_lib/turnstile.ts`
- Create: `api/_lib/email.ts`
- Modify: `api/support.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces: `verifyTurnstile(token: string, remoteip?: string): Promise<boolean>`; `sendEmail(options: { subject: string; text: string; replyTo: string }): Promise<boolean>`; `isEmailConfigured(): boolean`; `isTurnstileConfigured(): boolean`. Consumed by Task 3's `api/contact.ts`.

- [ ] **Step 1: Create `api/_lib/turnstile.ts`**

```ts
export function isTurnstileConfigured(): boolean {
	return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstile(token: string, remoteip?: string): Promise<boolean> {
	const secret = process.env.TURNSTILE_SECRET_KEY;
	if (!secret) return false;
	const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ secret, response: token, ...(remoteip ? { remoteip } : {}) }),
	});
	const verdict = (await res.json()) as { success?: boolean };
	return verdict.success === true;
}
```

- [ ] **Step 2: Create `api/_lib/email.ts`**

```ts
// The ONLY place the destination address exists. Never move this to src/.
const TO_ADDRESS = 'ryan@roga.dev';
const FROM_ADDRESS = 'Roga Digital <support@roga.dev>';

export function isEmailConfigured(): boolean {
	return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(options: {
	subject: string;
	text: string;
	replyTo: string;
}): Promise<boolean> {
	const key = process.env.RESEND_API_KEY;
	if (!key) return false;
	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			from: FROM_ADDRESS,
			to: [TO_ADDRESS],
			reply_to: options.replyTo,
			subject: options.subject,
			text: options.text,
		}),
	});
	if (!res.ok) console.error('Resend send failed', res.status, await res.text());
	return res.ok;
}
```

- [ ] **Step 3: Recompose `api/support.ts`** (full replacement)

```ts
import { sendEmail, isEmailConfigured } from './_lib/email.js';
import { isTurnstileConfigured, verifyTurnstile } from './_lib/turnstile.js';
import { buildEmail, validateSubmission } from './_lib/validation.js';

function json(status: number, body: Record<string, unknown>): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

export async function POST(request: Request): Promise<Response> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json(400, { error: 'Invalid request body.' });
	}

	const result = validateSubmission(body);
	if (!result.ok) return json(400, { error: result.error });
	const data = result.data;

	// Honeypot tripped: pretend success, send nothing, don't tip off the bot.
	if (data.website !== '') return json(200, { ok: true });

	if (!isTurnstileConfigured() || !isEmailConfigured()) {
		return json(500, { error: 'The support form is temporarily unavailable.' });
	}

	const remoteip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
	if (!(await verifyTurnstile(data.token, remoteip))) {
		return json(400, { error: 'Verification failed — please try again.' });
	}

	const { subject, text } = buildEmail(data, new Date().toISOString());
	if (!(await sendEmail({ subject, text, replyTo: data.email }))) {
		return json(502, { error: "Couldn't send your message — please try again in a minute." });
	}

	return json(200, { ok: true });
}
```

- [ ] **Step 4: Verify green**

Run: `pnpm test && pnpm ready`
Expected: 10 tests pass; 0 errors. Also confirm the address moved: `grep -r "ryan@roga.dev" api/ | grep -v _lib/email` → only the `email.ts` line remains... actually run `grep -rn "ryan@roga.dev" api/` and expect exactly one hit in `api/_lib/email.ts`.

- [ ] **Step 5: Commit**

```bash
git add api/
git commit -m "refactor(api): extract Turnstile and Resend helpers into api/_lib"
```

---

### Task 2: Contact validation + email builder (TDD)

**Files:**

- Modify: `api/_lib/validation.ts`
- Test: `tests/support-validation.test.ts` (append a describe block)

**Interfaces:**

- Consumes: existing internals of `validation.ts`.
- Produces: `type ContactSubmission { name; email; message; website; token: string }`; `validateContactSubmission(body: unknown): { ok: true; data: ContactSubmission } | { ok: false; error: string }`; `buildContactEmail(data: ContactSubmission, submittedAt: string): { subject: string; text: string }`. Consumed by Task 3.

- [ ] **Step 1: Append failing tests** to `tests/support-validation.test.ts`

```ts
import { buildContactEmail, validateContactSubmission } from '../api/_lib/validation';

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
```

Note: merge the two imports from `'../api/_lib/validation'` into one statement or the linter will complain about duplicate imports.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test`
Expected: FAIL — `validateContactSubmission` is not exported.

- [ ] **Step 3: Implement in `api/_lib/validation.ts`** — refactor to share the common-field logic (full replacement of the file):

```ts
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

export type ValidationResult = { ok: true; data: SupportSubmission } | { ok: false; error: string };

export type ContactValidationResult =
	{ ok: true; data: ContactSubmission } | { ok: false; error: string };

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
```

Field-order caveat: the original support validator checked `product` before `message`/`token`; this refactor checks common fields first. No test asserts error-message ordering across fields, so this is safe.

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test`
Expected: all tests pass (10 existing + 6 new).

- [ ] **Step 5: Gate and commit**

```bash
pnpm ready
git add api/_lib/validation.ts tests/support-validation.test.ts
git commit -m "feat(contact): contact submission validation and email builder"
```

---

### Task 3: `api/contact.ts`

**Files:**

- Create: `api/contact.ts`

**Interfaces:**

- Consumes: `validateContactSubmission`, `buildContactEmail` (Task 2); `verifyTurnstile`, `isTurnstileConfigured` (Task 1); `sendEmail`, `isEmailConfigured` (Task 1).
- Produces: `POST /api/contact` accepting JSON `{ name, email, message, website, token }` → `200 {"ok":true}` or `{ "error": string }` with 400/500/502. Consumed by Task 4's island.

- [ ] **Step 1: Create `api/contact.ts`**

```ts
import { sendEmail, isEmailConfigured } from './_lib/email.js';
import { isTurnstileConfigured, verifyTurnstile } from './_lib/turnstile.js';
import { buildContactEmail, validateContactSubmission } from './_lib/validation.js';

function json(status: number, body: Record<string, unknown>): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

export async function POST(request: Request): Promise<Response> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json(400, { error: 'Invalid request body.' });
	}

	const result = validateContactSubmission(body);
	if (!result.ok) return json(400, { error: result.error });
	const data = result.data;

	// Honeypot tripped: pretend success, send nothing, don't tip off the bot.
	if (data.website !== '') return json(200, { ok: true });

	if (!isTurnstileConfigured() || !isEmailConfigured()) {
		return json(500, { error: 'The contact form is temporarily unavailable.' });
	}

	const remoteip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
	if (!(await verifyTurnstile(data.token, remoteip))) {
		return json(400, { error: 'Verification failed — please try again.' });
	}

	const { subject, text } = buildContactEmail(data, new Date().toISOString());
	if (!(await sendEmail({ subject, text, replyTo: data.email }))) {
		return json(502, { error: "Couldn't send your message — please try again in a minute." });
	}

	return json(200, { ok: true });
}
```

- [ ] **Step 2: Gate and commit**

```bash
pnpm test && pnpm ready
git add api/contact.ts
git commit -m "feat(contact): /api/contact Vercel function"
```

---

### Task 4: Generalize the island: `SupportForm.svelte` → `InquiryForm.svelte`

**Files:**

- Rename: `src/components/SupportForm.svelte` → `src/components/InquiryForm.svelte` (`git mv`)
- Modify: `src/pages/support.astro`

**Interfaces:**

- Consumes: `POST /api/support` and `POST /api/contact` (endpoint chosen by prop).
- Produces: `<InquiryForm endpoint="/api/contact" client:load />` and `<InquiryForm endpoint="/api/support" showProduct client:load />`. Consumed by Task 5's contact page.

- [ ] **Step 1: Rename and add props**

```bash
git mv src/components/SupportForm.svelte src/components/InquiryForm.svelte
```

In the renamed file, replace the top of the `<script lang="ts">` block (imports through `siteKey`) with:

```svelte
	import { SUPPORT_PRODUCTS } from '../consts';

	interface Props {
		endpoint: string;
		showProduct?: boolean;
	}

	const { endpoint, showProduct = false }: Props = $props();

	let name = $state('');
	let email = $state('');
	let product = $state('other');
	let message = $state('');
	let website = $state(''); // honeypot
	let token = $state('');
	let status = $state<'idle' | 'submitting' | 'success' | 'error'>('idle');
	let errorMessage = $state('');
	let turnstileContainer = $state<HTMLDivElement>();
	let widgetId: string | undefined;

	const siteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string;
```

(Per CLAUDE.md structure order, `$props()` comes before `$state()`.)

- [ ] **Step 2: Gate the product-preselect effect** — wrap its body:

```svelte
	$effect(() => {
		if (!showProduct) return;
		const fromUrl = new URLSearchParams(window.location.search).get('product');
		if (fromUrl && SUPPORT_PRODUCTS.some((p) => p.slug === fromUrl)) {
			product = fromUrl;
		}
	});
```

- [ ] **Step 3: Parameterize the fetch** — in `handleSubmit`, replace the fetch call:

```svelte
			const res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					email,
					message,
					website,
					token,
					...(showProduct ? { product } : {}),
				}),
			});
```

- [ ] **Step 4: Gate the product field in the template** — wrap the product `<div class="flex flex-col gap-2">` block (label + select) in `{#if showProduct}` … `{/if}`.

- [ ] **Step 5: Update `src/pages/support.astro`**

```astro
import InquiryForm from '../components/InquiryForm.svelte';
```

and

```astro
<InquiryForm endpoint="/api/support" showProduct client:load />
```

- [ ] **Step 6: Verify in dev**

Run: `pnpm dev`, open `http://localhost:4321/support?product=ezeval`.
Expected: identical behavior to before — product dropdown present, EzEval pre-selected, Turnstile renders, submit → error message (no `/api` in astro dev).

- [ ] **Step 7: Gate and commit**

```bash
pnpm ready
git add src/components/InquiryForm.svelte src/pages/support.astro
git commit -m "refactor(forms): generalize SupportForm into InquiryForm with endpoint/showProduct props"
```

---

### Task 5: `/contact` page rework

**Files:**

- Modify: `src/pages/contact.astro`

**Interfaces:**

- Consumes: `<InquiryForm endpoint="/api/contact" client:load />` (Task 4); links to `/terms-of-service#consultation-bookings` (section id created in Task 6 — dead anchor until then, resolved same session).

- [ ] **Step 1: Add the import** at the top of the frontmatter:

```astro
import InquiryForm from '../components/InquiryForm.svelte';
```

- [ ] **Step 2: Add the qualifying notice** — in the "Book a call" (left) panel, immediately after the `<p class="font-mono text-2xs tracking-wide text-fg-subtle">{BOOKING_URL...}</p>` line, add:

```astro
<p class="mt-2 border-t border-border pt-4 text-sm text-fg-subtle text-pretty">
	Intro calls are free for prospective clients — people exploring whether to hire Roga Digital. They
	are not for selling to me. Vendor and sales calls booked through this calendar are billed at USD
	$120/hour (1-hour minimum) per the{' '}
	<a
		href="/terms-of-service#consultation-bookings"
		class="text-fg-muted underline-offset-4 hover:underline"
	>
		booking terms
	</a>
	.
</p>
```

- [ ] **Step 3: Replace the right panel** — swap the entire "Other channels" `<div class="flex flex-col gap-6 bg-bg p-8 sm:p-10">…</div>` (the LinkedIn/GitHub panel) with:

```astro
<!-- Direct message -->
<div class="flex flex-col gap-6 bg-bg p-8 sm:p-10">
	<p class="font-mono text-2xs tracking-[0.18em] text-fg-subtle uppercase">Or send a message</p>
	<h2 class="text-2xl font-medium tracking-tight text-balance text-fg sm:text-3xl">
		Prefer writing first?
	</h2>
	<p class="text-fg-muted text-pretty">
		Tell me about the project in your own words. Same promise as the call: a real reply within 48
		hours.
	</p>
	<InquiryForm endpoint="/api/contact" client:load />
</div>
```

Note: `InquiryForm` renders its own bordered card. Nested inside this bordered panel that's double-framing — acceptable, but preferred: strip the island's outer chrome visually by keeping the panel padding tight. If it looks doubled in the dev check (Step 5), change the panel to `p-4 sm:p-6` and remove the heading/dek margins accordingly — judgement call at implementation, verify visually.

- [ ] **Step 4: Compact socials row** — after the closing `</div>` of the two-panel grid (the one with `my-16`), change the grid's classes from `my-16` to `mt-16 mb-8`, and insert before the section's closing `</div>`:

```astro
<ul class="mb-16 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm" role="list">
	<li>
		<a
			href={SOCIAL.linkedin}
			target="_blank"
			rel="noopener noreferrer"
			class="group inline-flex items-center gap-2"
		>
			<span class="font-mono text-2xs tracking-[0.18em] text-fg-subtle uppercase">LinkedIn</span>
			<span class="text-fg underline-offset-4 group-hover:underline">in/ryanroga</span>
		</a>
	</li>
	<li>
		<a
			href={SOCIAL.github}
			target="_blank"
			rel="noopener noreferrer"
			class="group inline-flex items-center gap-2"
		>
			<span class="font-mono text-2xs tracking-[0.18em] text-fg-subtle uppercase">GitHub</span>
			<span class="text-fg underline-offset-4 group-hover:underline">@rogadev</span>
		</a>
	</li>
	<li class="inline-flex items-center gap-2">
		<span class="font-mono text-2xs tracking-[0.18em] text-fg-subtle uppercase">Based</span>
		<span class="text-fg">{SITE_LOCATION}</span>
	</li>
</ul>
```

- [ ] **Step 5: Verify in dev**

Run: `pnpm dev`, open `http://localhost:4321/contact`.
Expected: booking panel with notice, form panel beside it, socials row beneath, no horizontal scroll at 320px (iframe probe or devtools), form submit shows inline error (expected — no `/api` in dev).

- [ ] **Step 6: Gate and commit**

```bash
pnpm ready
git add src/pages/contact.astro
git commit -m "feat(contact): message form panel, qualifying notice, compact socials row"
```

---

### Task 6: ToS consultation section, final verification, push

**Files:**

- Modify: `src/pages/terms-of-service.astro`

**Interfaces:**

- Produces: `#consultation-bookings` anchor consumed by Task 5's notice link.

- [ ] **Step 1: Add id support to the section renderer** — the `sections` array entries gain an optional `id`; update the template map:

```astro
sections.map((s) => (<section class="mt-12" id={'id' in s ? s.id : undefined}></section>
```

(If TypeScript complains about the union, type the array as
`{ h: string; body: string[]; id?: string }[]` explicitly.)

- [ ] **Step 2: Insert the new section** into the `sections` array between "Use of the site" and "Intellectual property":

```ts
{
	h: 'Consultation bookings',
	id: 'consultation-bookings',
	body: [
		'Free introductory calls are offered solely to prospective clients — individuals and businesses evaluating whether to engage Roga Digital\'s services. Booking a call constitutes acceptance of these terms.',
		'The booking calendar may not be used to market, pitch, or sell products or services to Roga Digital. Calls booked for that purpose are billed as consulting at USD $120 per hour, with a one-hour minimum, and an invoice will be issued to the contact information provided at booking.',
		'Invoices are payable within 30 days. Overdue balances accrue interest at 2% per month (26.82% per annum). Accounts more than six months past due may be referred to a collection agency, and collection costs may be added to the balance where permitted by law.',
	],
},
```

- [ ] **Step 3: Verify the anchor** — `pnpm dev`, open `http://localhost:4321/terms-of-service#consultation-bookings`; the section scrolls into view. Check `/contact`'s "booking terms" link lands there.

- [ ] **Step 4: Full gate**

```bash
pnpm test && pnpm ready && pnpm build
grep -ri "ryan@roga.dev" dist/ src/ ; echo "exit: $?"
```

Expected: all green; grep exit 1 (no matches).

- [ ] **Step 5: Commit and push**

```bash
git add src/pages/terms-of-service.astro
git commit -m "feat(legal): consultation booking terms with paid vendor-call clause"
git pull --rebase && git push
```

- [ ] **Step 6: Hand the owner the cal.com line** (report in chat, not code):

> Free intro calls are for prospective clients only. Vendor/sales calls are billed at USD $120/hour (1h minimum) — see roga.dev/terms-of-service.

## Self-review notes

- Spec coverage: helpers (T1), contact validator/builder (T2), function (T3), island generalization + support page (T4), contact page + notice (T5), ToS section + anchor + gates (T6). Owner cal.com task in T6 Step 6.
- Type consistency: `ContactSubmission`/`validateContactSubmission`/`buildContactEmail` names match across T2/T3; `endpoint`/`showProduct` props match T4/T5.
- Known judgement point flagged inline: double-frame styling of the island inside the contact panel (T5 Step 3).
