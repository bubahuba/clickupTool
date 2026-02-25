import type {
	ClickUpAuthorizedTeamsResponse,
	ClickUpTimeEntriesResponse
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
		end_date: String(endDateMs)
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
