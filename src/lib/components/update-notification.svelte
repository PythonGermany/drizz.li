<script lang="ts">
	import { online } from 'svelte/reactivity/window';
	import { fade } from 'svelte/transition';

	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import XIcon from '@lucide/svelte/icons/x';

	import { updated } from '$app/state';

	import { Button } from '#lib/components/ui/button/index.js';

	import * as m from '#lib/paraglide/messages.js';

	let dismissed = $state(false);

	// While offline (PWA / flaky connection) the toast stays hidden even if an
	// update was already detected: reloading without network would tear down a
	// working cached app for nothing. It reappears once the connection is back.
	let show = $derived(updated.current && online.current === true && !dismissed);

	// The deploy is known: fetch the new service worker now, so it has installed
	// by the time "Reload" is clicked.
	$effect(() => {
		if (!updated.current || !('serviceWorker' in navigator)) return;
		navigator.serviceWorker
			.getRegistration()
			.then((registration) => registration?.update())
			.catch(() => {});
	});

	/** Resolves once `fn` has run or `ms` passed: an update must never block the reload. */
	const settle = (ms: number, fn: (done: () => void) => void) =>
		new Promise<void>((resolve) => {
			setTimeout(resolve, ms);
			fn(resolve);
		});

	async function reload() {
		try {
			const registration = await navigator.serviceWorker?.getRegistration();
			const installing = registration?.installing;
			if (installing) {
				await settle(3000, (done) =>
					installing.addEventListener('statechange', () => {
						if (installing.state !== 'installing') done();
					})
				);
			}
			// The new worker waits while old tabs use the old one (see
			// src/service-worker/index.ts); activate it so the old cache goes away.
			const waiting = registration?.waiting;
			if (waiting) {
				await settle(3000, (done) => {
					navigator.serviceWorker.addEventListener('controllerchange', done, { once: true });
					waiting.postMessage({ type: 'SKIP_WAITING' });
				});
			}
		} catch {
			// no service worker: a plain reload is the whole update
		}
		location.reload();
	}
</script>

{#if show}
	<!-- bottom offset clears the mobile bottom nav (4rem, see +layout.svelte) -->
	<div
		transition:fade={{ duration: 200 }}
		role="status"
		aria-live="polite"
		class="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-50 flex w-full justify-center p-4 md:bottom-0 md:right-0 md:w-auto md:justify-end"
	>
		<div
			class="pointer-events-auto relative flex w-full flex-col gap-3 rounded-md border border-border bg-background p-4 pr-10 text-foreground shadow-lg sm:w-auto sm:flex-row sm:items-center sm:gap-4"
		>
			<div class="grid gap-1">
				<div class="text-sm font-semibold">{m.update_title()}</div>
				<div class="text-sm whitespace-nowrap text-muted-foreground">{m.update_message()}</div>
			</div>
			<Button
				variant="outline"
				class="h-8 shrink-0 gap-2 self-start px-3 text-sm sm:self-auto"
				onclick={reload}
			>
				<RefreshCwIcon class="size-3.5" />
				{m.update_reload()}
			</Button>
			<Button
				variant="ghost"
				class="absolute top-1 right-1 size-7 rounded-md p-0 text-foreground/50 hover:text-foreground"
				aria-label={m.update_dismiss()}
				onclick={() => (dismissed = true)}
			>
				<XIcon class="size-4" />
			</Button>
		</div>
	</div>
{/if}
