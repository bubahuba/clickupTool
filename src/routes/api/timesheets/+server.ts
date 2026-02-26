import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchClickUpTeams, fetchClickUpTimeEntries } from '$lib/api/clickup-fetch.js';
import { getToken } from '$lib/auth/server.js';
import {
	toDateKeyInTimezone,
	parseCommaSeparatedIds,
	parseIntSafe
} from '$lib/utils.js';
import type {
	UserTimesheet,
	TimesheetUser,
	DailyHours,
	DayDetails,
	DayTask
} from '$lib/components/timesheet-table/types.js';

export const GET: RequestHandler = async (event) => {
	const token = getToken(event);
	if (!token) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}
	const url = event.url;

	const teamId = url.searchParams.get('teamId');
	const timezone = url.searchParams.get('timezone') ?? undefined;
	const assigneeParam = url.searchParams.get('assignee') ?? undefined;
	const monthsBack = parseIntSafe(url.searchParams.get('monthsBack'), 10);
	const year = parseIntSafe(url.searchParams.get('year'), 10);
	const month = parseIntSafe(url.searchParams.get('month'), 10);

	const assigneeIds = assigneeParam
		? parseCommaSeparatedIds(assigneeParam)
		: undefined;

	if (!teamId) {
		return json({ error: 'teamId is required' }, { status: 400 });
	}

	const teamIdNum = parseIntSafe(teamId, 10);
	if (Number.isNaN(teamIdNum)) {
		return json({ error: 'Invalid teamId' }, { status: 400 });
	}

	let startDateMs: number;
	let endDateMs: number;
	if (!isNaN(monthsBack) && monthsBack > 0) {
		const endDate = new Date();
		endDate.setHours(23, 59, 59, 999);
		const startDate = new Date(endDate);
		startDate.setMonth(startDate.getMonth() - monthsBack);
		startDate.setHours(0, 0, 0, 0);
		startDateMs = startDate.getTime();
		endDateMs = endDate.getTime();
	} else if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
		const startDate = new Date(year, month, 1);
		const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
		startDateMs = startDate.getTime();
		endDateMs = endDate.getTime();
	} else {
		return json(
			{ error: 'Either monthsBack or both year and month (0-11) are required' },
			{ status: 400 }
		);
	}

	try {
		const [teamsRes, entriesRes] = await Promise.all([
			fetchClickUpTeams(token),
			fetchClickUpTimeEntries(token, teamIdNum, startDateMs, endDateMs, assigneeIds)
		]);

		const team = teamsRes.teams.find((t) => t.id === teamIdNum);
		const members = team?.members ?? [];

		// Build user map from members
		const userMap = new Map<
			number,
			{ user: TimesheetUser; hoursByDay: DailyHours }
		>();
		for (const m of members) {
			const u = m.user;
			const uid = typeof u.id === 'string' ? parseInt(u.id, 10) : u.id;
			if (isNaN(uid)) continue;
			userMap.set(uid, {
				user: {
					id: uid,
					username: u.username,
					initials: u.initials,
					color: u.color
				},
				hoursByDay: {}
			});
		}

		const entries = Array.isArray(entriesRes) ? entriesRes : (entriesRes.data ?? []);
		for (const entry of entries) {
			try {
				const userId = entry.user?.id;
				if (!userId) continue;

				const startRaw = entry.start;
				if (startRaw == null || Number.isNaN(Number(startRaw))) continue;
				const startMs =
					typeof startRaw === 'number' && startRaw < 1e12 ? startRaw * 1000 : Number(startRaw);
				const startDateEntry = new Date(startMs);
				if (Number.isNaN(startDateEntry.getTime())) continue;
				const dayKey = toDateKeyInTimezone(startDateEntry, timezone);

				const durationMs = Math.abs(entry.duration ?? 0);
				const hours = durationMs / (1000 * 60 * 60);
				const taskId = entry.task?.id;
				const taskCustomId = entry.task?.custom_id;
				const taskName = entry.task?.name ?? 'Untitled task';

				if (!userMap.has(userId)) {
					userMap.set(userId, {
						user: {
							id: entry.user!.id,
							username: entry.user!.username ?? 'Unknown',
							initials: entry.user!.initials,
							color: entry.user!.color
						},
						hoursByDay: {}
					});
				}
				const data = userMap.get(userId)!;
				if (!data.hoursByDay[dayKey]) {
					data.hoursByDay[dayKey] = { total: 0, tasks: [] };
				}
				const dayDetails = data.hoursByDay[dayKey] as DayDetails;
				dayDetails.total += hours;
				const existing = dayDetails.tasks.find(
					(t) => (taskId && t.id === taskId) || (!taskId && t.name === taskName)
				);
				if (existing) {
					existing.hours += hours;
					if (taskCustomId) existing.custom_id = taskCustomId;
				} else {
					dayDetails.tasks.push({
						id: taskId,
						custom_id: taskCustomId,
						name: taskName,
						hours
					} satisfies DayTask);
				}
			} catch {
				// Skip malformed entries
			}
		}

		let usersTimesheets: UserTimesheet[] = Array.from(userMap.values());
		if (assigneeIds && assigneeIds.length > 0) {
			const assigneeSet = new Set(assigneeIds);
			usersTimesheets = usersTimesheets.filter((ut) => assigneeSet.has(ut.user.id));
		}
		return json({ usersTimesheets });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to fetch timesheets';
		// Preserve 403 when user lacks permission to view others' time entries (e.g. TIMEENTRY_059)
		const is403 = message.includes('403') || message.includes('TIMEENTRY_059');
		return json(
			{ error: message, multiUserForbidden: is403 },
			{ status: is403 ? 403 : 500 }
		);
	}
};
