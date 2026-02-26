import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchClickUpTask, updateClickUpTask } from '$lib/api/clickup-fetch.js';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ params }) => {
	const token = env.API_TOKEN;
	if (!token) {
		return json({ error: 'API_TOKEN not configured' }, { status: 500 });
	}

	const { taskId } = params;

	try {
		const task = await fetchClickUpTask(token, taskId);
		return json(task);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to fetch task';
		return json({ error: message }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const token = env.API_TOKEN;
	if (!token) {
		return json({ error: 'API_TOKEN not configured' }, { status: 500 });
	}

	const { taskId } = params;

	let body: { name?: string; description?: string; status?: string; assignees?: number[] };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	try {
		const task = await updateClickUpTask(token, taskId, body);
		return json(task);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to update task';
		return json({ error: message }, { status: 500 });
	}
};
