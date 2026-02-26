import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	fetchClickUpUser,
	fetchClickUpSpaces,
	fetchClickUpTeamTasksAllPages,
	fetchClickUpTask,
	fetchClickUpTaskTime
} from '$lib/api/clickup-fetch.js';
import { isStatusClosed } from '$lib/api/status-utils.js';
import { getToken } from '$lib/auth/server.js';

/** Returns total estimate hours from active tasks assigned to the current user with estimates. */
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
		const [userRes, spacesRes] = await Promise.all([
			fetchClickUpUser(token),
			fetchClickUpSpaces(token, teamIdNum)
		]);

		const currentUserId = userRes.user?.id;
		if (currentUserId == null) {
			return json({ totalEstimateHours: 0 });
		}

		const spaces = spacesRes.spaces ?? [];

		const allTasksArrays = await Promise.all(
			spaces.map((space) =>
				fetchClickUpTeamTasksAllPages(token, teamIdNum, space.id, { includeClosed: false })
			)
		);

		const candidateTasks: Array<{
			task: { id: string; name: string; custom_id?: string; time_estimate: number; time_spent?: number; url?: string };
		}> = [];
		for (const tasks of allTasksArrays) {
			for (const task of tasks) {
				if (!task.time_estimate || task.time_estimate <= 0) continue;
				const isAssignedToUser =
					task.assignees?.length &&
					task.assignees.some((assignee) => assignee.id === currentUserId);
				if (!isAssignedToUser) continue;
				candidateTasks.push({ task });
			}
		}

		const [timeTrackedResults, fullTaskResults] = await Promise.all([
			Promise.all(candidateTasks.map(({ task }) => fetchClickUpTaskTime(token, task.id))),
			Promise.all(candidateTasks.map(({ task }) => fetchClickUpTask(token, task.id)))
		]);

		const estimatedTasks: Array<{
			id: string;
			name: string;
			custom_id?: string;
			time_estimate: number;
			url?: string;
		}> = [];
		for (let i = 0; i < candidateTasks.length; i++) {
			const { task } = candidateTasks[i];
			const fullTask = fullTaskResults[i];
			// Exclude closed/done/complete tasks from estimated hours
			if (isStatusClosed(fullTask?.status ?? task.status)) continue;
			// Prefer time_spent from full task (GET /task/{id}), fallback to legacy time endpoint
			const trackedMs =
				fullTask?.time_spent ??
				timeTrackedResults[i]?.totalMs ??
				task.time_spent ??
				0;
			const availableMs = Math.max(0, task.time_estimate - trackedMs);
			if (availableMs < 60000) continue; // Skip tasks with < 1 min available (handles 3h/3h case)

			estimatedTasks.push({
				id: task.id,
				name: task.name,
				custom_id: task.custom_id,
				time_estimate: availableMs,
				url: task.url ?? fullTask?.url
			});
		}

		return json({ tasks: estimatedTasks });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to fetch estimated capacity';
		console.error('[estimated-capacity]', err);
		return json({ error: message }, { status: 500 });
	}
};
