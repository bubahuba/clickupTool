import { env } from '$env/dynamic/private';
import { CLICKUP_TOKEN_COOKIE, decodeToken } from './token.js';
import type { RequestEvent } from '@sveltejs/kit';

/** Get ClickUp API token from cookie (decoded) first, then env fallback. */
export function getToken(event: RequestEvent): string | undefined {
	const encoded = event.cookies.get(CLICKUP_TOKEN_COOKIE);
	if (encoded) {
		try {
			return decodeToken(encoded);
		} catch {
			return undefined;
		}
	}
	return env.API_TOKEN;
}
