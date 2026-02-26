import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CLICKUP_TOKEN_COOKIE } from '$lib/auth/token.js';

export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete(CLICKUP_TOKEN_COOKIE, { path: '/' });
	return json({ ok: true });
};
