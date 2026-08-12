import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	fetchClickUpUser,
	fetchClickUpTeamTasksAllPages
} from '$lib/api/clickup-fetch.js';
import { isStatusClosed } from '$lib/api/status-utils.js';
import { getToken } from '$lib/auth/server.js';

/**
 * Returns remaining estimate hours from active tasks assigned to the current user.
 * Uses a single assignee-filtered team-tasks query (paginated) to stay within
 * Cloudflare Workers' subrequest limit — no per-task ClickUp calls.
 */
export const GET: RequestHandler = async (event) => {
	const token = getToken(event);
	if (!token) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}
	const teamId = event.params.teamId;
	const teamIdNum = parseInt(teamId, 10);
	if (isNaN(teamIdNum)) {
		return json({ error: 'Invalid teamId' }, { status: 400 });
	}

	try {
		const userRes = await fetchClickUpUser(token);
		const currentUserId = userRes.user?.id;
		if (currentUserId == null) {
			return json({ tasks: [] });
		}

		// 1 user call + ≤10 task pages ≈ ≤11 subrequests (well under Workers free limit of 50)
		const tasks = await fetchClickUpTeamTasksAllPages(token, teamIdNum, {
			includeClosed: false,
			assigneeIds: [currentUserId],
			maxPages: 10
		});

		const estimatedTasks: Array<{
			id: string;
			name: string;
			custom_id?: string;
			time_estimate: number;
			url?: string;
		}> = [];

		for (const task of tasks) {
			if (!task.time_estimate || task.time_estimate <= 0) continue;
			if (isStatusClosed(task.status)) continue;

			const trackedMs = task.time_spent ?? 0;
			const availableMs = Math.max(0, task.time_estimate - trackedMs);
			if (availableMs < 60000) continue; // Skip tasks with < 1 min available

			estimatedTasks.push({
				id: task.id,
				name: task.name,
				custom_id: task.custom_id,
				time_estimate: availableMs,
				url: task.url
			});
		}

		return json({ tasks: estimatedTasks });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to fetch estimated capacity';
		console.error('[estimated-capacity]', err);
		return json({ error: message }, { status: 500 });
	}
};
