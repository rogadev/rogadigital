import { describe, expect, it } from 'vitest';
import {
	demoPage,
	demoSite,
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
});
