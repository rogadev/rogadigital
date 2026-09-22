# Support Form + Turnstile + Legal Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/support` page with a Turnstile-protected contact form that emails ryan@roga.dev via a Vercel serverless function + Resend, plus the missing `/privacy` and `/terms-of-service` pages.

**Architecture:** The site stays static-only Astro. One Vercel function at `api/support.ts` (root-level `api/` dir, Web-handler signature) verifies the Turnstile token and sends via the Resend REST API. Pure validation/email-building logic lives in `api/_lib/validation.ts` and is unit-tested with Vitest. The form is a Svelte 5 island.

**Tech Stack:** Astro 7, Svelte 5 (runes), Tailwind v4 tokens, Vercel Functions (Node runtime, Web handlers), Cloudflare Turnstile, Resend REST API (no SDK), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-01-support-form-design.md`

## Global Constraints

- Package manager is pnpm 11 (`pnpm add`, never npm/yarn). Node ≥ 24.
- Recipient `ryan@roga.dev` appears ONLY in `api/support.ts` — never in `src/` or anything that ships to the client.
- Never use the word "engineer" for Ryan/Roga Digital in any copy.
- Svelte 5 runes mode only: `$props()`, `$state()`, `$derived()`, `$effect()`, `onclick=`, no `$:`/`export let`/`<slot />`.
- Quality bars: mobile-first, no horizontal scroll at 320px, WCAG 2.2 AA, touch targets ≥ 44px (`min-h-11`), visible focus, one `<h1>` per page.
- Styling uses existing tokens/classes seen in `src/pages/contact.astro`: `max-w-page`, `border-border`, `bg-bg`, `bg-bg-soft`, `text-fg`, `text-fg-muted`, `text-fg-subtle`, `text-2xs`, `var(--color-accent)`. No drop shadows; 1px hairline borders.
- Commit after every task with a conventional-commit message. Run `pnpm ready` before each commit.
- Turnstile test keys for local/dev: site key `1x00000000000000000000AA` (always passes), secret `1x0000000000000000000000000000000AA`.

---

### Task 1: Vitest setup, product constants, and validation module (TDD)

**Files:**

- Modify: `package.json` (add `test` script; devDeps `vitest`, `@types/node`)
- Modify: `src/consts.ts` (add `SUPPORT_PRODUCTS`)
- Create: `api/_lib/validation.ts`
- Test: `tests/support-validation.test.ts`

**Interfaces:**

- Produces: `SUPPORT_PRODUCTS: readonly {slug, label}[]` (from `src/consts.ts`); `validateSubmission(body: unknown): ValidationResult`; `buildEmail(data: SupportSubmission, submittedAt: string): { subject: string; text: string }`; type `SupportSubmission { name; email; product; message; website; token: string }` — all consumed by Task 2's handler and Task 3's island (constants only).

- [ ] **Step 1: Install test deps and add script**

```bash
pnpm add -D vitest @types/node
```

Add to `package.json` scripts (after `"check"`):

```json
"test": "vitest run",
```

- [ ] **Step 2: Add product constants to `src/consts.ts`** (append at end of file)

```ts
/**
 * Products listed in the /support form dropdown. `slug` doubles as the
 * accepted value for the `?product=` query param on /support.
 */
export const SUPPORT_PRODUCTS = [
	{ slug: 'copycleanse', label: 'CopyCleanse' },
	{ slug: 'ezeval', label: 'EzEval' },
	{ slug: 'outlooks', label: 'Employment and Education Outlooks' },
	{ slug: 'carevo', label: 'Carevo Lot Logistics' },
	{ slug: 'other', label: 'Other / general' },
] as const;
```

- [ ] **Step 3: Write the failing tests** — `tests/support-validation.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { buildEmail, validateSubmission } from '../api/_lib/validation';

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
		for (const slug of ['copycleanse', 'ezeval', 'outlooks', 'carevo', 'other']) {
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
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — cannot resolve `../api/_lib/validation`.

- [ ] **Step 5: Implement `api/_lib/validation.ts`**

Note: files/dirs starting with `_` inside `api/` are NOT deployed as functions by Vercel — this module is bundled into `api/support.ts` only.

```ts
import { SUPPORT_PRODUCTS } from '../../src/consts';

export interface SupportSubmission {
	name: string;
	email: string;
	product: string;
	message: string;
	/** Honeypot field — must be empty for real users. */
	website: string;
	/** Turnstile response token. */
	token: string;
}

export type ValidationResult = { ok: true; data: SupportSubmission } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRODUCT_SLUGS = new Set<string>(SUPPORT_PRODUCTS.map((p) => p.slug));

function asTrimmedString(value: unknown): string | null {
	return typeof value === 'string' ? value.trim() : null;
}

export function validateSubmission(body: unknown): ValidationResult {
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

	const product = asTrimmedString(record.product);
	if (!product || !PRODUCT_SLUGS.has(product)) {
		return { ok: false, error: 'Please choose a product.' };
	}

	const message = asTrimmedString(record.message);
	if (!message || message.length > 5000) {
		return { ok: false, error: 'Please include a message (up to 5000 characters).' };
	}

	const token = asTrimmedString(record.token);
	if (!token) return { ok: false, error: 'Verification incomplete — please try again.' };

	const website = typeof record.website === 'string' ? record.website : '';

	return { ok: true, data: { name, email, product, message, website, token } };
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
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS (all tests).

- [ ] **Step 7: Gate and commit**

```bash
pnpm ready
git add package.json pnpm-lock.yaml src/consts.ts api/_lib/validation.ts tests/support-validation.test.ts
git commit -m "feat(support): product constants and submission validation with tests"
```

If `pnpm ready` flags lint/format issues, fix them before committing.

---

### Task 2: Vercel function `api/support.ts`

**Files:**

- Create: `api/support.ts`

**Interfaces:**

- Consumes: `validateSubmission`, `buildEmail`, `SupportSubmission` from `api/_lib/validation.ts` (Task 1).
- Produces: `POST /api/support` accepting JSON `{ name, email, product, message, website, token }`; responds `200 {"ok":true}`, or `{ "error": string }` with status 400/500/502. Consumed by Task 3's island.

- [ ] **Step 1: Implement the handler**

Vercel's Node runtime supports Web-standard handlers in root `api/` files: a named `POST` export receives a `Request` and returns a `Response`; other methods get 405 automatically.

```ts
import { buildEmail, validateSubmission } from './_lib/validation';

// The ONLY place the destination address exists. Never move this to src/.
const TO_ADDRESS = 'ryan@roga.dev';
const FROM_ADDRESS = 'Roga Digital Support <support@roga.dev>';

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

	const secret = process.env.TURNSTILE_SECRET_KEY;
	const resendKey = process.env.RESEND_API_KEY;
	if (!secret || !resendKey) {
		return json(500, { error: 'The support form is temporarily unavailable.' });
	}

	const remoteip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
	const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			secret,
			response: data.token,
			...(remoteip ? { remoteip } : {}),
		}),
	});
	const verdict = (await verifyRes.json()) as { success?: boolean };
	if (!verdict.success) {
		return json(400, { error: 'Verification failed — please try again.' });
	}

	const { subject, text } = buildEmail(data, new Date().toISOString());
	const sendRes = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${resendKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			from: FROM_ADDRESS,
			to: [TO_ADDRESS],
			reply_to: data.email,
			subject,
			text,
		}),
	});
	if (!sendRes.ok) {
		console.error('Resend send failed', sendRes.status, await sendRes.text());
		return json(502, {
			error: "Couldn't send your message — please try again in a minute.",
		});
	}

	return json(200, { ok: true });
}
```

- [ ] **Step 2: Type-check and gate**

Run: `pnpm ready` (astro check type-checks `api/` too — `tsconfig.json` includes `**/*`).
Expected: PASS. If `process` is untyped, confirm `@types/node` from Task 1 is installed.

- [ ] **Step 3: Run unit tests still green**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add api/support.ts
git commit -m "feat(support): Vercel function verifying Turnstile and sending via Resend"
```

---

### Task 3: `SupportForm.svelte` island + Turnstile types

**Files:**

- Create: `src/types/turnstile.d.ts`
- Create: `src/components/SupportForm.svelte`

**Interfaces:**

- Consumes: `SUPPORT_PRODUCTS` from `src/consts.ts` (Task 1); `POST /api/support` (Task 2); `import.meta.env.PUBLIC_TURNSTILE_SITE_KEY`.
- Produces: `<SupportForm />` component with no props, consumed by Task 4's page with `client:load`.

- [ ] **Step 1: Ambient Turnstile types** — `src/types/turnstile.d.ts`

```ts
interface TurnstileRenderOptions {
	sitekey: string;
	callback?: (token: string) => void;
	'expired-callback'?: () => void;
	'error-callback'?: () => void;
	theme?: 'light' | 'dark' | 'auto';
}

interface Turnstile {
	render: (el: HTMLElement, options: TurnstileRenderOptions) => string;
	reset: (widgetId?: string) => void;
}

interface Window {
	turnstile?: Turnstile;
}
```

- [ ] **Step 2: Implement the island** — `src/components/SupportForm.svelte`

Structure order per CLAUDE.md: imports → state → derived → effects → functions → template. Honeypot is visually hidden with `sr-only`-style off-screen positioning plus `tabindex="-1"` and `autocomplete="off"` so keyboard/screen-reader users never hit it.

```svelte
<script lang="ts">
	import { SUPPORT_PRODUCTS } from '../consts';

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
	const canSubmit = $derived(status !== 'submitting' && token !== '');

	$effect(() => {
		const fromUrl = new URLSearchParams(window.location.search).get('product');
		if (fromUrl && SUPPORT_PRODUCTS.some((p) => p.slug === fromUrl)) {
			product = fromUrl;
		}
	});

	$effect(() => {
		const container = turnstileContainer;
		if (!container) return;
		const render = () => {
			widgetId = window.turnstile?.render(container, {
				sitekey: siteKey,
				theme: 'auto',
				callback: (t) => (token = t),
				'expired-callback': () => (token = ''),
				'error-callback': () => (token = ''),
			});
		};
		if (window.turnstile) {
			render();
			return;
		}
		const script = document.createElement('script');
		script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
		script.async = true;
		script.onload = render;
		document.head.appendChild(script);
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		status = 'submitting';
		errorMessage = '';
		try {
			const res = await fetch('/api/support', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email, product, message, website, token }),
			});
			const body = (await res.json()) as { ok?: boolean; error?: string };
			if (!res.ok) throw new Error(body.error ?? 'Something went wrong.');
			status = 'success';
		} catch (err) {
			status = 'error';
			errorMessage =
				err instanceof Error ? err.message : 'Something went wrong — please try again.';
			token = '';
			if (widgetId !== undefined) window.turnstile?.reset(widgetId);
		}
	}
</script>

{#if status === 'success'}
	<div class="rounded-lg border border-border bg-bg-soft p-8 sm:p-10" role="status">
		<p class="font-mono text-2xs tracking-[0.18em] text-[var(--color-accent)] uppercase">
			Message sent
		</p>
		<h2 class="mt-4 text-2xl font-medium tracking-tight text-fg">
			Thanks — I'll get back to you soon.
		</h2>
		<p class="mt-3 text-fg-muted text-pretty">
			Your message is on its way. Replies usually land within two business days.
		</p>
	</div>
{:else}
	<form
		onsubmit={handleSubmit}
		class="flex flex-col gap-6 rounded-lg border border-border bg-bg p-8 sm:p-10"
		novalidate
	>
		<div class="grid gap-6 sm:grid-cols-2">
			<div class="flex flex-col gap-2">
				<label for="support-name" class="text-sm font-medium text-fg">Name</label>
				<input
					id="support-name"
					name="name"
					type="text"
					required
					maxlength="200"
					autocomplete="name"
					bind:value={name}
					class="min-h-11 rounded-md border border-border bg-bg px-3 text-fg"
				/>
			</div>
			<div class="flex flex-col gap-2">
				<label for="support-email" class="text-sm font-medium text-fg">Email</label>
				<input
					id="support-email"
					name="email"
					type="email"
					required
					maxlength="254"
					autocomplete="email"
					bind:value={email}
					class="min-h-11 rounded-md border border-border bg-bg px-3 text-fg"
				/>
			</div>
		</div>

		<div class="flex flex-col gap-2">
			<label for="support-product" class="text-sm font-medium text-fg">Product</label>
			<select
				id="support-product"
				name="product"
				required
				bind:value={product}
				class="min-h-11 rounded-md border border-border bg-bg px-3 text-fg"
			>
				{#each SUPPORT_PRODUCTS as p (p.slug)}
					<option value={p.slug}>{p.label}</option>
				{/each}
			</select>
		</div>

		<div class="flex flex-col gap-2">
			<label for="support-message" class="text-sm font-medium text-fg"> How can I help? </label>
			<textarea
				id="support-message"
				name="message"
				required
				maxlength="5000"
				rows="6"
				bind:value={message}
				class="rounded-md border border-border bg-bg px-3 py-2.5 text-fg"></textarea>
		</div>

		<!-- Honeypot: real users never see or reach this field. -->
		<div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
			<label for="support-website">Website</label>
			<input
				id="support-website"
				name="website"
				type="text"
				tabindex="-1"
				autocomplete="off"
				bind:value={website}
			/>
		</div>

		<div bind:this={turnstileContainer}></div>

		{#if status === 'error'}
			<p id="support-error" class="text-sm text-red-600 dark:text-red-400" role="alert">
				{errorMessage}
			</p>
		{/if}

		<button
			type="submit"
			disabled={!canSubmit}
			aria-describedby={status === 'error' ? 'support-error' : undefined}
			class="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-md bg-fg px-5 py-3 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
		>
			{status === 'submitting' ? 'Sending…' : 'Send message'}
		</button>
	</form>
{/if}
```

Note: the honeypot wrapper uses absolute off-screen positioning; ensure the `<form>` has `class="relative …"` added if the absolute child affects layout — verify visually in Step 4 of Task 4.

- [ ] **Step 3: Gate and commit**

```bash
pnpm ready
git add src/types/turnstile.d.ts src/components/SupportForm.svelte
git commit -m "feat(support): Turnstile-protected support form island"
```

---

### Task 4: `/support` page + footer link

**Files:**

- Create: `src/pages/support.astro`
- Modify: `src/components/Footer.astro` (Site column, after the Contact entry)
- Create: `.env` (local only, gitignored — verify `.env` is in `.gitignore` first)

**Interfaces:**

- Consumes: `<SupportForm />` (Task 3), `Base` layout, `SUPPORT_PRODUCTS` (labels shown in intro copy are optional — not required).
- Produces: route `/support`, linked from the footer.

- [ ] **Step 1: Create `src/pages/support.astro`**

```astro
---
import SupportForm from '../components/SupportForm.svelte';
import Base from '../layouts/Base.astro';

const title = 'Support · Roga Digital';
const description =
	'Get help with a Roga Digital product. Send a message through the support form and get a reply by email — usually within two business days.';
---

<Base title={title} description={description}>
	<!-- Hero -->
	<section class="border-b border-border">
		<div class="mx-auto w-full max-w-page px-6 sm:px-8">
			<div class="pt-20 pb-16 sm:pt-28 sm:pb-20">
				<p class="font-mono text-2xs tracking-[0.18em] text-fg-subtle uppercase">Support</p>
				<h1 class="mt-6 text-4xl font-medium tracking-tight text-balance sm:text-5xl">
					Need a hand with
					<span class="text-fg-muted">a product?</span>
				</h1>
				<p class="mt-6 max-w-2xl text-lg text-fg-muted text-pretty sm:text-xl">
					Tell me what's going wrong — or what you'd like to see — and I'll get back to you by
					email, usually within two business days.
				</p>
			</div>
		</div>
	</section>

	<!-- Form -->
	<section>
		<div class="mx-auto w-full max-w-page px-6 py-16 sm:px-8 sm:py-20">
			<div class="mx-auto max-w-2xl">
				<SupportForm client:load />
				<p class="mt-6 text-sm text-fg-subtle text-pretty">
					This form is protected by Cloudflare Turnstile. Your details are used only to reply to
					your message — see the
					<a href="/privacy" class="underline-offset-4 hover:underline text-fg-muted">
						privacy policy
					</a>
					.
				</p>
			</div>
		</div>
	</section>
</Base>
```

- [ ] **Step 2: Add the footer link** — in `src/components/Footer.astro`, Site column:

```ts
{ href: '/contact', label: 'Contact' },
{ href: '/support', label: 'Support' },
```

- [ ] **Step 3: Local env for dev** — confirm `.env` is gitignored (`grep -i "^\.env" .gitignore`; add it if missing), then create `.env`:

```bash
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

- [ ] **Step 4: Manual verification in dev**

Run: `pnpm dev`, open `http://localhost:4321/support` and `http://localhost:4321/support?product=ezeval`.
Expected: form renders, test-key Turnstile auto-passes and enables the button, `?product=ezeval` pre-selects EzEval, unknown slug falls back to "Other / general". Submitting will fail (`astro dev` doesn't serve `/api`) — the inline error message must appear; that's the expected dev behavior, not a bug. Check layout at 320px width and keyboard-tab through the form (honeypot must be skipped, focus visible).

- [ ] **Step 5: Gate and commit**

```bash
pnpm ready && pnpm build
git add src/pages/support.astro src/components/Footer.astro
git commit -m "feat(support): /support page with form island and footer link"
```

---

### Task 5: `/privacy` page

**Files:**

- Create: `src/pages/privacy.astro`

**Interfaces:**

- Consumes: `Base` layout. Footer already links `/privacy`.
- Produces: route `/privacy`.

- [ ] **Step 1: Create `src/pages/privacy.astro`**

Generic BC sole-proprietorship policy. The site runs no analytics — say so plainly. Update the date literal to the implementation date.

```astro
---
import Base from '../layouts/Base.astro';

const title = 'Privacy Policy · Roga Digital';
const description =
	'How Roga Digital collects, uses, and protects personal information submitted through this site.';

const sections = [
	{
		h: 'Who we are',
		body: [
			'Roga Digital is a sole proprietorship operated by Ryan Roga in British Columbia, Canada. This policy explains how personal information submitted through this website is handled.',
		],
	},
	{
		h: 'What we collect',
		body: [
			'The only personal information this site collects is what you choose to send through the support form: your name, email address, the product your message concerns, and the message itself.',
			'This site runs no analytics and sets no tracking cookies. Our hosting provider (Vercel) keeps standard server logs, which may include IP addresses, for security and reliability.',
		],
	},
	{
		h: 'How we use it',
		body: [
			'Form submissions are used for one purpose: responding to your inquiry. They are delivered by email and are not added to mailing lists, sold, rented, or shared with third parties for marketing.',
		],
	},
	{
		h: 'Service providers',
		body: [
			'Form delivery relies on a small number of service providers: Cloudflare Turnstile (spam protection), Resend (email delivery), and Vercel (hosting). Each processes only what is needed to provide its service.',
		],
	},
	{
		h: 'Retention',
		body: [
			'Support messages are kept only as long as needed to handle the inquiry and any follow-up, then deleted.',
		],
	},
	{
		h: 'Your rights',
		body: [
			'Under Canadian privacy law (PIPEDA) and the BC Personal Information Protection Act, you may ask what personal information we hold about you, request a correction, or ask that it be deleted. Send a request through the support form and it will be handled promptly.',
		],
	},
	{
		h: 'Changes',
		body: [
			'If this policy changes, the updated version will be posted on this page with a new effective date.',
		],
	},
];
---

<Base title={title} description={description}>
	<section>
		<div class="mx-auto w-full max-w-page px-6 sm:px-8">
			<div class="mx-auto max-w-2xl pt-20 pb-16 sm:pt-28 sm:pb-20">
				<p class="font-mono text-2xs tracking-[0.18em] text-fg-subtle uppercase">Legal</p>
				<h1 class="mt-6 text-4xl font-medium tracking-tight text-balance sm:text-5xl">
					Privacy Policy
				</h1>
				<p class="mt-4 font-mono text-2xs tracking-wide text-fg-subtle uppercase">
					Effective July 1, 2026
				</p>

				{sections.map((s) => (
					<section class="mt-12">
						<h2 class="text-xl font-medium tracking-tight text-fg">{s.h}</h2>
						{s.body.map((p) => (
							<p class="mt-3 text-fg-muted text-pretty">{p}</p>
						))}
					</section>
				))}
			</div>
		</div>
	</section>
</Base>
```

- [ ] **Step 2: Gate and commit**

```bash
pnpm ready
git add src/pages/privacy.astro
git commit -m "feat(legal): privacy policy page"
```

---

### Task 6: `/terms-of-service` page + footer href fix

**Files:**

- Create: `src/pages/terms-of-service.astro`
- Modify: `src/components/Footer.astro` (Legal column: `/terms` → `/terms-of-service`)

**Interfaces:**

- Consumes: `Base` layout.
- Produces: route `/terms-of-service`; footer Terms link fixed.

- [ ] **Step 1: Create `src/pages/terms-of-service.astro`**

Same page skeleton as Task 5's privacy page (Base layout, `Legal` eyebrow, `max-w-2xl` column, `sections` array). Content:

```astro
---
import Base from '../layouts/Base.astro';

const title = 'Terms of Service · Roga Digital';
const description = 'The terms that govern use of this website and Roga Digital products.';

const sections = [
	{
		h: 'Agreement',
		body: [
			'These terms govern your use of this website, operated by Roga Digital, a sole proprietorship based in British Columbia, Canada. By using the site you accept these terms. Individual products or client engagements may be covered by their own agreements, which take precedence where they apply.',
		],
	},
	{
		h: 'Use of the site',
		body: [
			'You may browse the site and use the support form for its intended purpose. You agree not to misuse the site — including attempting to disrupt it, probe it for vulnerabilities without permission, or submit unlawful, abusive, or deceptive content through its forms.',
		],
	},
	{
		h: 'Intellectual property',
		body: [
			'The content of this site — text, design, code samples, and imagery — belongs to Roga Digital unless otherwise noted. You may not reproduce it commercially without permission. Client work shown remains the property of the respective clients where their agreements say so.',
		],
	},
	{
		h: 'No warranties',
		body: [
			'This site and its content are provided "as is", without warranties of any kind, express or implied. Information on the site is general in nature and is not professional advice for your specific situation.',
		],
	},
	{
		h: 'Limitation of liability',
		body: [
			'To the maximum extent permitted by law, Roga Digital is not liable for any indirect, incidental, or consequential damages arising from your use of this site. Where liability cannot be excluded, it is limited to the amount you paid to use the site — which, for a free website, is nil.',
		],
	},
	{
		h: 'Governing law',
		body: [
			'These terms are governed by the laws of British Columbia and the applicable laws of Canada. Any disputes will be resolved in the courts of British Columbia.',
		],
	},
	{
		h: 'Changes',
		body: [
			'These terms may be updated from time to time. The current version, with its effective date, always lives at this page.',
		],
	},
];
---

<Base title={title} description={description}>
	<section>
		<div class="mx-auto w-full max-w-page px-6 sm:px-8">
			<div class="mx-auto max-w-2xl pt-20 pb-16 sm:pt-28 sm:pb-20">
				<p class="font-mono text-2xs tracking-[0.18em] text-fg-subtle uppercase">Legal</p>
				<h1 class="mt-6 text-4xl font-medium tracking-tight text-balance sm:text-5xl">
					Terms of Service
				</h1>
				<p class="mt-4 font-mono text-2xs tracking-wide text-fg-subtle uppercase">
					Effective July 1, 2026
				</p>

				{sections.map((s) => (
					<section class="mt-12">
						<h2 class="text-xl font-medium tracking-tight text-fg">{s.h}</h2>
						{s.body.map((p) => (
							<p class="mt-3 text-fg-muted text-pretty">{p}</p>
						))}
					</section>
				))}
			</div>
		</div>
	</section>
</Base>
```

- [ ] **Step 2: Fix the footer Terms href** — in `src/components/Footer.astro`:

```ts
{ href: '/terms-of-service', label: 'Terms' },
```

- [ ] **Step 3: Gate and commit**

```bash
pnpm ready
git add src/pages/terms-of-service.astro src/components/Footer.astro
git commit -m "feat(legal): terms of service page, fix footer terms link"
```

---

### Task 7: Verification, docs, and deployment setup

**Files:**

- Modify: `CLAUDE.md` (Commands: add `pnpm test`; Deployment: env vars note)

**Interfaces:**

- Consumes: everything above.
- Produces: verified build; documented setup; owner checklist for keys.

- [ ] **Step 1: Full gate**

```bash
pnpm test && pnpm ready && pnpm build
```

Expected: all pass; `dist/` contains `support/index.html`, `privacy/index.html`, `terms-of-service/index.html`.

- [ ] **Step 2: Confirm the email address never ships to the client**

```bash
grep -ri "ryan@roga.dev" dist/ src/ ; echo "exit: $?"
```

Expected: no matches (exit 1). If it matches anything, that's a spec violation — fix before proceeding.

- [ ] **Step 3: Update `CLAUDE.md`**

- Commands section, after `pnpm check`: `- \`pnpm test\` — Vitest unit tests (support-form validation).`
- Deployment section, append: `The support form's Vercel function (\`api/support.ts\`) needs three env vars in Vercel: \`PUBLIC_TURNSTILE_SITE_KEY\` (build-time, inlined into the island), \`TURNSTILE_SECRET_KEY\`, and \`RESEND_API_KEY\` (runtime). The recipient address lives only in \`api/support.ts\`.`

- [ ] **Step 4: Commit and push**

```bash
git add CLAUDE.md docs/superpowers/plans/2026-07-01-support-form.md
git commit -m "docs: support form test command and deployment env vars"
git pull --rebase && git push
```

- [ ] **Step 5: Owner setup checklist (report to Ryan — cannot be done in code)**

1. Cloudflare dashboard → Turnstile → create widget for `roga.dev` (+ `www.roga.dev`, `localhost` for dev), Managed mode → copy site key + secret key.
2. Resend → verify domain `roga.dev` (DNS records) → create API key.
3. Vercel project → Settings → Environment Variables (all environments): `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`. Redeploy.
4. Production smoke test: submit the form on roga.dev/support, confirm email arrives at ryan@roga.dev with working Reply-To.

---

## Self-review notes

- Spec coverage: page (T4), island (T3), function (T2), constants/validation (T1), footer (T4+T6), privacy (T5), terms (T6), env/setup + dist grep + testing (T7). `?product=` fallback behavior verified in T4 Step 4.
- Types consistent: `SupportSubmission`/`ValidationResult` defined once in T1, consumed in T2; JSON contract `{ ok } | { error }` matches between T2 and T3.
- No placeholders; all code complete.
