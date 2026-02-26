import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchClickUpSpaces } from '$lib/api/clickup-fetch.js';
import { getToken } from '$lib/auth/server.js';

export const GET: RequestHandler = async (event) => {
	const token = getToken(event);
	if (!token) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}
	const url = event.url;

	const teamId = url.searchParams.get('teamId');
	if (!teamId) {
		return json({ error: 'teamId required' }, { status: 400 });
	}

	try {
		const data = await fetchClickUpSpaces(token, Number(teamId));
		return json(data);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to fetch spaces';
		return json({ error: message }, { status: 500 });
	}
};
