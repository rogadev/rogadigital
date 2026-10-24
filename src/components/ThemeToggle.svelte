<script lang="ts">
	import { onMount } from 'svelte';

	let theme = $state<'light' | 'dark'>('dark');
	let mounted = $state(false);

	onMount(() => {
		theme = document.documentElement.classList.contains('light') ? 'light' : 'dark';
		mounted = true;
	});

	let fadeTimer: ReturnType<typeof setTimeout> | undefined;

	function toggle() {
		theme = theme === 'dark' ? 'light' : 'dark';
		const root = document.documentElement;
		// Enable the cross-fade only for this switch (see `.theme-fade` in global.css).
		root.classList.add('theme-fade');
		clearTimeout(fadeTimer);
		fadeTimer = setTimeout(() => root.classList.remove('theme-fade'), 500);
		root.classList.toggle('light', theme === 'light');
		try {
			localStorage.setItem('theme', theme);
		} catch {
			/* ignore */
		}
	}
</script>

<button
	type="button"
	onclick={toggle}
	aria-label="Toggle color theme"
	title={mounted ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode` : 'Toggle theme'}
	class="grid h-7 w-7 place-items-center rounded-sm text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)]"
>
	{#if mounted && theme === 'dark'}
		<!-- Sun -->
		<svg
			width="14"
			height="14"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="8" cy="8" r="3" />
			<path
				d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.4 1.4M11.55 11.55l1.4 1.4M3.05 12.95l1.4-1.4M11.55 4.45l1.4-1.4"
			/>
		</svg>
	{:else}
		<!-- Moon -->
		<svg
			width="14"
			height="14"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7Z" />
		</svg>
	{/if}
</button>
