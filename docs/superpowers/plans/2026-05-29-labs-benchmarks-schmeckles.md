# Labs · Schmeckle Benchmarks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an unlisted `/labs/benchmarks` page that displays Ryan's personal, hands-on AI-coding-model ratings ("schmeckles") as an interactive, on-brand chart.

**Architecture:** A static Astro page (`Base` layout, `noindex`) supplies typed seed data to a single hydrated Svelte 5 island. The island owns all interactivity — provider filter (multi-select), sort (score/newest), and view (ranked bars / dot plot) — with two presentational child components (`BarsView`, `DotsView`) it switches between. Bars scale to `maxScore × 1.1` (10% headroom); tentative scores "breathe" and scramble-then-settle. A visually-hidden `<table>` is the accessible source of truth; the visual chart is `aria-hidden`.

**Tech Stack:** Astro 6, Svelte 5 (runes mode), Tailwind v4 design tokens (consumed as CSS custom properties inside scoped Svelte styles), TypeScript.

**Testing strategy:** This repo has **no unit-test runner** (no Vitest); its established quality gates are `pnpm check`, `pnpm lint`, `pnpm format:check`, and `pnpm build`. Per the "follow existing patterns" + YAGNI rules, this plan does **not** introduce a test framework. Each task is verified with those gates plus targeted manual checks in `pnpm dev`. The final task runs the full `pnpm ready` gate, a production `pnpm build`, and a manual a11y/responsive pass.

**Reference spec:** `docs/superpowers/specs/2026-05-29-labs-benchmarks-schmeckles-design.md`

---

## File Structure

| File                                        | Responsibility                                                                                                                            |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/benchmarks.ts`                    | **Create** — types (`Provider`, `ModelScore`, `ProviderMeta`), provider registry, seed data, `SCALE_HEADROOM` constant. Data only, no UI. |
| `src/components/labs/BarsView.svelte`       | **Create** — presentational ranked-bars view + tentative breathing/scramble animation.                                                    |
| `src/components/labs/DotsView.svelte`       | **Create** — presentational dot-plot view with open-ended axis.                                                                           |
| `src/components/labs/SchmeckleChart.svelte` | **Create** — the island: filter/sort/view state, controls, legend, accessible table, switches between the two views.                      |
| `src/pages/labs/benchmarks.astro`           | **Create** — page shell (hero copy, schmeckle gloss, Notes section, footer microcopy), mounts the island via `client:visible`.            |

No changes to nav, layouts, or `global.css` are required. `Base.astro` already exposes a `noindex` prop.

---

## Task 1: Benchmark data module

**Files:**

- Create: `src/data/benchmarks.ts`

- [ ] **Step 1: Write the data module**

```ts
/**
 * Data for the /labs/benchmarks page. Hand-edited; intentionally a plain typed
 * module (not a content collection) to match the src/consts.ts idiom.
 */

export type Provider = 'anthropic' | 'openai' | 'google';

export interface ModelScore {
	/** Which vendor ships the model — drives the provider filter + colour key. */
	provider: Provider;
	/** Display name, e.g. "Opus 4.8". */
	label: string;
	/** Score in schmeckles. Unit of indeterminate worth; compare relatively. */
	score: number;
	/** ISO date (YYYY-MM-DD). Powers the "Newest" sort. */
	releaseDate: string;
	/** Score still forming — rendered with stripes + the tentative animation. */
	tentative?: boolean;
	/** Optional rationale; surfaces in the page's Notes section. */
	note?: string;
}

export interface ProviderMeta {
	label: string;
	/** When false, the filter chip renders disabled ("soon"). */
	available: boolean;
}

export const PROVIDERS: Record<Provider, ProviderMeta> = {
	anthropic: { label: 'Anthropic', available: true },
	openai: { label: 'OpenAI', available: false },
	google: { label: 'Google', available: false },
};

/** Headroom multiplier so the top bar never fills the full track (room to grow). */
export const SCALE_HEADROOM = 1.1;

/**
 * Ryan's personal agentic-coding ratings.
 * NOTE: releaseDate values are PLACEHOLDERS pending confirmation — correct before merge.
 */
export const BENCHMARK_MODELS: ModelScore[] = [
	{ provider: 'anthropic', label: 'Opus 4.5', score: 80, releaseDate: '2025-11-24' },
	{ provider: 'anthropic', label: 'Opus 4.6', score: 85, releaseDate: '2026-01-28' },
	{ provider: 'anthropic', label: 'Opus 4.7', score: 52, releaseDate: '2026-03-25' },
	{
		provider: 'anthropic',
		label: 'Opus 4.8',
		score: 91,
		releaseDate: '2026-05-20',
		tentative: true,
	},
];
```

- [ ] **Step 2: Type-check**

Run: `pnpm check`
Expected: PASS — no errors in `src/data/benchmarks.ts`.

- [ ] **Step 3: Format & lint**

Run: `pnpm format && pnpm lint:fast`
Expected: file formatted, no lint errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/benchmarks.ts
git commit -m "feat(labs): add schmeckle benchmark data module"
```

---

## Task 2: BarsView component (ranked bars + tentative animation)

**Files:**

- Create: `src/components/labs/BarsView.svelte`

This is presentational: it receives already-sorted models and the scale max, renders one bar per model, and animates tentative rows. It reads design tokens via global CSS custom properties (defined in `src/styles/global.css`), so no Tailwind classes are required here.

- [ ] **Step 1: Write the component**

```svelte
<script lang="ts">
	import type { ModelScore, Provider } from '../../data/benchmarks';

	interface Props {
		/** Already filtered + sorted by the parent. */
		models: ModelScore[];
		/** maxVisibleScore * SCALE_HEADROOM. */
		scaleMax: number;
		/** Resolves a bar colour for a provider (accent when single-provider). */
		colorFor: (p: Provider) => string;
	}
	let { models, scaleMax, colorFor }: Props = $props();

	// Per-tentative-row animated state, keyed by model label.
	let anim = $state<Record<string, { value: number; offset: number }>>({});
	// Gate the initial grow transition.
	let mounted = $state(false);

	function baseWidth(score: number): number {
		return (score / scaleMax) * 100;
	}

	function displayValue(m: ModelScore): number {
		return m.tentative ? (anim[m.label]?.value ?? m.score) : m.score;
	}

	function displayWidth(m: ModelScore): number {
		if (!mounted) return 0;
		const offset = m.tentative ? (anim[m.label]?.offset ?? 0) : 0;
		return baseWidth(m.score) + offset;
	}

	$effect(() => {
		mounted = true;
	});

	$effect(() => {
		const tentatives = models.filter((m) => m.tentative);
		if (tentatives.length === 0) {
			anim = {};
			return;
		}

		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduce) {
			// Settle immediately; no motion.
			anim = Object.fromEntries(tentatives.map((m) => [m.label, { value: m.score, offset: 0 }]));
			return;
		}

		const SCRAMBLE = 1400;
		const HOLD = 3500;
		const CYCLE = SCRAMBLE + HOLD;
		const t0 = performance.now();
		let raf = 0;

		function frame(now: number) {
			const next: Record<string, { value: number; offset: number }> = {};
			tentatives.forEach((m, i) => {
				// Stagger phases so multiple tentatives don't move in lockstep.
				const el = (now - t0 + i * 800) % CYCLE;
				const offset = Math.sin(el / 520) * 1.2; // gentle ±1.2% "breathing"
				let value = m.score;
				if (el < SCRAMBLE) {
					const p = el / SCRAMBLE;
					const spread = Math.round(16 * (1 - p));
					value = spread === 0 ? m.score : m.score + Math.floor(Math.sin(el / 45) * spread);
				}
				next[m.label] = { value, offset };
			});
			anim = next;
			raf = requestAnimationFrame(frame);
		}
		raf = requestAnimationFrame(frame);
		return () => cancelAnimationFrame(raf);
	});
</script>

<div class="chart" aria-hidden="true">
	{#each models as m (m.label)}
		<div class="row">
			<span class="label">{m.label}</span>
			<div class="track">
				<div
					class="fill"
					class:tentative={m.tentative}
					style="width: {displayWidth(m)}%; --c: {colorFor(m.provider)};"
				>
					<span class="val">{displayValue(m)}&nbsp;◊</span>
				</div>
			</div>
		</div>
	{/each}
</div>

<style>
	.chart {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.row {
		display: grid;
		grid-template-columns: 5rem 1fr;
		align-items: center;
		gap: 0.875rem;
	}
	.label {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--color-fg);
	}
	.track {
		position: relative;
		height: 2rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: repeating-linear-gradient(45deg, #141417 0 6px, #0e0e10 6px 12px);
	}
	.fill {
		position: absolute;
		inset: 0 auto 0 0;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding-right: 0.625rem;
		border-radius: calc(var(--radius-sm) - 1px) 0 0 calc(var(--radius-sm) - 1px);
		background: var(--c);
		will-change: width;
	}
	/* Settled bars grow on mount; tentative bars are driven frame-by-frame. */
	.fill:not(.tentative) {
		transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.fill.tentative {
		background: repeating-linear-gradient(
			45deg,
			var(--c) 0 9px,
			color-mix(in oklab, var(--c) 70%, #000) 9px 18px
		);
	}
	.val {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-weight: 600;
		color: #fff;
	}
	@media (prefers-reduced-motion: reduce) {
		.fill:not(.tentative) {
			transition: none;
		}
	}
</style>
```

- [ ] **Step 2: Lint the component**

Run: `pnpm format && pnpm lint:fast`
Expected: no errors. (Svelte type errors surface in the build at Task 5; isolated `astro check` does not deep-check unused islands.)

- [ ] **Step 3: Commit**

```bash
git add src/components/labs/BarsView.svelte
git commit -m "feat(labs): add ranked BarsView with tentative animation"
```

---

## Task 3: DotsView component (open-ended number line)

**Files:**

- Create: `src/components/labs/DotsView.svelte`

- [ ] **Step 1: Write the component**

```svelte
<script lang="ts">
	import type { ModelScore, Provider } from '../../data/benchmarks';

	interface Props {
		models: ModelScore[];
		scaleMax: number;
		colorFor: (p: Provider) => string;
	}
	let { models, scaleMax, colorFor }: Props = $props();

	function leftPct(score: number): number {
		return (score / scaleMax) * 100;
	}
</script>

<div class="plot" aria-hidden="true">
	<div class="axis">
		{#each models as m, i (m.label)}
			<div
				class="dot"
				class:tent={m.tentative}
				class:below={i % 2 === 1}
				style="left: {leftPct(m.score)}%; --c: {colorFor(m.provider)};"
			>
				<span class="lbl">{m.label} <span class="v">{m.score}</span></span>
				<span class="pt"></span>
			</div>
		{/each}
		<span class="cap">∞ ?</span>
	</div>
</div>

<style>
	.plot {
		padding: 3rem 0.5rem 3rem;
	}
	.axis {
		position: relative;
		height: 1px;
		background: var(--color-border-strong);
	}
	.cap {
		position: absolute;
		right: -0.25rem;
		top: -0.5rem;
		padding-left: 0.5rem;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--color-fg-subtle);
		background: var(--color-bg);
	}
	.dot {
		position: absolute;
		top: 50%;
		transform: translate(-50%, -50%);
	}
	.dot .pt {
		display: block;
		width: 12px;
		height: 12px;
		margin: 0 auto;
		border-radius: 50%;
		background: var(--c);
		border: 2px solid var(--color-bg);
		box-shadow: 0 0 0 1px var(--c);
	}
	.dot.tent .pt {
		background: var(--color-bg);
	}
	.dot .lbl {
		position: absolute;
		bottom: 1rem;
		left: 50%;
		transform: translateX(-50%);
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: var(--text-2xs);
		color: var(--color-fg);
	}
	.dot.below .lbl {
		bottom: auto;
		top: 1rem;
	}
	.dot .v {
		color: var(--color-fg-subtle);
	}
</style>
```

- [ ] **Step 2: Lint the component**

Run: `pnpm format && pnpm lint:fast`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/labs/DotsView.svelte
git commit -m "feat(labs): add open-ended DotsView number line"
```

---

## Task 4: SchmeckleChart island (state, controls, legend, a11y table)

**Files:**

- Create: `src/components/labs/SchmeckleChart.svelte`

This is the hydrated island. It owns filter/sort/view state, renders the controls, the legend, a visually-hidden accessible table, and switches between `BarsView` and `DotsView`.

- [ ] **Step 1: Write the component**

```svelte
<script lang="ts">
	import type { ModelScore, Provider, ProviderMeta } from '../../data/benchmarks';
	import { SCALE_HEADROOM } from '../../data/benchmarks';
	import BarsView from './BarsView.svelte';
	import DotsView from './DotsView.svelte';

	interface Props {
		models: ModelScore[];
		providers: Record<Provider, ProviderMeta>;
	}
	let { models, providers }: Props = $props();

	const providerKeys = Object.keys(providers) as Provider[];
	const availableKeys = providerKeys.filter((p) => providers[p].available);

	// Provider colour key — tints of the single accent hue (honours "one accent").
	const PROVIDER_TINT: Record<Provider, string> = {
		anthropic: 'var(--color-accent)',
		openai: '#8b94ff',
		google: '#c0c4ff',
	};

	let selected = $state<Set<Provider>>(new Set(availableKeys));
	let sort = $state<'score' | 'newest'>('score');
	let view = $state<'bars' | 'dots'>('bars');

	function toggleProvider(p: Provider) {
		if (!providers[p].available) return;
		const next = new Set(selected);
		if (next.has(p)) next.delete(p);
		else next.add(p);
		selected = next;
	}

	const visible = $derived(
		models
			.filter((m) => selected.has(m.provider))
			.sort((a, b) =>
				sort === 'score' ? b.score - a.score : b.releaseDate.localeCompare(a.releaseDate),
			),
	);

	const scaleMax = $derived(
		visible.length ? Math.max(...visible.map((m) => m.score)) * SCALE_HEADROOM : 1,
	);

	const multiProvider = $derived(new Set(visible.map((m) => m.provider)).size > 1);

	function colorFor(p: Provider): string {
		return multiProvider ? PROVIDER_TINT[p] : 'var(--color-accent)';
	}
</script>

<div class="wrap">
	<!-- Controls -->
	<div class="controls">
		<div class="group" role="group" aria-label="Filter by provider">
			<span class="glabel">Provider</span>
			{#each providerKeys as p (p)}
				<button
					type="button"
					class="chip"
					class:on={selected.has(p)}
					aria-pressed={selected.has(p)}
					disabled={!providers[p].available}
					onclick={() => toggleProvider(p)}
				>
					{providers[p].label}{providers[p].available ? '' : ' · soon'}
				</button>
			{/each}
		</div>

		<div class="group" role="group" aria-label="Sort order">
			<span class="glabel">Sort</span>
			<div class="seg">
				<button
					type="button"
					class:on={sort === 'score'}
					aria-pressed={sort === 'score'}
					onclick={() => (sort = 'score')}>Score</button
				>
				<button
					type="button"
					class:on={sort === 'newest'}
					aria-pressed={sort === 'newest'}
					onclick={() => (sort = 'newest')}>Newest</button
				>
			</div>
		</div>

		<div class="group" role="group" aria-label="Chart view">
			<span class="glabel">View</span>
			<div class="seg">
				<button
					type="button"
					class:on={view === 'bars'}
					aria-pressed={view === 'bars'}
					onclick={() => (view = 'bars')}>Bars</button
				>
				<button
					type="button"
					class:on={view === 'dots'}
					aria-pressed={view === 'dots'}
					onclick={() => (view = 'dots')}>Dots</button
				>
			</div>
		</div>
	</div>

	<!-- Accessible source of truth (screen readers). Visual chart below is aria-hidden. -->
	<table class="sr-only">
		<caption>AI coding models ranked by schmeckle score. Higher is better.</caption>
		<thead>
			<tr><th>Model</th><th>Provider</th><th>Schmeckles</th><th>Status</th></tr>
		</thead>
		<tbody>
			{#each visible as m (m.label)}
				<tr>
					<td>{m.label}</td>
					<td>{providers[m.provider].label}</td>
					<td>{m.score}</td>
					<td>{m.tentative ? 'Tentative — score still forming' : 'Settled'}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<!-- Visual chart -->
	<div class="view">
		{#if visible.length === 0}
			<p class="empty">No models selected.</p>
		{:else if view === 'bars'}
			<BarsView models={visible} {scaleMax} {colorFor} />
		{:else}
			<DotsView models={visible} {scaleMax} {colorFor} />
		{/if}
	</div>

	<!-- Legend -->
	<div class="legend">
		<span class="item"><span class="dia">◊</span> = schmeckles</span>
		<span class="item"><span class="sw solid"></span> settled score</span>
		<span class="item"><span class="sw striped"></span> tentative — still forming an opinion</span>
		{#if multiProvider}
			{#each providerKeys.filter((p) => selected.has(p)) as p (p)}
				<span class="item"
					><span class="sw" style="background: {PROVIDER_TINT[p]}"></span>
					{providers[p].label}</span
				>
			{/each}
		{/if}
	</div>
</div>

<style>
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 1.25rem;
		align-items: center;
		padding-bottom: 1.25rem;
		border-bottom: 1px solid var(--color-border);
	}
	.group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.glabel {
		font-family: var(--font-mono);
		font-size: var(--text-2xs);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-fg-subtle);
	}
	.chip {
		min-height: 2.75rem; /* 44px touch target */
		display: inline-flex;
		align-items: center;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		padding: 0 0.75rem;
		border-radius: 999px;
		border: 1px solid var(--color-border-strong);
		color: var(--color-fg-muted);
		background: transparent;
		cursor: pointer;
	}
	.chip.on {
		background: color-mix(in oklab, var(--color-accent) 18%, transparent);
		border-color: var(--color-accent);
		color: var(--color-fg);
	}
	.chip:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.seg {
		display: inline-flex;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		overflow: hidden;
	}
	.seg button {
		min-height: 2.75rem;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		padding: 0 0.75rem;
		background: transparent;
		color: var(--color-fg-muted);
		border: 0;
		cursor: pointer;
	}
	.seg button.on {
		background: var(--color-bg-elevated);
		color: var(--color-fg);
	}
	.view {
		margin: 1.5rem 0 0;
	}
	.empty {
		padding: 2rem 0;
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		color: var(--color-fg-subtle);
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 1.125rem;
		margin-top: 1.125rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border);
		font-family: var(--font-mono);
		font-size: var(--text-2xs);
		color: var(--color-fg-subtle);
	}
	.item {
		display: inline-flex;
		align-items: center;
		gap: 0.4375rem;
	}
	.dia {
		color: var(--color-fg);
	}
	.sw {
		width: 22px;
		height: 12px;
		border-radius: var(--radius-xs);
		flex: none;
	}
	.sw.solid {
		background: var(--color-accent);
	}
	.sw.striped {
		background: repeating-linear-gradient(
			45deg,
			var(--color-accent) 0 5px,
			color-mix(in oklab, var(--color-accent) 70%, #000) 5px 10px
		);
	}
</style>
```

- [ ] **Step 2: Lint**

Run: `pnpm format && pnpm lint:fast`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/labs/SchmeckleChart.svelte
git commit -m "feat(labs): add SchmeckleChart island with controls, legend, a11y table"
```

---

## Task 5: The page

**Files:**

- Create: `src/pages/labs/benchmarks.astro`

- [ ] **Step 1: Write the page**

```astro
---
import Base from '../../layouts/Base.astro';
import SchmeckleChart from '../../components/labs/SchmeckleChart.svelte';
import { BENCHMARK_MODELS, PROVIDERS } from '../../data/benchmarks';

const title = 'Benchmarks · Roga Digital';
const description =
	"Ryan Roga's personal, hands-on ratings of AI coding models — scored in schmeckles.";

const noted = BENCHMARK_MODELS.filter((m) => m.note);
---

<Base {title} {description} noindex>
	<!-- Hero -->
	<section class="border-b border-border">
		<div class="mx-auto w-full max-w-page px-6 sm:px-8">
			<div class="pt-20 pb-16 sm:pt-28 sm:pb-20">
				<p class="font-mono text-2xs tracking-[0.18em] text-fg-subtle uppercase">
					Labs · Benchmarks
				</p>
				<h1 class="mt-6 max-w-3xl text-4xl font-medium tracking-tight text-balance sm:text-5xl">
					Agentic coding, scored in schmeckles
				</h1>
				<p class="mt-6 max-w-2xl text-lg text-fg-muted text-pretty">
					My own hands-on ratings of AI coding models, measured in{' '}
					<abbr
						title="A unit of value of indeterminate worth."
						class="cursor-help border-b border-dashed border-border-strong text-fg no-underline"
					>
						schmeckles&nbsp;◊
					</abbr>
					. The absolute value is unknowable — read them side by side, not against a ceiling.
				</p>
			</div>
		</div>
	</section>

	<!-- Chart island -->
	<section class="mx-auto w-full max-w-page px-6 py-12 sm:px-8 sm:py-16">
		<SchmeckleChart client:visible models={BENCHMARK_MODELS} providers={PROVIDERS} />
	</section>

	<!-- Notes -->
	<section class="border-t border-border">
		<div class="mx-auto w-full max-w-page px-6 py-12 sm:px-8 sm:py-16">
			<h2 class="text-lg font-medium tracking-tight text-fg">
				Notes <span class="text-sm font-normal text-fg-subtle">(for those who really care)</span>
			</h2>
			{noted.length === 0 ? (
				<p class="mt-3 max-w-2xl text-sm text-fg-muted text-pretty">
					Nothing to explain yet. When a score needs context, it lands here.
				</p>
			) : (
				<dl class="mt-4 grid gap-4">
					{noted.map((m) => (
						<div class="grid gap-1">
							<dt class="font-mono text-xs text-fg">{m.label}</dt>
							<dd class="max-w-2xl text-sm text-fg-muted text-pretty">{m.note}</dd>
						</div>
					))}
				</dl>
			)}
			<p class="mt-8 font-mono text-2xs text-fg-subtle">
				◊ schmeckles · scores are subjective &amp; reflect my own hands-on use.
			</p>
		</div>
	</section>
</Base>
```

- [ ] **Step 2: Type-check the full project**

Run: `pnpm check`
Expected: PASS — no errors. (This now resolves the island import and props.)

- [ ] **Step 3: Manual check in dev**

Run: `pnpm dev`, open `http://localhost:4321/labs/benchmarks`. Verify:

- Bars render sorted high→low; Opus 4.8 leads at ~91% width (headroom visible on the right).
- Opus 4.8 bar breathes; its number scrambles then settles on 91, holds, repeats.
- Toggling **Newest** reorders to 4.8, 4.7, 4.6, 4.5 (by release date).
- Toggling **Dots** shows the number-line view with the `∞ ?` cap.
- OpenAI / Google chips are disabled and labelled "· soon".
- Deselecting Anthropic shows "No models selected."

- [ ] **Step 4: Commit**

```bash
git add src/pages/labs/benchmarks.astro
git commit -m "feat(labs): add /labs/benchmarks page (unlisted, noindex)"
```

---

## Task 6: Full quality gate, build, and a11y/responsive pass

**Files:** none (verification only)

- [ ] **Step 1: Run the repo's full gate**

Run: `pnpm ready`
Expected: format + lint + `astro check` all pass with no errors.

- [ ] **Step 2: Production build**

Run: `pnpm build`
Expected: build succeeds; `dist/labs/benchmarks/index.html` is emitted. (This is where the Svelte compiler validates `BarsView`/`DotsView`/`SchmeckleChart`.)

- [ ] **Step 3: Confirm noindex shipped**

Search the built file for the robots tag (PowerShell):
Run: `Select-String -Path dist/labs/benchmarks/index.html -Pattern noindex`
Expected: a `<meta name="robots" content="noindex…">` line is matched (emitted by `Base`/`BaseHead` from the `noindex` prop). If absent, inspect `src/components/BaseHead.astro` to confirm how it consumes `noindex` and adjust the page accordingly.

- [ ] **Step 4: Manual responsive + a11y pass** (in `pnpm preview` after build)

- Resize from 320px → 1920px: no horizontal scroll; controls wrap; bars stay single-column and legible.
- Keyboard: Tab reaches every chip and segmented button; focus ring visible; Enter/Space toggles them.
- Enable OS "reduce motion": the tentative bar is static at 91 with stripes (no breathing/scramble), and settled bars do not animate width.
- Screen reader / DOM check: the visually-hidden `<table>` lists all visible models with status; the visual chart is `aria-hidden`.
- Touch targets: chips and segmented buttons are ≥ 44px tall.

- [ ] **Step 5: Final confirmation**

No commit needed if Steps 1–4 produced no changes. If formatting adjusted files, commit:

```bash
git add -A
git commit -m "chore(labs): formatting after benchmarks build"
```

---

## Open item (carry into review)

- **Release dates** in `src/data/benchmarks.ts` are placeholders. Confirm/correct the four Opus dates before merging to `main` (only affects the "Newest" sort order).
