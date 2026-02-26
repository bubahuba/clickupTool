import type {
	ClickUpAuthorizedTeamsResponse,
	ClickUpTimeEntriesResponse,
	ClickUpSpace,
	ClickUpTask,
	ClickUpTaskUpdatePayload,
	ClickUpTaskComment,
	ClickUpTaskCommentsResponse,
	ClickUpStatus
} from './clickup-types.js';

const BASE = 'https://api.clickup.com/api';

export interface ClickUpAuthorizedUser {
	user: { id: number; username: string; email?: string; color?: string };
}

export async function fetchClickUpUser(token: string): Promise<ClickUpAuthorizedUser> {
	const res = await fetch(`${BASE}/v2/user`, {
		headers: { Authorization: token }
	});
	if (!res.ok) {
		throw new Error(`ClickUp user: ${res.status} ${await res.text()}`);
	}
	return res.json();
}

export async function fetchClickUpTeams(
	token: string
): Promise<ClickUpAuthorizedTeamsResponse> {
	const res = await fetch(`${BASE}/v2/team`, {
		headers: { Authorization: token }
	});
	if (!res.ok) {
		throw new Error(`ClickUp teams: ${res.status} ${await res.text()}`);
	}
	return res.json();
}

export async function fetchClickUpTimeEntries(
	token: string,
	teamId: number,
	startDateMs: number,
	endDateMs: number,
	assigneeIds?: number[]
): Promise<ClickUpTimeEntriesResponse> {
	const params = new URLSearchParams({
		start_date: String(startDateMs),
		end_date: String(endDateMs),
		custom_task_ids: 'true'
	});
	if (assigneeIds && assigneeIds.length > 0) {
		params.set('assignee', assigneeIds.join(','));
	}
	const res = await fetch(
		`${BASE}/v2/team/${teamId}/time_entries?${params}`,
		{ headers: { Authorization: token } }
	);
	if (!res.ok) {
		throw new Error(`ClickUp time entries: ${res.status} ${await res.text()}`);
	}
	return res.json();
}

export async function fetchClickUpSpaces(token: string, teamId: number): Promise<{ spaces: ClickUpSpace[] }> {
	const res = await fetch(`${BASE}/v2/team/${teamId}/space`, {
		headers: { Authorization: token }
	});
	if (!res.ok) {
		throw new Error(`ClickUp spaces: ${res.status} ${await res.text()}`);
	}
	const data = await res.json();
	// ClickUp may return { spaces: [] } or array directly
	const spaces = Array.isArray(data) ? data : data.spaces ?? [];
	return { spaces };
}

export async function fetchClickUpTasksBySpace(
	token: string,
	teamId: number,
	spaceId: string
): Promise<{ tasks: ClickUpTask[] }> {
	const params = new URLSearchParams({
		'space_ids[]': spaceId,
		include_closed: 'true',
		custom_task_ids: 'true'
	});
	return fetchClickUpTeamTasks(token, teamId, params);
}

/** Fetch tasks (single page). Responses limited to 100 tasks per page. */
export async function fetchClickUpTeamTasks(
	token: string,
	teamId: number,
	params: URLSearchParams
): Promise<{ tasks: ClickUpTask[] }> {
	const res = await fetch(`${BASE}/v2/team/${teamId}/task?${params}`, {
		headers: { Authorization: token }
	});
	if (!res.ok) {
		throw new Error(`ClickUp tasks: ${res.status} ${await res.text()}`);
	}
	const data = await res.json();
	const tasks = Array.isArray(data?.tasks) ? data.tasks : data?.tasks ?? [];
	return { tasks };
}

/** Fetch all tasks for a space with pagination (handles 100 per page). */
export async function fetchClickUpTeamTasksAllPages(
	token: string,
	teamId: number,
	spaceId: string,
	options: { includeClosed?: boolean }
): Promise<ClickUpTask[]> {
	const allTasks: ClickUpTask[] = [];
	let page = 0;
	const limit = 100; // ClickUp returns max 100 per page
	let hasMore = true;
	while (hasMore) {
		const params = new URLSearchParams();
		params.set('space_ids[]', spaceId);
		params.set('include_closed', String(options.includeClosed ?? false));
		params.set('custom_task_ids', 'true');
		params.set('page', String(page));
		const { tasks } = await fetchClickUpTeamTasks(token, teamId, params);
		allTasks.push(...tasks);
		hasMore = tasks.length >= limit;
		page++;
	}
	return allTasks;
}

export async function fetchClickUpTask(token: string, taskId: string): Promise<ClickUpTask> {
	const res = await fetch(`${BASE}/v2/task/${taskId}`, {
		headers: { Authorization: token }
	});
	if (!res.ok) {
		throw new Error(`ClickUp task: ${res.status} ${await res.text()}`);
	}
	return res.json();
}

/** Get tracked time for a task (legacy endpoint). Returns total ms. */
export async function fetchClickUpTaskTime(
	token: string,
	taskId: string
): Promise<{ totalMs: number }> {
	try {
		const res = await fetch(`${BASE}/v2/task/${taskId}/time`, {
			headers: { Authorization: token }
		});
		if (!res.ok) return { totalMs: 0 };
		const data = await res.json();
		const entries = Array.isArray(data) ? data : data.data ?? data.entries ?? [];
		const totalMs = entries.reduce((sum: number, entry: { duration?: number }) => sum + Math.abs(entry.duration ?? 0), 0);
		return { totalMs };
	} catch {
		return { totalMs: 0 };
	}
}

/** List response from ClickUp API - statuses may be in list or inherited from space */
export interface ClickUpListResponse {
	id: string;
	name: string;
	status?: ClickUpStatus;
	statuses?: ClickUpStatus[];
	override_statuses?: boolean;
	space?: { id: string; name: string };
}

export async function fetchClickUpList(
	token: string,
	listId: string
): Promise<ClickUpListResponse> {
	const res = await fetch(`${BASE}/v2/list/${listId}`, {
		headers: { Authorization: token }
	});
	if (!res.ok) {
		throw new Error(`ClickUp list: ${res.status} ${await res.text()}`);
	}
	return res.json();
}

export interface ClickUpSpaceResponse {
	id: string;
	name: string;
	statuses?: ClickUpStatus[];
}

export async function fetchClickUpSpace(
	token: string,
	spaceId: string
): Promise<ClickUpSpaceResponse> {
	const res = await fetch(`${BASE}/v2/space/${spaceId}`, {
		headers: { Authorization: token }
	});
	if (!res.ok) {
		throw new Error(`ClickUp space: ${res.status} ${await res.text()}`);
	}
	return res.json();
}

export async function updateClickUpTask(
	token: string,
	taskId: string,
	payload: ClickUpTaskUpdatePayload
): Promise<ClickUpTask> {
	const res = await fetch(`${BASE}/v2/task/${taskId}`, {
		method: 'PUT',
		headers: {
			Authorization: token,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(payload)
	});
	if (!res.ok) {
		const text = await res.text();
		let message = `ClickUp API ${res.status}: ${text}`;
		try {
			const json = JSON.parse(text);
			if (json.err || json.error_description || json.message) {
				message = json.err ?? json.error_description ?? json.message ?? message;
			}
		} catch {
			// keep raw message
		}
		throw new Error(message);
	}
	return res.json();
}

export async function fetchClickUpTaskComments(
	token: string,
	taskId: string
): Promise<ClickUpTaskComment[]> {
	const res = await fetch(`${BASE}/v2/task/${taskId}/comment`, {
		headers: { Authorization: token }
	});
	if (!res.ok) {
		throw new Error(`ClickUp task comments: ${res.status} ${await res.text()}`);
	}
	const data: ClickUpTaskCommentsResponse = await res.json();
	return Array.isArray(data) ? data : data.comments ?? [];
}

export async function createClickUpTaskComment(
	token: string,
	taskId: string,
	commentText: string,
	notifyAll = false
): Promise<ClickUpTaskComment> {
	const res = await fetch(`${BASE}/v2/task/${taskId}/comment`, {
		method: 'POST',
		headers: {
			Authorization: token,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ comment_text: commentText, notify_all: notifyAll })
	});
	if (!res.ok) {
		throw new Error(`ClickUp create comment: ${res.status} ${await res.text()}`);
	}
	return res.json();
}
