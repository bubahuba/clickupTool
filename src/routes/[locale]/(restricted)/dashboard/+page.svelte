<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';
	import * as m from '$lib/paraglide/messages.js';
	import {
		clickUpQueryKeys,
		parseUsername,
		type ClickUpAuthorizedTeamsResponse,
		type GetAuthorizedUserResponse
	} from '$lib/api/index.js';
	import { MultiUserTimesheetsForbiddenError } from '$lib/api/timesheets-errors.js';
	import { multiUserTimesheetsAllowed } from '$lib/stores/multi-user-timesheets.js';
	import { TimesheetTable } from '$lib/components/timesheet-table/index.js';
	import { CapacityGrid } from '$lib/components/capacity-grid/index.js';
	import type { TimesheetUser } from '$lib/components/timesheet-table/types.js';

	const now = new Date();
	let year = $state(now.getFullYear());
	let month = $state(now.getMonth());
	let selectedUserIds = $state<number[]>([]);

	const userQuery = createQuery(() => ({
		queryKey: clickUpQueryKeys.user.queryKey,
		queryFn: async (): Promise<GetAuthorizedUserResponse> => {
			const res = await fetch('/api/user');
			if (!res.ok) throw new Error(await res.text());
			return res.json();
		}
	}));

	const teamsQuery = createQuery(() => ({
		queryKey: clickUpQueryKeys.teams.queryKey,
		queryFn: async (): Promise<ClickUpAuthorizedTeamsResponse> => {
			const res = await fetch('/api/teams');
			if (!res.ok) throw new Error(await res.text());
			return res.json();
		}
	}));

	const teamId = $derived(teamsQuery.data?.teams?.[0]?.id);
	const currentUserId = $derived(userQuery.data?.user?.id);

	$effect(() => {
		const uid = currentUserId;
		const tid = teamId;
		if (uid != null && tid != null && selectedUserIds.length === 0) {
			selectedUserIds = [uid];
		}
	});

	const teamMembers = $derived.by((): TimesheetUser[] => {
		const team = teamsQuery.data?.teams?.find((teamItem) => teamItem.id === teamId);
		const members = team?.members ?? [];
		return members.map((member) => {
			const user = member.user;
			const id = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
			return {
				id: isNaN(id) ? 0 : id,
				username: user.username,
				initials: user.initials,
				color: user.color
			};
		}).filter((user) => user.id > 0);
	});

	const timezone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;
	const timesheetsQuery = createQuery(() => ({
		...clickUpQueryKeys.timesheets(teamId?.toString() ?? '', String(year), String(month), selectedUserIds),
		queryFn: async () => {
			const timezoneParam = timezone ? `&timezone=${encodeURIComponent(timezone)}` : '';
			const assigneeParam =
				selectedUserIds.length > 0 ? `&assignee=${selectedUserIds.join(',')}` : '';
			const res = await fetch(
				`/api/timesheets?teamId=${teamId}&year=${year}&month=${month}${timezoneParam}${assigneeParam}`
			);
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				if (res.status === 403 && (data.multiUserForbidden || data.error?.includes?.('TIMEENTRY'))) {
					multiUserTimesheetsAllowed.set(false);
					toast.error(m.timesheets_multi_user_forbidden());
					if (currentUserId != null) {
						selectedUserIds = [currentUserId];
					}
					throw new MultiUserTimesheetsForbiddenError(data.error ?? 'Access denied');
				}
				throw new Error(data.error ?? `Error ${res.status}`);
			}
			return data.usersTimesheets ?? [];
		},
		enabled: !!teamId,
		placeholderData: (previousData) => previousData
	}));

	const welcomeMessage = $derived.by(() => {
		const user = userQuery.data?.user;
		if (!user) return null;
		const { name, surname } = parseUsername(user.username);
		return m.welcome_dashboard({ name, surname });
	});

	function handleMonthChange(newYear: number, newMonth: number) {
		year = newYear;
		month = newMonth;
	}

	const usersTimesheets = $derived(timesheetsQuery.data ?? []);
</script>

<div class="p-8 flex flex-col gap-8">
	{#if userQuery.isPending}
		<p>{m.loading()}</p>
	{:else if userQuery.isError}
		<p class="text-destructive">{m.error_prefix({ message: userQuery.error?.message ?? '' })}</p>
	{:else}
		{#if welcomeMessage}
			<h1>{welcomeMessage}</h1>
		{:else}
			<h1>{m.welcome_dashboard({ name: '', surname: '' })}</h1>
		{/if}

		<div class="mt-4">
			{#if teamsQuery.isError}
				<p class="text-destructive">{m.error_workspace({ message: teamsQuery.error?.message ?? '' })}</p>
			{:else if !teamId}
				{#if teamsQuery.isPending}
					<p>{m.loading_workspace()}</p>
				{:else}
					<p class="text-muted-foreground">{m.no_workspace()}</p>
				{/if}
			{:else}
				<CapacityGrid teamId={teamId.toString()} />
				<TimesheetTable
					usersTimesheets={usersTimesheets}
					{year}
					{month}
					teamId={teamId?.toString()}
					currentUserId={userQuery.data?.user?.id}
					currentUser={userQuery.data?.user ? { id: userQuery.data.user.id, username: userQuery.data.user.username, initials: userQuery.data.user.initials, color: userQuery.data.user.color } : undefined}
					users={teamMembers}
					selectedUserIds={selectedUserIds}
					onUsersChange={(ids) => (selectedUserIds = ids)}
					usersDropdownDisabled={!$multiUserTimesheetsAllowed}
					onMonthChange={handleMonthChange}
					isLoading={timesheetsQuery.isPending}
					error={timesheetsQuery.error}
					class="mt-4"
				/>
			{/if}
		</div>
	{/if}
</div>
