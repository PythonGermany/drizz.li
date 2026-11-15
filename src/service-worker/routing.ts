/**
 * How the service worker answers a request. Kept free of service worker
 * globals so the routing can be unit-tested in Node.
 *
 * - `bypass`: not intercepted, the browser fetches it as if there were no
 *   service worker
 * - `navigate`: network first, the cached SPA shell when offline
 * - `precached`: cache first, from the shell cache of this build
 */
export type Strategy = 'bypass' | 'navigate' | 'precached';

export interface RouteInput {
	url: URL;
	method: string;
	mode: RequestMode;
	/** the service worker's own origin */
	origin: string;
	/** pathnames cached at install */
	precached: ReadonlySet<string>;
}

/**
 * Same-origin paths that must always reach the network:
 * - `/api/*` is per-visitor and `no-store` (the geo endpoint)
 * - `version.json` is how SvelteKit detects a new deploy; a cached copy would
 *   hide every update (see `version` in vite.config.ts)
 */
const NETWORK_ONLY = [/^\/api\//, /^\/_app\/version\.json$/];

export function strategyFor({ url, method, mode, origin, precached }: RouteInput): Strategy {
	// Cross-origin covers every Open-Meteo API and the maps iframe: leaving them
	// alone keeps CORS and cross-origin isolation exactly as without a worker.
	if (method !== 'GET' || url.origin !== origin) return 'bypass';
	if (NETWORK_ONLY.some((pattern) => pattern.test(url.pathname))) return 'bypass';
	if (mode === 'navigate') return 'navigate';
	if (precached.has(url.pathname)) return 'precached';
	return 'bypass';
}
