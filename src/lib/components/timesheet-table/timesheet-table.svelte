<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import {
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from "$lib/components/ui/table/index.js";
	import { page } from "$app/state";
	import * as m from "$lib/paraglide/messages.js";
	import * as Tooltip from "$lib/components/ui/tooltip/index.js";
	import { cn } from "$lib/utils.js";
	import ChevronLeft from "@lucide/svelte/icons/chevron-left";
	import ChevronRight from "@lucide/svelte/icons/chevron-right";
	import type { UserTimesheet } from "./types.js";

	interface Props {
		usersTimesheets: UserTimesheet[];
		year?: number;
		month?: number; // 0–11
		onMonthChange?: (year: number, month: number) => void;
	}

	let {
		usersTimesheets = [],
		year = new Date().getFullYear(),
		month = new Date().getMonth(),
		onMonthChange
	}: Props = $props();

	const locale = $derived(page.params.locale ?? "en");

	const monthLabel = $derived(
		new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
			new Date(year, month, 1)
		)
	);

	const daysInMonth = $derived.by(() => {
		const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
		const last = new Date(year, month + 1, 0);
		const days: { date: Date; day: number; dayName: string; key: string }[] = [];
		for (let d = 1; d <= last.getDate(); d++) {
			const date = new Date(year, month, d);
			days.push({
				date,
				day: d,
				dayName: dayFormatter.format(date),
				key: date.toISOString().slice(0, 10)
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

	const MAX_HOURS = 8;
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
						<TableHead class="day-col">{dayItem.dayName} {dayItem.day}</TableHead>
					{/each}
				</TableRow>
			</TableHeader>
			<TableBody>
				{#each usersTimesheets as { user, hoursByDay } (user.id)}
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
							{@const dayDetails = hoursByDay[dayItem.key]}
							{@const hours = dayDetails?.total ?? 0}
							{@const isOverMax = hours > MAX_HOURS}
							{@const barHeight = Math.min(hours / MAX_HOURS, 1) * 100}
							<TableCell class="day-col day-cell relative">
								<div
									class={cn(
										"day-bar cursor-default",
										isOverMax && "day-bar--over"
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
												</div>
												{#each dayDetails.tasks as task, i ((task.id ?? task.name) + '-' + i)}
													<div class="flex justify-between gap-4 text-xs">
														<span class="truncate">
															{#if task.id}
																<span class="font-bold">{task.id}</span> {task.name}
															{:else}
																{task.name}
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
											<span class="text-xs">{hours > 0 ? `${hours.toFixed(1)} h` : m.no_time_tracked()}</span>
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
		border: 1px solid hsl(var(--border));
		border-radius: 0.5rem;
	}

	.timesheet-table {
		width: max-content;
		min-width: 100%;
		border-collapse: separate;
		border-spacing: 0;
	}

	.sticky-user-col {
		position: sticky;
		left: 0;
		z-index: 2;
		background: hsl(var(--background));
		min-width: 10rem;
		white-space: nowrap;
		box-shadow: 2px 0 4px -2px rgb(0 0 0 / 0.1);
	}

	/* Ensure header sticky cell has proper background over body */
	:global(thead .sticky-user-col) {
		z-index: 3;
	}

	.day-col {
		min-width: 3.5rem;
		width: 3.5rem;
		text-align: center;
		padding: 0.25rem;
		vertical-align: middle;
	}

	.day-cell {
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
