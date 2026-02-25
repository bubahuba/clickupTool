import type { Reroute } from '@sveltejs/kit';
import { baseLocale, locales } from '$lib/paraglide/runtime.js';

export const reroute: Reroute = (request) => {
	const pathname = new URL(request.url).pathname;
	// Don't add locale to API or static assets
	if (pathname.startsWith('/api') || pathname.startsWith('/_')) return pathname;
	const firstSegment = pathname.slice(1).split('/')[0];
	// If path already starts with a locale, use as-is
	if (locales.includes(firstSegment as (typeof locales)[number])) return pathname;
	// Otherwise prepend baseLocale so [locale] route matches
	return pathname === '/' ? `/${baseLocale}` : `/${baseLocale}${pathname}`;
};
