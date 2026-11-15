/**
 * Offline app shell. Navigations go to the network first; when it is gone, the
 * SPA fallback page (404.html) boots the app for any route, and the pages show
 * their usual connection error for data. Forecast data is not cached here.
 *
 * Updates: a new worker installs alongside the old one and waits. Open tabs
 * keep the old worker and its cache, so lazy-loaded chunks of the old build
 * still load after a deploy removed them from the server. The update toast
 * (update-notification.svelte) activates the new worker on "Reload".
 */
import { dev, version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { self } from '$app/service-worker';

import { strategyFor } from './routing';

const CACHE_PREFIX = 'shell-';
const CACHE = `${CACHE_PREFIX}${version}`;

/** adapter-static's SPA fallback (see vite.config.ts), served for any route */
const SHELL = '/404.html';

// Only what the shell needs. Prerendered pages (thousands of city pages per
// locale), flags, weather icons and city tiles stay out of the cache.
const isShellAsset = (path: string) =>
	path === 'favicon.svg' || path === 'app.webmanifest' || path.startsWith('icons/');

const PRECACHE = [
	...immutable.map(({ path }) => `/${path}`),
	...assets
		.map(({ path }) => path as string)
		.filter(isShellAsset)
		.map((path) => `/${path}`)
];

const precached: ReadonlySet<string> = new Set(PRECACHE);

async function cacheShell(cache: Cache) {
	const response = await fetch(SHELL, { cache: 'no-cache' });
	if (!response.ok) throw new Error(`service worker: ${SHELL} answered ${response.status}`);
	// The host may redirect 404.html (trailing-slash handling), and a redirected
	// response is refused as the answer to a navigation, so store a plain copy.
	// Copying the headers keeps COOP/COEP, so the shell stays cross-origin isolated.
	await cache.put(
		SHELL,
		new Response(await response.blob(), { status: 200, headers: response.headers })
	);
}

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			await cache.addAll(PRECACHE);
			// the dev server answers every path itself and has no 404.html
			if (!dev) await cacheShell(cache);
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key.startsWith(CACHE_PREFIX) && key !== CACHE) await caches.delete(key);
			}
			// starts the navigation request while the worker boots, so network
			// first costs no extra latency
			await self.registration.navigationPreload?.enable();
			await self.clients.claim();
		})()
	);
});

self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function navigate(event: FetchEvent): Promise<Response> {
	try {
		const preloaded: Response | undefined = await event.preloadResponse;
		return preloaded ?? (await fetch(event.request));
	} catch (error) {
		const shell = await (await caches.open(CACHE)).match(SHELL);
		if (shell) return shell;
		throw error;
	}
}

async function fromCache(request: Request): Promise<Response> {
	const cached = await (await caches.open(CACHE)).match(new URL(request.url).pathname);
	return cached ?? fetch(request);
}

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const strategy = strategyFor({
		url: new URL(request.url),
		method: request.method,
		mode: request.mode,
		origin: self.location.origin,
		precached
	});

	if (strategy === 'navigate') event.respondWith(navigate(event));
	else if (strategy === 'precached') event.respondWith(fromCache(request));
});
