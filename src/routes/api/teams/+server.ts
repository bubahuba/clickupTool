import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchClickUpTeams } from '$lib/api/clickup-fetch.js';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async () => {
	const token = env.API_TOKEN;
	if (!token) {
		return json({ error: 'API_TOKEN not configured' }, { status: 500 });
	}

	try {
		const data = await fetchClickUpTeams(token);
		return json(data);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to fetch teams';
		return json({ error: message }, { status: 500 });
	}
};
