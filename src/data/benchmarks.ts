/**
 * Data for the /labs/benchmarks page. Hand-edited; intentionally a plain typed
 * module (not a content collection) to match the src/consts.ts idiom.
 */

export type Provider = 'anthropic' | 'openai' | 'google';

/**
 * A single dated observation about a model. A model accumulates these over time;
 * the Notes section renders them newest-first. Add via the writing-benchmark-notes
 * skill rather than hand-editing, so the voice stays consistent.
 */
export interface ModelNote {
	/** ISO date (YYYY-MM-DD) the note was written. Drives newest-first ordering. */
	date: string;
	/** The note itself — a concise, measured assessment. */
	body: string;
}

export interface ModelScore {
	/** Which vendor ships the model — drives the provider filter + colour key. */
	provider: Provider;
	/** Display name, e.g. "Opus 4.8". Must be unique across BENCHMARK_MODELS (used as render/animation key). */
	label: string;
	/** Score in schmeckles — a made-up unit, scored on vibes. Compare relatively, not absolutely. */
	score: number;
	/** ISO date (YYYY-MM-DD). Powers the "Newest" sort. */
	releaseDate: string;
	/** Score still forming — rendered with stripes + the tentative animation. */
	tentative?: boolean;
	/**
	 * Model has been pulled from service (e.g. a vendor or government takedown). The
	 * score still stands as a record of how it performed, but the bar/dot renders
	 * muted with a "suspended" tag — present on the board, no longer reachable.
	 */
	suspended?: boolean;
	/** Dated commentary; surfaces in the page's Notes section, newest-first. */
	notes?: ModelNote[];
}

export interface ProviderMeta {
	label: string;
	/** When false, the filter chip renders disabled ("soon"). */
	available: boolean;
}

export const PROVIDERS: Record<Provider, ProviderMeta> = {
	anthropic: { label: 'Anthropic', available: true },
	openai: { label: 'OpenAI', available: true },
	google: { label: 'Google', available: true },
};

/** Headroom multiplier so the top bar never fills the full track (room to grow). */
export const SCALE_HEADROOM = 1.1;

/**
 * Ryan's personal agentic-coding ratings.
 * releaseDate values are the models' official vendor announcement dates.
 */
export const BENCHMARK_MODELS: ModelScore[] = [
	{ provider: 'anthropic', label: 'Opus 4.1', score: 73, releaseDate: '2025-08-05' },
	{ provider: 'anthropic', label: 'Sonnet 4.5', score: 75, releaseDate: '2025-09-29' },
	{ provider: 'anthropic', label: 'Haiku 4.5', score: 69, releaseDate: '2025-10-15' },
	{
		provider: 'anthropic',
		label: 'Opus 4.5',
		score: 80,
		releaseDate: '2025-11-24',
		notes: [
			{
				date: '2026-06-01',
				body: '4.5 was the first model where the quality crossed a line for me. Despite the high cost, it was the point I stopped worrying about constant re-prompting and rewriting, and trusted it enough to leave Cursor’s diff-review flow for editing directly in the file.',
			},
		],
	},
	{
		provider: 'anthropic',
		label: 'Opus 4.6',
		score: 85,
		releaseDate: '2026-02-05',
		notes: [
			{
				date: '2026-06-01',
				body: 'By 4.6, the reliability that started with 4.5 had settled in. These were the first models I’d trust without watching closely — before them, output needed constant correcting and rewriting. They still missed on genuinely hard tasks, but the limits were clear, and stepping in where they fell short felt fine.',
			},
		],
	},
	{
		provider: 'anthropic',
		label: 'Opus 4.7',
		score: 52,
		releaseDate: '2026-04-16',
		notes: [
			{
				date: '2026-06-01',
				body: '4.7 is the one release I couldn’t make work. It lost the thread constantly and made basic mistakes, and after enough wasted sessions I rolled back to 4.6 — taking its much smaller context window as the better trade. The only model here I actively stopped using.',
			},
		],
	},
	{
		provider: 'anthropic',
		label: 'Fable 5',
		score: 102,
		releaseDate: '2026-06-10',
		notes: [
			{
				date: '2026-06-13',
				body: 'Fable 5 was the best model I’d used — it tops this board on quality alone — though it ran more cautious than 4.8, declining work I expected it to take on. Three days after launch the US government suspended it on national-security grounds: a policy and access-control call, not a verdict on the model as a coding tool. I’m recording the score as I found it, before access was pulled.',
			},
			{
				date: '2026-06-22',
				body: 'Two weeks on, the suspension still reads to me as a policy and access call rather than a judgment on Fable 5 as a coding tool. Pulling a model three days after launch is the part that doesn’t sit right: anything this new ships with jailbreaks still waiting to be found, and the first few weeks in the open are exactly when a vendor finds and patches them. Fable 5 never got that window.',
			},
		],
	},
	{
		provider: 'anthropic',
		label: 'Opus 4.8',
		score: 98,
		releaseDate: '2026-05-28',
		notes: [
			{
				date: '2026-05-29',
				body: 'Opus 4.8 pairs well with Claude Code’s new Dynamic Workflow: the harness lets it write a small orchestration script that fans subagents out in parallel, pipes results between stages, has some generate while others judge, then synthesizes. I’d been approximating this by hand with commands and skills, so spawning one from inside a skill is the part I value most. The one cost: “workflow” is now a loaded keyword, and I keep escaping a word I use all day.',
			},
			{
				date: '2026-06-01',
				body: 'Bumping my tentative score to 99. Since release, 4.8 has been the most dependable model I’ve used, and by a clear margin my default. It rarely loses the thread, holds focus across long tasks without wandering or looping back through bad patches, and manages its own context well. I’m still looking for work it can’t finish — features like /goal lean on that reliability and hold up.',
			},
		],
	},
	{
		provider: 'anthropic',
		label: 'Opus 5',
		score: 35,
		releaseDate: '2026-07-24',
		notes: [
			{
				date: '2026-07-30',
				body: 'More time with Opus 5 has moved my score well down. It hallucinates constantly, drifts off course for no reason I can trace, and reports problems that are not there, then writes fixes for them that break unrelated parts of the codebase. The closing summaries are the other problem: long recaps of what it did, with real action items buried in the same flat prose instead of flagged as such. The length invites skimming, and even read closely the wording rarely conveys what it costs to move past one. As it stands, this makes Claude Code unusable as a product.',
			},
		],
	},
	{ provider: 'openai', label: 'o3-pro', score: 44, releaseDate: '2025-06-10' },
	{ provider: 'openai', label: 'Gippity 5', score: 40, releaseDate: '2025-08-07' },
	{ provider: 'openai', label: 'Gippity 5 Codex', score: 38, releaseDate: '2025-09-15' },
	{ provider: 'openai', label: 'Gippity 5.1', score: 60, releaseDate: '2025-11-12' },
	{ provider: 'openai', label: 'Gippity 5.2', score: 63, releaseDate: '2025-12-11' },
	{
		provider: 'openai',
		label: 'Gippity 5.4',
		score: 58,
		releaseDate: '2026-03-05',
		notes: [
			{
				date: '2026-06-01',
				body: 'I gave Gippity 5.4 a fair shot — back in Cursor I’d flip between it and other models to see where each one fit. It was decent at prose until it wasn’t: the OpenAI models tend to over-produce, padding answers with volume rather than substance. By the time 4.5 landed, I’d stopped reaching for them.',
			},
		],
	},
	{ provider: 'google', label: 'Gemini 2.5 Deep Think', score: 48, releaseDate: '2025-08-01' },
	{ provider: 'google', label: 'Gemini 3 Pro', score: 68, releaseDate: '2025-11-18' },
	{ provider: 'google', label: 'Gemini 3 Flash', score: 58, releaseDate: '2025-12-17' },
	{
		provider: 'google',
		label: 'Gemini 3.1',
		score: 72,
		releaseDate: '2026-02-19',
		notes: [
			{
				date: '2026-06-01',
				body: 'I still like Gemini 3.1 — I just don’t reach for it much in coding, only because Claude and Claude Code are where the power is for me right now. On value it’s hard to beat, and the quality-to-cost holds up. It doesn’t hit the ceiling I find in the top Claude models, but it stays a genuinely good option.',
			},
		],
	},
];
