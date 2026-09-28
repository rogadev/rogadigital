import { describe, expect, it } from 'vitest';
import { isNavItemActive } from '../src/lib/nav-active';

describe('isNavItemActive', () => {
	it('matches an exact section path', () => {
		expect(isNavItemActive('/tools/', '/tools/')).toBe(true);
	});

	it('matches a nested sub-page under a section', () => {
		expect(isNavItemActive('/tools/orc-pack/', '/tools/')).toBe(true);
		expect(isNavItemActive('/work/some-case/', '/work/')).toBe(true);
		expect(isNavItemActive('/insights/some-post/', '/insights/')).toBe(true);
	});

	it('handles hrefs and paths missing a trailing slash', () => {
		expect(isNavItemActive('/tools', '/tools/')).toBe(true);
		expect(isNavItemActive('/tools/', '/tools')).toBe(true);
		expect(isNavItemActive('/tools/orc-pack', '/tools')).toBe(true);
	});

	it('does not match an unrelated section', () => {
		expect(isNavItemActive('/services/', '/tools/')).toBe(false);
	});

	it('does not match a section whose name merely starts the same way', () => {
		expect(isNavItemActive('/tools-extra/', '/tools/')).toBe(false);
	});

	it('matches home only on an exact path, never as an ancestor', () => {
		expect(isNavItemActive('/', '/')).toBe(true);
		expect(isNavItemActive('/about/', '/')).toBe(false);
		expect(isNavItemActive('/tools/orc-pack/', '/')).toBe(false);
	});
});
