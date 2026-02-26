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
	endDateMs: number
): Promise<ClickUpTimeEntriesResponse> {
	const params = new URLSearchParams({
		start_date: String(startDateMs),
		end_date: String(endDateMs),
		custom_task_ids: 'true'
	});
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
		const totalMs = entries.reduce((sum: number, e: { duration?: number }) => sum + Math.abs(e.duration ?? 0), 0);
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
