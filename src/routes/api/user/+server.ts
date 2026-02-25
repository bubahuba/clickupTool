import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClickUpClient } from '$lib/api/client.js';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async () => {
	const token = env.API_TOKEN;
	if (!token) {
		return json({ error: 'API_TOKEN not configured' }, { status: 500 });
	}

	const client = createClickUpClient(token);
	const { data, error, response } = await client.GET('/v2/user');

	if (error) {
		const status = (response as Response)?.status ?? 500;
		const message = typeof error === 'object' && error !== null && 'detail' in error ? String((error as { detail: unknown }).detail) : 'Failed to fetch user';
		return json({ error: message }, { status });
	}

	return json(data!);
};
