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
	import { cn, toLocalDateKey } from "$lib/utils.js";
	import {
		assignSlotsToFutureWorkingDays,
		buildTaskSlotsFromEstimatedTasks,
		getStartOfTodayMs,
		MAX_HOURS_DEFAULT
	} from "$lib/utils/estimatePrediction.js";
	import type { DayDetails } from "./types.js";
	import type { UserTimesheet } from "./types.js";
	import ChevronLeft from "@lucide/svelte/icons/chevron-left";
	import ChevronRight from "@lucide/svelte/icons/chevron-right";

	interface Props {
		usersTimesheets: UserTimesheet[];
		year?: number;
		month?: number; // 0–11
		teamId?: string;
		currentUserId?: number; // ClickUp user id for prediction row
		currentUser?: { id: number; username: string; initials?: string; color?: string }; // fallback when timesheets empty
		onMonthChange?: (year: number, month: number) => void;
		isLoading?: boolean;
		error?: Error | null;
	}

	let {
		usersTimesheets = [],
		year = new Date().getFullYear(),
		month = new Date().getMonth(),
		teamId,
		currentUserId,
		currentUser,
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

	// Month is viewable for prediction: has any day within our prediction window (today .. today+3 months)
	const shouldFetchPrediction = $derived.by(() => {
		const firstDay = new SvelteDate(year, month, 1);
		firstDay.setHours(0, 0, 0, 0);
		const lastDay = new SvelteDate(year, month + 1, 0);
		lastDay.setHours(23, 59, 59, 999);
		const predictionEndMs = todayStartMs + 90 * 24 * 60 * 60 * 1000; // ~3 months
		// Include month if any of its days overlap [today, today+3months]
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
		assignSlotsToFutureWorkingDays(todayStartMs, taskSlots, 3)
	);

	// When timesheets API returns empty, or current user is missing, ensure we show current user for prediction
	const displayTimesheets = $derived.by((): UserTimesheet[] => {
		const hasCurrentUser = currentUserId != null && usersTimesheets.some((ut) => ut.user.id === currentUserId);
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
		for (let d = 1; d <= last.getDate(); d++) {
			const date = new Date(year, month, d);
			const dayOfWeek = date.getDay();
			const dateKey = toLocalDateKey(date);
			const isFuture = date.getTime() >= todayStartMs;
			days.push({
				date,
				day: d,
				dayName: dayFormatter.format(date),
				key: dateKey,
				isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
				isFuture
			});
		}
		return days;
	});

	function prevMonth() {
		const newMonth = month === 0 ? 11 : month - 1;
		const newYear = month === 0 ? year - 1 : year;
		onMonthChange?.(newYear, newMonth);
	}

	function nextMonth() {
		const newMonth = month === 11 ? 0 : month + 1;
		const newYear = month === 11 ? year + 1 : year;
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

<div class="timesheet-table-wrapper">
	<div class="month-nav">
		<Button variant="outline" size="icon" onclick={prevMonth} aria-label={m.aria_previous_month()}>
			<ChevronLeft class="size-4" />
		</Button>
		<span class="month-label">{monthLabel}</span>
		<Button variant="outline" size="icon" onclick={nextMonth} aria-label={m.aria_next_month()}>
			<ChevronRight class="size-4" />
		</Button>
	</div>

	<Tooltip.Provider>
		<div class="table-scroll-container pb-10">
			<table class="timesheet-table">
			<TableHeader>
				<TableRow>
					<TableHead class="sticky-user-col sticky left-0 bg-background z-3">{m.user()}</TableHead>
					{#each daysInMonth as dayItem (dayItem.key)}
						<TableHead class={cn("day-col", dayItem.isWeekend && "bg-muted")}>{dayItem.dayName} {dayItem.day}</TableHead>
					{/each}
				</TableRow>
			</TableHeader>
			<TableBody>
				{#each displayTimesheets as { user, hoursByDay } (user.id)}
					<TableRow>
						<TableCell class="sticky-user-col relative font-medium sticky left-0 bg-background z-3">
							<span
								class="user-cell"
								style="--user-color: {user.color ?? '#6b7280'}"
							>
								<span class="user-initials">{user.initials ?? user.username.slice(0, 2).toUpperCase()}</span>
								<span class="user-name">{user.username}</span>
							</span>
						</TableCell>
						{#each daysInMonth as dayItem (dayItem.key)}
							{@const effective = getEffectiveDayDetails(hoursByDay, dayItem.key, dayItem.isFuture, user.id)}
							{@const dayDetails = effective.details}
							{@const hours = dayDetails?.total ?? 0}
							{@const isOverMax = hours > MAX_HOURS}
							{@const barHeight = Math.min(hours / MAX_HOURS, 1) * 100}
							{@const isPredicted = effective.isPredicted}
							<TableCell class={cn("day-col day-cell relative", dayItem.isWeekend && "bg-muted")}>
								<div
									class={cn(
										"day-bar cursor-default",
										isOverMax && "day-bar--over",
										isPredicted && "day-bar--predicted"
									)}
									style="--bar-height: {barHeight}%;"
								></div>
								<Tooltip.Root>
									<Tooltip.Trigger
										class="absolute inset-0 w-full h-full cursor-default rounded-[2px]"
									/>
									<Tooltip.Content
										class="!bg-white !text-foreground border border-border shadow-lg"
										arrowClasses="!bg-white"
										side="top"
									>
										{#if dayDetails?.tasks?.length}
											<div class="min-w-48 space-y-1.5 py-0.5">
												<div class="font-medium text-xs border-b border-border pb-1 mb-1">
													{dayItem.day}. {dayItem.key}
													{#if isPredicted}
														<span class="text-muted-foreground font-normal"> {m.capacity_predicted()}</span>
													{/if}
												</div>
												{#each dayDetails.tasks as task, i ((task.id ?? task.name) + '-' + i)}
													<div class="flex justify-between gap-4 text-xs">
														<span class="truncate">
															{#if task.id}
																<a
																	href={resolve(`/${locale}/tasks-by-spaces/${task.id}`)}
																	class="hover:underline focus:outline-none focus:underline text-primary"
																>
																	{#if task.custom_id ?? task.id}
																		<span class="font-bold">{task.custom_id ?? task.id}</span> {task.name}
																	{:else}
																		{task.name}
																	{/if}
																</a>
															{:else}
																{#if task.custom_id ?? task.id}
																	<span class="font-bold">{task.custom_id ?? task.id}</span> {task.name}
																{:else}
																	{task.name}
																{/if}
															{/if}
														</span>
														<span class="tabular-nums shrink-0">{task.hours.toFixed(1)} h</span>
													</div>
												{/each}
												<div class="flex justify-between gap-4 text-xs font-medium pt-1 border-t border-border">
													<span>{m.tooltip_total()}</span>
													<span class="tabular-nums">{hours.toFixed(1)} h</span>
												</div>
											</div>
										{:else}
											<span class="text-xs">
												{hours > 0 ? `${hours.toFixed(1)} h` : m.no_time_tracked()}
												{#if isPredicted}
													<span class="text-muted-foreground"> {m.capacity_predicted()}</span>
												{/if}
											</span>
										{/if}
									</Tooltip.Content>
								</Tooltip.Root>
							</TableCell>
						{/each}
					</TableRow>
				{/each}
			</TableBody>
			</table>
		</div>
	</Tooltip.Provider>
</div>

<style>
	.timesheet-table-wrapper {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.month-nav {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}

	.month-label {
		font-weight: 600;
		min-width: 10rem;
		text-align: center;
		font-family: var(--font-heading);
	}

	.table-scroll-container {
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
	}

	.timesheet-table {
		width: max-content;
		min-width: 100%;
		table-layout: fixed;
		border-collapse: separate;
		border-spacing: 0;
	}

	.sticky-user-col {
		position: sticky;
		left: 0;
		z-index: 2;
		background: var(--background);
		min-width: 10rem;
		white-space: nowrap;
		box-shadow: 2px 0 4px -2px rgb(0 0 0 / 0.1);
	}

	/* Ensure header sticky cell has proper background over body */
	:global(thead .sticky-user-col) {
		z-index: 3;
	}

	:global(.day-col) {
		width: 3.5rem;
		min-width: 3.5rem;
		max-width: 3.5rem;
		text-align: center;
		padding: 0.25rem;
		vertical-align: middle;
	}

	:global(.day-col.day-cell) {
		height: 2.5rem;
		padding: 0;
		vertical-align: bottom;
	}

	.day-bar {
		position: absolute;
		bottom: 2px;
		left: 2px;
		right: 2px;
		height: var(--bar-height);
		min-height: 2px;
		background: hsl(217 91% 60%);
		border-radius: 2px;
		transition: height 0.15s ease, background 0.15s ease;
	}

	.day-bar--over {
		background: hsl(25 95% 53%);
	}

	.day-bar--predicted {
		background: var(--capacity-pred-2);
	}

	.user-cell {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.user-initials {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 0.375rem;
		background: var(--user-color);
		color: white;
		font-size: 0.75rem;
		font-weight: 600;
		flex-shrink: 0;
	}

	.user-name {
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
