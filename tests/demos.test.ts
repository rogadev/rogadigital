import { describe, expect, it, vi } from 'vitest';
import {
	demoPage,
	demoSite,
	frameSrc,
	probeDemo,
	rendersDark,
	snapshotCaptures,
	snapshotPath,
	themedUrl,
} from '../src/lib/demos';

const dispatch = demoSite('dispatch');
const puntledge = demoSite('puntledge');

describe('themedUrl', () => {
	it('adds the theme parameter to a demo URL', () => {
		expect(themedUrl('https://trips.roga.dev/preview/board', 'dark')).toBe(
			'https://trips.roga.dev/preview/board?theme=dark',
		);
	});

	it('replaces a theme the URL already carries', () => {
		expect(themedUrl('https://trips.roga.dev/preview/board?theme=dark', 'light')).toBe(
			'https://trips.roga.dev/preview/board?theme=light',
		);
	});
});

describe('snapshotPath', () => {
	it('gives a themed page a separate dark snapshot', () => {
		const board = demoPage(dispatch, 'dispatch-board');
		expect(snapshotPath(board)).toBe('/demos/dispatch-board.html');
		expect(snapshotPath(board, 'light')).toBe('/demos/dispatch-board.html');
		expect(snapshotPath(board, 'dark')).toBe('/demos/dispatch-board-dark.html');
	});

	it('keeps one snapshot for a page that does not follow the theme', () => {
		expect(snapshotPath(demoPage(puntledge, 'puntledge-home'), 'dark')).toBe(
			'/demos/puntledge-home.html',
		);
	});
});

describe('snapshotCaptures', () => {
	it('captures each Dispatch page in both themes', () => {
		expect(snapshotCaptures(dispatch)).toEqual([
			{
				id: 'dispatch-board',
				url: 'https://trips.roga.dev/preview/board?theme=light',
				theme: 'light',
			},
			{
				id: 'dispatch-board-dark',
				url: 'https://trips.roga.dev/preview/board?theme=dark',
				theme: 'dark',
			},
			{
				id: 'dispatch-driver',
				url: 'https://trips.roga.dev/preview/driver?theme=light',
				theme: 'light',
			},
			{
				id: 'dispatch-driver-dark',
				url: 'https://trips.roga.dev/preview/driver?theme=dark',
				theme: 'dark',
			},
		]);
	});

	it('captures an unthemed page once, at its plain URL', () => {
		expect(snapshotCaptures(puntledge)[0]).toEqual({
			id: 'puntledge-home',
			url: 'https://puntledge.ca/demo/home',
		});
	});
});

describe('rendersDark', () => {
	it('detects the dark class on the root element', () => {
		expect(rendersDark('<!doctype html><html lang="en" class="dark" style="x">')).toBe(true);
		expect(rendersDark('<html class="theme dark">')).toBe(true);
	});

	it('ignores a light page and a dark class below the root', () => {
		expect(rendersDark('<html lang="en"><body class="dark">')).toBe(false);
		expect(rendersDark('<html class="darker">')).toBe(false);
		expect(rendersDark('no html at all')).toBe(false);
	});

	it('reads the class list as whole tokens', () => {
		expect(rendersDark('<html class="no-dark">')).toBe(false);
		expect(rendersDark('<html class="dark-mode-off">')).toBe(false);
		expect(rendersDark('<html class="light dark">')).toBe(true);
		expect(rendersDark("<html class='dark'>")).toBe(true);
	});
});

describe('frameSrc', () => {
	const live = 'https://trips.roga.dev/preview/board';
	const themed = { liveSrc: live, snapshotSrc: '/demos/b.html', themed: '' };

	it('asks a themed live frame for the current theme', () => {
		expect(frameSrc(themed, 'light')).toBe(`${live}?theme=light`);
		expect(frameSrc(themed, 'dark')).toBe(`${live}?theme=dark`);
	});

	it('shows an unthemed frame at its plain live URL', () => {
		expect(frameSrc({ liveSrc: live, snapshotSrc: '/demos/b.html' }, 'light')).toBe(live);
	});

	it('shows the dark snapshot in dark mode once one exists', () => {
		const state = { ...themed, snapshotDarkSrc: '/demos/b-dark.html', showing: 'snapshot' };
		expect(frameSrc(state, 'dark')).toBe('/demos/b-dark.html');
		expect(frameSrc(state, 'light')).toBe('/demos/b.html');
	});

	it('falls back to the light snapshot in dark mode without a dark one', () => {
		expect(frameSrc({ ...themed, showing: 'snapshot' }, 'dark')).toBe('/demos/b.html');
	});

	it('ignores a dark snapshot on an unthemed frame', () => {
		const state = {
			liveSrc: live,
			snapshotSrc: '/demos/b.html',
			snapshotDarkSrc: '/demos/b-dark.html',
			showing: 'snapshot',
		};
		expect(frameSrc(state, 'dark')).toBe('/demos/b.html');
	});
});

const answer = (status: number) => Promise.resolve(new Response(null, { status }));

describe('probeDemo', () => {
	const url = 'https://trips.roga.dev/preview/board';

	it('counts a 2xx answer as up', async () => {
		const fetchStub = vi.fn<typeof fetch>(() => answer(200));
		expect(await probeDemo(url, fetchStub)).toBe(true);
		expect(fetchStub).toHaveBeenCalledOnce();
	});

	it('counts a 404 or 500 answer as down', async () => {
		expect(
			await probeDemo(
				url,
				vi.fn<typeof fetch>(() => answer(404)),
			),
		).toBe(false);
		expect(
			await probeDemo(
				url,
				vi.fn<typeof fetch>(() => answer(500)),
			),
		).toBe(false);
	});

	it('counts a timeout as down without a second request', async () => {
		const fetchStub = vi.fn<typeof fetch>(() =>
			Promise.reject(new DOMException('timed out', 'TimeoutError')),
		);
		expect(await probeDemo(url, fetchStub)).toBe(false);
		expect(fetchStub).toHaveBeenCalledOnce();
	});

	it('counts a host that answers without CORS as up', async () => {
		const fetchStub = vi
			.fn<typeof fetch>()
			.mockRejectedValueOnce(new TypeError('Failed to fetch'))
			.mockResolvedValueOnce(new Response(null, { status: 200 }));
		expect(await probeDemo(url, fetchStub)).toBe(true);
		expect(fetchStub).toHaveBeenCalledTimes(2);
		expect(fetchStub.mock.calls[1]?.[1]?.mode).toBe('no-cors');
	});

	it('counts an unreachable host as down', async () => {
		const fetchStub = vi.fn<typeof fetch>(() => Promise.reject(new TypeError('Failed to fetch')));
		expect(await probeDemo(url, fetchStub)).toBe(false);
		expect(fetchStub).toHaveBeenCalledTimes(2);
	});
});
