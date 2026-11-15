import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { THEME_COLOR, syncThemeColor } from './theme-color';

/** Stand-in for the two media-scoped metas app.html ships. */
function fakeRoot() {
	const metas = [{ content: 'light-default' }, { content: 'dark-default' }];
	const root = {
		querySelectorAll: (selector: string) => {
			expect(selector).toBe('meta[name="theme-color"]');
			return metas;
		}
	} as unknown as Pick<Document, 'querySelectorAll'>;
	return { metas, root };
}

describe('syncThemeColor', () => {
	it('points every theme-color meta at the dark header colour', () => {
		const { metas, root } = fakeRoot();
		syncThemeColor(true, root);
		expect(metas.map((m) => m.content)).toEqual([THEME_COLOR.dark, THEME_COLOR.dark]);
	});

	it('points every theme-color meta at the light header colour', () => {
		const { metas, root } = fakeRoot();
		syncThemeColor(false, root);
		expect(metas.map((m) => m.content)).toEqual([THEME_COLOR.light, THEME_COLOR.light]);
	});
});

describe('app.html', () => {
	const html = readFileSync(new URL('../../app.html', import.meta.url), 'utf8');

	it('repeats the same colours in its metas and pre-paint script', () => {
		expect(html).toContain(
			`<meta name="theme-color" content="${THEME_COLOR.light}" media="(prefers-color-scheme: light)" />`
		);
		expect(html).toContain(
			`<meta name="theme-color" content="${THEME_COLOR.dark}" media="(prefers-color-scheme: dark)" />`
		);
		expect(html).toContain(`dark ? '${THEME_COLOR.dark}' : '${THEME_COLOR.light}'`);
	});
});
