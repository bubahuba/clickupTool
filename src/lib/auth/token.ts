import { persisted } from 'svelte-persisted-store';
import { multiUserTimesheetsAllowed } from '$lib/stores/multi-user-timesheets.js';

export const CLICKUP_TOKEN_COOKIE = 'clickup_api_token';

export const persistedToken = persisted<string | null>(CLICKUP_TOKEN_COOKIE, null);

const COOKIE_MAX_AGE_DAYS = 30;

/** Set cookie with token (client-only). Call after storing in persisted store. */
export function syncTokenToCookie(token: string): void {
	if (typeof document === 'undefined') return;
	const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
	document.cookie = `${CLICKUP_TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/** Clear token from persisted store and cookie (client-only). */
export function clearToken(): void {
	if (typeof document === 'undefined') return;
	multiUserTimesheetsAllowed.set(true);
	persistedToken.set(null);
	document.cookie = `${CLICKUP_TOKEN_COOKIE}=; path=/; max-age=0`;
}
