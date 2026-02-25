import { redirect } from '@sveltejs/kit';
import { locales } from '$lib/paraglide/runtime.js';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ params }) => {
	if (!locales.includes(params.locale as (typeof locales)[number])) {
		throw redirect(302, '/cs');
	}
	return { locale: params.locale };
};
