import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClickUpClient } from '$lib/api/client.js';
import { CLICKUP_TOKEN_COOKIE, encodeToken } from '$lib/auth/token.js';

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export const POST: RequestHandler = async ({ request, cookies }) => {
	let body: { token?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}
	const token = body.token?.trim();
	if (!token) {
		return json({ error: 'Token is required' }, { status: 400 });
	}

	try {
		const client = createClickUpClient(token);
		const { error } = await client.GET('/v2/user');
		if (error) {
			return json({ error: 'Invalid token' }, { status: 401 });
		}
	} catch {
		return json({ error: 'Invalid token' }, { status: 401 });
	}

	cookies.set(CLICKUP_TOKEN_COOKIE, encodeToken(token), {
		path: '/',
		maxAge: COOKIE_MAX_AGE,
		httpOnly: false,
		sameSite: 'lax'
	});

	return json({ ok: true });
};
