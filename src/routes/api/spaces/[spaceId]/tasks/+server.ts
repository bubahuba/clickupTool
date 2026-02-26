import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchClickUpTasksBySpace } from '$lib/api/clickup-fetch.js';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ params, url }) => {
	const token = env.API_TOKEN;
	if (!token) {
		return json({ error: 'API_TOKEN not configured' }, { status: 500 });
	}

	const teamId = url.searchParams.get('teamId');
	if (!teamId) {
		return json({ error: 'teamId required' }, { status: 400 });
	}

	const { spaceId } = params;

	try {
		const data = await fetchClickUpTasksBySpace(token, Number(teamId), spaceId);
		return json(data);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to fetch tasks';
		return json({ error: message }, { status: 500 });
	}
};
