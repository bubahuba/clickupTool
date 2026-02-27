<script lang="ts">
	import { createQuery } from "@tanstack/svelte-query";
	import { Button } from "$lib/components/ui/button/index.js";
	import {
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from "$lib/components/ui/table/index.js";
	import { page } from "$app/state";
	import { resolve } from "$app/paths";
	import { SvelteDate } from "svelte/reactivity";
	import * as m from "$lib/paraglide/messages.js";
	import * as Tooltip from "$lib/components/ui/tooltip/index.js";
	import {
		cn,
		toLocalDateKey,
		formatDayCellLabel,
		formatHoursWithUnit,
		getInitials,
		getTaskDisplayId,
		getPrevMonth,
		getNextMonth,
		isWeekend
	} from "$lib/utils.js";
	import {
		assignSlotsToFutureWorkingDays,
		buildTaskSlotsFromEstimatedTasks,
		getStartOfTodayMs,
		MAX_HOURS_DEFAULT
	} from "$lib/utils/estimatePrediction.js";
	import type { DayDetails, TimesheetUser, UserTimesheet } from "./types.js";
	import { UsersDropdown } from "$lib/components/users-dropdown/index.js";
	import { slide } from "svelte/transition";
	import ChevronLeft from "@lucide/svelte/icons/chevron-left";
	import ChevronRight from "@lucide/svelte/icons/chevron-right";

	const barSlide = { duration: 300 };

	interface Props {
		usersTimesheets: UserTimesheet[];
		class?: string;
		year?: number;
		month?: number; // 0–11
		teamId?: string;
		currentUserId?: number; // ClickUp user id for prediction row
		currentUser?: { id: number; username: string; initials?: string; color?: string }; // fallback when timesheets empty
		users?: TimesheetUser[];
		selectedUserIds?: number[];
		onUsersChange?: (ids: number[]) => void;
		usersDropdownDisabled?: boolean;
		onMonthChange?: (year: number, month: number) => void;
		isLoading?: boolean;
		error?: Error | null;
	}

	let {
		usersTimesheets = [],
		class: className,
		year = new Date().getFullYear(),
		month = new Date().getMonth(),
		teamId,
		currentUserId,
		currentUser,
		users,
		selectedUserIds = [],
		onUsersChange,
		usersDropdownDisabled = false,
		onMonthChange,
		isLoading: _isLoading = false,
		error: _error = null
	}: Props = $props();

	const locale = $derived(page.params.locale ?? "en");
	const todayStartMs = getStartOfTodayMs();

	const monthLabel = $derived(
		new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
			new Date(year, month, 1)
		)
	);

	// Month is viewable for prediction: has any day within our prediction window (today .. today+12 months)
	const shouldFetchPrediction = $derived.by(() => {
		const firstDay = new SvelteDate(year, month, 1);
		firstDay.setHours(0, 0, 0, 0);
		const lastDay = new SvelteDate(year, month + 1, 0);
		lastDay.setHours(23, 59, 59, 999);
		const predictionEndMs = todayStartMs + 366 * 24 * 60 * 60 * 1000; // ~12 months
		// Include month if any of its days overlap [today, today+12months]
		return lastDay.getTime() >= todayStartMs && firstDay.getTime() <= predictionEndMs;
	});

	const estimatedCapacityQuery = createQuery(() => ({
		queryKey: ["estimated-capacity", teamId ?? "", year, month],
		queryFn: async () => {
			const res = await fetch(`/api/teams/${teamId}/estimated-capacity`);
			if (!res.ok) throw new Error(await res.text());
			const data = await res.json();
			return data.tasks as Array<{
				id: string;
				name: string;
				custom_id?: string;
				time_estimate: number;
			}>;
		},
		enabled: !!teamId && currentUserId != null && shouldFetchPrediction
	}));

	const estimatedTasks = $derived(estimatedCapacityQuery.data ?? []);
	const taskSlots = $derived(buildTaskSlotsFromEstimatedTasks(estimatedTasks, MAX_HOURS_DEFAULT));
	const taskByDate = $derived.by(() =>
		assignSlotsToFutureWorkingDays(todayStartMs, taskSlots, 12)
	);

	// When timesheets API returns empty, or current user is missing, ensure we show current user for prediction
	const displayTimesheets = $derived.by((): UserTimesheet[] => {
		const hasCurrentUser = currentUserId != null && usersTimesheets.some((userTimesheet) => userTimesheet.user.id === currentUserId);
		if (usersTimesheets.length > 0 && hasCurrentUser) return usersTimesheets;
		if (currentUser && shouldFetchPrediction) {
			// Merge: use existing users + add current user if missing
			if (usersTimesheets.length > 0 && !hasCurrentUser) {
				return [...usersTimesheets, { user: currentUser, hoursByDay: {} }];
			}
			return [{ user: currentUser, hoursByDay: {} }];
		}
		return usersTimesheets;
	});

	const daysInMonth = $derived.by(() => {
		const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
		const last = new Date(year, month + 1, 0);
		const days: {
			date: Date;
			day: number;
			dayName: string;
			key: string;
			isWeekend: boolean;
			isFuture: boolean;
		}[] = [];
		for (let dayOfMonth = 1; dayOfMonth <= last.getDate(); dayOfMonth++) {
			const date = new Date(year, month, dayOfMonth);
			const dateKey = toLocalDateKey(date);
			const isFuture = date.getTime() >= todayStartMs;
			days.push({
				date,
				day: dayOfMonth,
				dayName: dayFormatter.format(date),
				key: dateKey,
				isWeekend: isWeekend(date),
				isFuture
			});
		}
		return days;
	});

	function prevMonth() {
		const { year: newYear, month: newMonth } = getPrevMonth(year, month);
		onMonthChange?.(newYear, newMonth);
	}

	function nextMonth() {
		const { year: newYear, month: newMonth } = getNextMonth(year, month);
		onMonthChange?.(newYear, newMonth);
	}

	function getEffectiveDayDetails(
		hoursByDay: Record<string, DayDetails>,
		dayKey: string,
		isFuture: boolean,
		userId: number
	): { details: DayDetails | null; isPredicted: boolean } {
		if (isFuture && currentUserId != null && userId === currentUserId) {
			const predicted = taskByDate[dayKey];
			if (predicted) {
				return { details: predicted, isPredicted: true };
			}
		}
		return { details: hoursByDay[dayKey] ?? null, isPredicted: false };
	}

	const MAX_HOURS = MAX_HOURS_DEFAULT;
</script>

<Tooltip.Provider>
<div class={cn('flex flex-col gap-4', className)}>
	<div class="flex items-center justify-between gap-4 flex-wrap">
		<div class="flex items-center gap-4 text-xs text-muted-foreground shrink-0 mr-4">
			<span class="flex items-center gap-1.5">
				<span class="w-4 h-2 rounded-[2px] shrink-0 bg-[hsl(217_91%_60%)]"></span>
				{m.timesheet_legend_tracked()}
			</span>
			<span class="flex items-center gap-1.5">
				<span class="w-4 h-2 rounded-[2px] shrink-0 bg-[hsl(25_95%_53%)]"></span>
				{m.timesheet_legend_over()}
			</span>
			<span class="flex items-center gap-1.5">
				<span class="w-4 h-2 rounded-[2px] shrink-0 bg-[var(--capacity-pred-2)]"></span>
				{m.timesheet_legend_predicted()}
			</span>
		</div>
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" onclick={prevMonth} aria-label={m.aria_previous_month()}>
				<ChevronLeft class="size-4" />
			</Button>
			<span class="font-semibold min-w-40 text-center" style="font-family: var(--font-heading)">{monthLabel}</span>
			<Button variant="outline" size="icon" onclick={nextMonth} aria-label={m.aria_next_month()}>
				<ChevronRight class="size-4" />
			</Button>
		</div>
		{#if users && users.length > 0}
			{#if usersDropdownDisabled}
				<Tooltip.Root>
					<Tooltip.Trigger class="cursor-not-allowed">
						<UsersDropdown
							users={users}
							selectedIds={selectedUserIds}
							onSelect={() => {}}
							disabled={true}
						/>
					</Tooltip.Trigger>
					<Tooltip.Content side="bottom">
						{m.timesheets_multi_user_disabled_tooltip()}
					</Tooltip.Content>
				</Tooltip.Root>
			{:else}
				<UsersDropdown
					users={users}
					selectedIds={selectedUserIds}
					onSelect={(ids) => onUsersChange?.(ids)}
					disabled={false}
				/>
			{/if}
		{/if}
	</div>

	<div class="overflow-x-auto border border-border rounded-lg pb-10">
			<table class="w-max min-w-full table-fixed border-separate border-spacing-0">
			<TableHeader>
				<TableRow>
					<TableHead class="sticky left-0 z-[3] bg-background min-w-40 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] text-[0.65rem] text-muted-foreground">{m.user()}</TableHead>
					{#each daysInMonth as dayItem, _dayIndex (dayItem.key)}
						<TableHead class={cn("w-14 min-w-14 max-w-14 text-center p-1 align-middle text-[0.65rem] text-muted-foreground", dayItem.isWeekend && "bg-muted")}>
							<span class="block">{dayItem.dayName} {dayItem.day}</span>
						</TableHead>
					{/each}
				</TableRow>
			</TableHeader>
			<TableBody>
				{#each displayTimesheets as { user, hoursByDay }, _userIndex (user.id)}
					<TableRow>
						<TableCell class="sticky left-0 z-[2] bg-background min-w-40 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] relative font-medium">
							<span class="flex items-center gap-2" style="--user-color: {user.color ?? '#6b7280'}">
								<span class="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[var(--user-color)] text-white text-xs font-semibold shrink-0">{getInitials(user.username, user.initials)}</span>
								<span class="overflow-hidden text-ellipsis">{user.username}</span>
							</span>
						</TableCell>
						{#each daysInMonth as dayItem, _dayIndex (dayItem.key)}
							{@const effective = getEffectiveDayDetails(hoursByDay, dayItem.key, dayItem.isFuture, user.id)}
							{@const dayDetails = effective.details}
							{@const hours = dayDetails?.total ?? 0}
							{@const isOverMax = hours > MAX_HOURS}
							{@const barHeight = Math.min(hours / MAX_HOURS, 1) * 100}
							{@const isPredicted = effective.isPredicted}
							<TableCell class={cn("w-14 min-w-14 max-w-14 h-10 p-0 align-bottom text-center relative", dayItem.isWeekend && "bg-muted")}>
								<span class="block relative h-full w-full">
									<div
										class={cn(
											"absolute bottom-0.5 left-0.5 right-0.5 h-[var(--bar-height)] min-h-0 rounded-[2px] cursor-default transition-all duration-300",
											isOverMax ? "bg-[hsl(25_95%_53%)]" : isPredicted ? "bg-[var(--capacity-pred-2)]" : "bg-[hsl(217_91%_60%)]"
										)}
										style="--bar-height: {barHeight}%; transition-delay: {Math.random() * 1000}ms;"
										in:slide={{...barSlide, delay: Math.random() * 1000}}
									></div>
									<Tooltip.Root>
									<Tooltip.Trigger
										class="absolute inset-0 w-full h-full cursor-default rounded-[2px]"
									/>
									<Tooltip.Content
										class="bg-card text-foreground border border-border shadow-lg"
										arrowClasses="bg-card"
										side="top"
									>
										{#if dayDetails?.tasks?.length}
											<div class="min-w-48 space-y-1.5 py-0.5">
												<div class="font-medium text-[0.65rem] text-muted-foreground border-b border-border pb-1 mb-1">
													{formatDayCellLabel(dayItem.date, locale)}
													{#if isPredicted}
														<span class="text-muted-foreground font-normal"> {m.capacity_predicted()}</span>
													{/if}
												</div>
												{#each dayDetails.tasks as task, taskIndex ((task.id ?? task.name) + '-' + taskIndex)}
													<div class="flex justify-between gap-4">
														<span class="truncate">
															{#if task.id}
																<a
																	href={resolve(`/${locale}/tasks-by-spaces/${task.id}`)}
																	class="hover:underline focus:outline-none focus:underline text-primary"
																>
																	{#if getTaskDisplayId(task) !== '—'}
																		<span class="font-bold">{getTaskDisplayId(task)}</span> {task.name}
																	{:else}
																		{task.name}
																	{/if}
																</a>
															{:else}
																{#if getTaskDisplayId(task) !== '—'}
																	<span class="font-bold">{getTaskDisplayId(task)}</span> {task.name}
																{:else}
																	{task.name}
																{/if}
															{/if}
														</span>
														<span class="tabular-nums shrink-0">{formatHoursWithUnit(task.hours)}</span>
													</div>
												{/each}
												<div class="flex justify-between gap-4 text-xs font-medium pt-1 border-t border-border">
													<span>{m.tooltip_total()}</span>
													<span class="tabular-nums">{formatHoursWithUnit(hours)}</span>
												</div>
											</div>
										{:else}
											<span class="text-xs">
												{hours > 0 ? formatHoursWithUnit(hours) : m.no_time_tracked()}
												{#if isPredicted}
													<span class="text-muted-foreground"> {m.capacity_predicted()}</span>
												{/if}
											</span>
										{/if}
									</Tooltip.Content>
								</Tooltip.Root>
								</span>
							</TableCell>
						{/each}
					</TableRow>
				{/each}
			</TableBody>
			</table>
		</div>
</div>
</Tooltip.Provider>
