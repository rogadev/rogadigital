import { describe, expect, it } from 'vitest';
import { deriveOgPath } from '../src/lib/og-path';
import { DEFAULT_OG, OG_PAGES, STATIC_PAGE_OGS } from '../src/lib/og-pages';

// Mirrors the titleSize ladder in src/lib/og.ts (76 / 64 / 56px, stepping at
// 50 and 80 chars). Kept as a literal here rather than importing og.ts,
// which pulls in satori/sharp and can't run under vitest.
function titleSizeFor(title: string): 76 | 64 | 56 {
	if (title.length > 80) return 56;
	if (title.length > 50) return 64;
	return 76;
}

describe('OG_PAGES / STATIC_PAGE_OGS stay in sync', () => {
	it('has a STATIC_PAGE_OGS entry for every OG_PAGES key, and vice versa', () => {
		const pageKeys = Object.keys(OG_PAGES).toSorted();
		const staticKeys = [...STATIC_PAGE_OGS].toSorted();
		expect(staticKeys).toEqual(pageKeys);
	});

	it('is not empty (a trivially-true comparison would hide real desync)', () => {
		expect(Object.keys(OG_PAGES).length).toBeGreaterThan(0);
	});
});

describe('deriveOgPath', () => {
	const cases: Array<[pathname: string, expected: string]> = [
		['/', '/og/default.png'],
		['/work/', '/og/work.png'],
		['/work/puntledge/', '/og/work/puntledge.png'],
		['/insights/why-this-stack/', '/og/insights/why-this-stack.png'],
		['/labs/apps/', '/og/default.png'],
		['/nowhere/', '/og/default.png'],
	];

	it.each(cases)('maps %s to %s', (pathname, expected) => {
		expect(deriveOgPath(pathname)).toBe(expected);
	});

	it('resolves every configured page key to its own PNG', () => {
		for (const key of STATIC_PAGE_OGS) {
			expect(deriveOgPath(`/${key}/`)).toBe(`/og/${key}.png`);
		}
	});
});

describe('OG title lengths land on the intended titleSize step', () => {
	// Every card is written to fit the large (76px) step (<= 50 chars) except
	// `resume`, whose title is a deliberately fuller credential line and
	// lands on the 64px step (51-80 chars). Update this map deliberately if
	// a title's intended step ever changes.
	const expectedSize: Record<string, 76 | 64 | 56> = {
		default: 76,
		about: 76,
		contact: 76,
		services: 76,
		resume: 64,
		work: 76,
		insights: 76,
		media: 76,
		support: 76,
		tools: 76,
	};

	it(`home / fallback card ("${DEFAULT_OG.title}") renders at ${expectedSize.default}px`, () => {
		expect(titleSizeFor(DEFAULT_OG.title)).toBe(expectedSize.default);
	});

	for (const [key, config] of Object.entries(OG_PAGES)) {
		it(`"${key}" card ("${config.title}") renders at ${expectedSize[key]}px`, () => {
			expect(expectedSize[key]).toBeDefined();
			expect(titleSizeFor(config.title)).toBe(expectedSize[key]);
		});
	}

	it('expectedSize covers every OG_PAGES key (no silently-skipped entry)', () => {
		const configured = Object.keys(OG_PAGES).toSorted();
		const asserted = Object.keys(expectedSize)
			.filter((k) => k !== 'default')
			.toSorted();
		expect(asserted).toEqual(configured);
	});
});
