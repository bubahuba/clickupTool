import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	fetchClickUpTask,
	fetchClickUpTaskComments,
	fetchClickUpList,
	fetchClickUpSpace,
	fetchClickUpTaskTime
} from '$lib/api/clickup-fetch.js';
import type { ClickUpStatus } from '$lib/api/clickup-types.js';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ params }) => {
	const token = env.API_TOKEN;
	if (!token) {
		return json({ error: 'API_TOKEN not configured' }, { status: 500 });
	}

	const { taskId } = params;

	try {
		const [task, comments, timeResult] = await Promise.all([
			fetchClickUpTask(token, taskId),
			fetchClickUpTaskComments(token, taskId),
			fetchClickUpTaskTime(token, taskId)
		]);

		// Fetch available statuses from list (or space as fallback)
		let statuses: ClickUpStatus[] = [];
		if (task.list?.id || task.space?.id) {
			try {
				if (task.list?.id) {
					const list = await fetchClickUpList(token, task.list.id);
					statuses = list.statuses ?? (list.status ? [list.status] : []);
				}
				if (statuses.length === 0 && task.space?.id) {
					const space = await fetchClickUpSpace(token, task.space.id);
					statuses = space.statuses ?? [];
				}
				if (statuses.length === 0 && task.status) {
					statuses = [task.status];
				}
			} catch {
				if (task.status) statuses = [task.status];
			}
		}

		return json({ task, comments, statuses, timeTrackedMs: timeResult.totalMs });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to fetch task details';
		return json({ error: message }, { status: 500 });
	}
};
