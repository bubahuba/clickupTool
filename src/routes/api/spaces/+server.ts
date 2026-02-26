import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchClickUpSpaces } from '$lib/api/clickup-fetch.js';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ url }) => {
	const token = env.API_TOKEN;
	if (!token) {
		return json({ error: 'API_TOKEN not configured' }, { status: 500 });
	}

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
