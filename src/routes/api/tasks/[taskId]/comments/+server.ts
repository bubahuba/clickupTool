import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClickUpTaskComment } from '$lib/api/clickup-fetch.js';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ params, request }) => {
	const token = env.API_TOKEN;
	if (!token) {
		return json({ error: 'API_TOKEN not configured' }, { status: 500 });
	}

	const { taskId } = params;
	let body: { comment_text?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const commentText = typeof body?.comment_text === 'string' ? body.comment_text.trim() : '';
	if (!commentText) {
		return json({ error: 'Comment text is required' }, { status: 400 });
	}

	try {
		await createClickUpTaskComment(token, taskId, commentText);
		return json({ success: true });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to add comment';
		return json({ error: message }, { status: 500 });
	}
};
