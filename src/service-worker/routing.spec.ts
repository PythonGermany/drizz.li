import { describe, expect, it } from 'vitest';

import { type RouteInput, strategyFor } from './routing';

const origin = 'https://drizz.li';
const precached = new Set(['/_app/immutable/entry/start.abc123.js', '/favicon.svg']);

const route = (href: string, overrides: Partial<RouteInput> = {}) =>
	strategyFor({
		url: new URL(href, origin),
		method: 'GET',
		mode: 'cors',
		origin,
		precached,
		...overrides
	});

describe('strategyFor', () => {
	it('bypasses cross-origin requests', () => {
		expect(route('https://api.open-meteo.com/v1/forecast?latitude=52')).toBe('bypass');
		expect(route('https://maps.open-meteo.com/', { mode: 'navigate' })).toBe('bypass');
	});

	it('bypasses non-GET requests', () => {
		expect(route('/favicon.svg', { method: 'HEAD' })).toBe('bypass');
		expect(route('/weather/week/', { method: 'POST', mode: 'navigate' })).toBe('bypass');
	});

	it('keeps the geo endpoint and version.json on the network', () => {
		expect(route('/api/geo')).toBe('bypass');
		expect(route('/_app/version.json')).toBe('bypass');
		expect(route('/_app/version.json?t=1')).toBe('bypass');
	});

	it('serves navigations network first with the shell fallback', () => {
		expect(route('/', { mode: 'navigate' })).toBe('navigate');
		expect(route('/de/weather/week/52.09N5.12E/', { mode: 'navigate' })).toBe('navigate');
	});

	it('serves precached files from the cache', () => {
		expect(route('/_app/immutable/entry/start.abc123.js')).toBe('precached');
		expect(route('/favicon.svg')).toBe('precached');
	});

	it('bypasses same-origin files that were not precached', () => {
		expect(route('/images/weather-icons/0d.svg')).toBe('bypass');
		expect(route('/data/cities/50_10.json')).toBe('bypass');
	});
});
