<script lang="ts">
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
	const canSubmit = $derived(status !== 'submitting' && token !== '');

	$effect(() => {
		if (!showProduct) return;
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
				// The normal widget is a fixed 300px wide and overflows narrow
				// viewports once card + page padding are subtracted.
				size: window.matchMedia('(max-width: 480px)').matches ? 'compact' : 'normal',
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
		script.addEventListener('load', render, { once: true });
		document.head.appendChild(script);
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		status = 'submitting';
		errorMessage = '';
		try {
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
			let body: { ok?: boolean; error?: string } = {};
			try {
				body = (await res.json()) as { ok?: boolean; error?: string };
			} catch {
				// Non-JSON response (e.g. platform error page) — fall through to the generic message.
			}
			if (!res.ok) throw new Error(body.error ?? 'Something went wrong — please try again.');
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
		class="relative flex flex-col gap-6 rounded-lg border border-border bg-bg p-8 sm:p-10"
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

		{#if showProduct}
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
		{/if}

		<div class="flex flex-col gap-2">
			<label for="support-message" class="text-sm font-medium text-fg">How can I help?</label>
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
