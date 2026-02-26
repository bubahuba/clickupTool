import { persisted } from 'svelte-persisted-store';
import { multiUserTimesheetsAllowed } from '$lib/stores/multi-user-timesheets.js';

export const CLICKUP_TOKEN_COOKIE = 'clickup_api_token';

/** Base64-encode token for storage (obfuscates plain value in cookie/localStorage). */
export function encodeToken(token: string): string {
	if (typeof Buffer !== 'undefined') {
		return Buffer.from(token, 'utf8').toString('base64');
	}
	const bytes = new TextEncoder().encode(token);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

/** Base64-decode token from storage. */
export function decodeToken(encoded: string): string {
	if (typeof Buffer !== 'undefined') {
		return Buffer.from(encoded, 'base64').toString('utf8');
	}
	const binary = atob(encoded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new TextDecoder().decode(bytes);
}

export const persistedToken = persisted<string | null>(CLICKUP_TOKEN_COOKIE, null);

const COOKIE_MAX_AGE_DAYS = 30;

/** Set cookie with token (client-only). Stores encoded value. Call after storing in persisted store. */
export function syncTokenToCookie(token: string): void {
	if (typeof document === 'undefined') return;
	const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
	const encoded = encodeToken(token);
	document.cookie = `${CLICKUP_TOKEN_COOKIE}=${encodeURIComponent(encoded)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/** Clear token from persisted store and cookie (client-only). */
export function clearToken(): void {
	if (typeof document === 'undefined') return;
	multiUserTimesheetsAllowed.set(true);
	persistedToken.set(null);
	document.cookie = `${CLICKUP_TOKEN_COOKIE}=; path=/; max-age=0`;
}
