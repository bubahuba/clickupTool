<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import * as m from '$lib/paraglide/messages.js';
	import {
		clickUpQueryKeys,
		parseUsername,
		type ClickUpAuthorizedTeamsResponse,
		type GetAuthorizedUserResponse
	} from '$lib/api/index.js';
	import { TimesheetTable } from '$lib/components/timesheet-table/index.js';
	import { CapacityGrid } from '$lib/components/capacity-grid/index.js';

	const now = new Date();
	let year = $state(now.getFullYear());
	let month = $state(now.getMonth());

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

	const timezone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;
	const timesheetsQuery = createQuery(() => ({
		...clickUpQueryKeys.timesheets(teamId?.toString() ?? '', String(year), String(month)),
		queryFn: async () => {
			const tz = timezone ? `&timezone=${encodeURIComponent(timezone)}` : '';
			const res = await fetch(
				`/api/timesheets?teamId=${teamId}&year=${year}&month=${month}${tz}`
			);
			if (!res.ok) throw new Error(await res.text());
			const data = await res.json();
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

<div class="dashboard">
	{#if userQuery.isPending}
		<p>{m.loading()}</p>
	{:else if userQuery.isError}
		<p class="error">{m.error_prefix({ message: userQuery.error?.message ?? '' })}</p>
	{:else}
		{#if welcomeMessage}
			<h1>{welcomeMessage}</h1>
		{:else}
			<h1>{m.welcome_dashboard({ name: '', surname: '' })}</h1>
		{/if}

		<div class="timesheet-section">
			{#if teamsQuery.isError}
				<p class="error">{m.error_workspace({ message: teamsQuery.error?.message ?? '' })}</p>
			{:else if !teamId}
				{#if teamsQuery.isPending}
					<p>{m.loading_workspace()}</p>
				{:else}
					<p class="muted">{m.no_workspace()}</p>
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
					onMonthChange={handleMonthChange}
					isLoading={timesheetsQuery.isPending}
					error={timesheetsQuery.error}
				/>
			{/if}
		</div>
	{/if}
</div>

<style>
	.dashboard {
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.timesheet-section {
		margin-top: 1rem;
	}

	.error {
		color: var(--destructive);
	}

	.muted {
		color: var(--muted-foreground);
	}
</style>
