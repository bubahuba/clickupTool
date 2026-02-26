import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchClickUpTeams } from '$lib/api/clickup-fetch.js';
import { getToken } from '$lib/auth/server.js';

export const GET: RequestHandler = async (event) => {
	const token = getToken(event);
	if (!token) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const data = await fetchClickUpTeams(token);
		return json(data);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to fetch teams';
		return json({ error: message }, { status: 500 });
	}
};
