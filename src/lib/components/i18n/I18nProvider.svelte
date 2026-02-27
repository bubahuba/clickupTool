<script lang="ts">
	import { setContext } from 'svelte';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import {
		baseLocale,
		locales,
		overwriteGetLocale,
		setLocale
	} from '$lib/paraglide/runtime.js';
	import { I18N_CONTEXT_KEY } from './context.js';

	type Locale = (typeof locales)[number];

	// Reactive locale from route - source of truth for client-side navigation
	const locale = $derived((page.params.locale ?? baseLocale) as Locale);

	// Expose locale via context for components that need it explicitly (e.g. Intl)
	setContext(I18N_CONTEXT_KEY, { locale });

	// Override Paraglide's getLocale so m.xxx() use our reactive locale.
	// Reading `locale` creates a dependency: when route param changes, any component
	// that called getLocale() (via m.xxx()) will re-render.
	if (browser) {
		overwriteGetLocale(() => locale);
	}

	// Sync to cookie when locale changes (for SSR, future full loads)
	$effect(() => {
		if (browser && locale) {
			setLocale(locale, { reload: false });
		}
	});
</script>

<slot />
