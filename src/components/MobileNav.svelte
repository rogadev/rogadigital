<script lang="ts">
	import { onMount } from 'svelte';

	interface NavItem {
		href: string;
		label: string;
	}

	interface Props {
		items: NavItem[];
		currentPath: string;
	}

	const { items, currentPath }: Props = $props();
	let open = $state(false);

	function toggle() {
		open = !open;
	}

	function close() {
		open = false;
	}

	$effect(() => {
		if (typeof document === 'undefined') return;
		document.body.style.overflow = open ? 'hidden' : '';
	});

	onMount(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<button
	type="button"
	onclick={toggle}
	aria-label={open ? 'Close menu' : 'Open menu'}
	aria-expanded={open}
	class="grid h-7 w-7 place-items-center rounded-sm text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)]"
>
	{#if open}
		<svg
			width="14"
			height="14"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			aria-hidden="true"
		>
			<path d="M3 3l10 10M13 3L3 13" />
		</svg>
	{:else}
		<svg
			width="14"
			height="14"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			aria-hidden="true"
		>
			<path d="M2 4h12M2 8h12M2 12h12" />
		</svg>
	{/if}
</button>

{#if open}
	<button
		type="button"
		aria-label="Close menu"
		onclick={close}
		class="fixed inset-0 top-14 z-30 bg-[var(--color-bg)]/80 backdrop-blur-sm"
	></button>
	<nav
		aria-label="Mobile primary"
		class="fixed inset-x-0 top-14 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]"
	>
		<ul class="mx-auto flex max-w-page flex-col px-6 py-4 sm:px-8" role="list">
			{#each items as item (item.href)}
				{@const active = currentPath === item.href || currentPath.startsWith(item.href + '/')}
				<li>
					<a
						href={item.href}
						onclick={close}
						aria-current={active ? 'page' : undefined}
						class="flex items-center justify-between rounded-sm py-3 text-base transition-colors {active
							? 'text-[var(--color-fg)]'
							: 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'}"
					>
						{item.label}
						<span
							class="font-mono text-2xs tracking-[0.16em] text-[var(--color-fg-subtle)] uppercase"
						>
							→
						</span>
					</a>
				</li>
			{/each}
			<li class="mt-3 border-t border-[var(--color-border)] pt-4">
				<a
					href="/contact/"
					onclick={close}
					class="flex items-center justify-center rounded-md bg-[var(--color-fg)] px-4 py-3 text-sm font-medium text-[var(--color-bg)] transition-opacity hover:opacity-90"
				>
					Book a call
				</a>
			</li>
		</ul>
	</nav>
{/if}
