import { env } from '$env/dynamic/private';
import { CLICKUP_TOKEN_COOKIE } from './token.js';
import type { RequestEvent } from '@sveltejs/kit';

/** Get ClickUp API token from cookie first, then env fallback. */
export function getToken(event: RequestEvent): string | undefined {
	const fromCookie = event.cookies.get(CLICKUP_TOKEN_COOKIE);
	if (fromCookie) return fromCookie;
	return env.API_TOKEN;
}
