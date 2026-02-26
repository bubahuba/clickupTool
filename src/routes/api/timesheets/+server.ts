import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchClickUpTeams, fetchClickUpTimeEntries } from '$lib/api/clickup-fetch.js';
import { env } from '$env/dynamic/private';
import type {
	UserTimesheet,
	TimesheetUser,
	DailyHours,
	DayDetails,
	DayTask
} from '$lib/components/timesheet-table/types.js';

export const GET: RequestHandler = async ({ url }) => {
	const token = env.API_TOKEN;
	if (!token) {
		return json({ error: 'API_TOKEN not configured' }, { status: 500 });
	}

	const teamId = url.searchParams.get('teamId');
	const year = parseInt(url.searchParams.get('year') ?? '', 10);
	const month = parseInt(url.searchParams.get('month') ?? '', 10);

	if (!teamId || isNaN(year) || isNaN(month) || month < 0 || month > 11) {
		return json(
			{ error: 'teamId, year, and month (0-11) are required' },
			{ status: 400 }
		);
	}

	const teamIdNum = parseInt(teamId, 10);
	if (isNaN(teamIdNum)) {
		return json({ error: 'Invalid teamId' }, { status: 400 });
	}

	const startDate = new Date(year, month, 1);
	const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
	const startDateMs = startDate.getTime();
	const endDateMs = endDate.getTime();

	try {
		const [teamsRes, entriesRes] = await Promise.all([
			fetchClickUpTeams(token),
			fetchClickUpTimeEntries(token, teamIdNum, startDateMs, endDateMs)
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
				const dayKey = startDateEntry.toISOString().slice(0, 10);

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

		const usersTimesheets: UserTimesheet[] = Array.from(userMap.values());
		return json({ usersTimesheets });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to fetch timesheets';
		return json({ error: message }, { status: 500 });
	}
};
