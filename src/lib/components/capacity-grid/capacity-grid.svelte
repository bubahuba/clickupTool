<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteDate } from 'svelte/reactivity';
	import * as m from '$lib/paraglide/messages.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { toLocalDateKey } from '$lib/utils.js';
	import {
		assignSlotsToFutureWorkingDays,
		buildTaskSlotsFromEstimatedTasks,
		getStartOfTodayMs,
		MAX_HOURS_DEFAULT
	} from '$lib/utils/estimatePrediction.js';
	import type { DayDetails } from '$lib/components/timesheet-table/types.js';

	const PREDICTION_STORAGE_KEY = 'capacity-prediction-mode';

	function loadPredictionMode(): boolean {
		if (typeof window === 'undefined') return false;
		try {
			return sessionStorage.getItem(PREDICTION_STORAGE_KEY) === '1';
		} catch {
			return false;
		}
	}

	function savePredictionMode(value: boolean): void {
		try {
			sessionStorage.setItem(PREDICTION_STORAGE_KEY, value ? '1' : '0');
		} catch {
			// ignore
		}
	}

	interface Props {
		teamId: string;
		isLoading?: boolean;
		error?: Error | null;
	}

	const MAX_HOURS = MAX_HOURS_DEFAULT;
	const MONTHS_BACK = 12;
	const MONTHS_FUTURE = 3; // prediction mode: only next 3 months
	const CELL_SIZE = '1rem';
	const CELL_GAP = '2px';

	let { teamId, isLoading: _isLoading = false, error: _error = null }: Props = $props();
	let predictionMode = $state(loadPredictionMode());

	// Sync from URL when it has prediction param (e.g. back/forward)
	$effect(() => {
		if (typeof window === 'undefined') return;
		const param = page.url.searchParams.get('prediction');
		if (param === null) return; // no param: keep sessionStorage value
		const fromUrl = param === '1';
		if (fromUrl !== predictionMode) predictionMode = fromUrl;
		savePredictionMode(fromUrl);
	});

	function handlePredictionToggle(checked: boolean) {
		predictionMode = checked;
		savePredictionMode(checked);
		const url = new URL(page.url);
		url.searchParams.set('prediction', checked ? '1' : '0');
		// path uses resolve() + search; rule flags goto(resolve(x)+y) pattern
		/* eslint-disable-next-line svelte/no-navigation-without-resolve */
		goto(resolve(url.pathname as import('$app/types').Pathname) + url.search, { replaceState: true });
	}

	const locale = $derived(page.params.locale ?? 'en');
	const todayStart = $derived(new SvelteDate(getStartOfTodayMs()));

	const timezone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;
	const timesheetsQuery = createQuery(() => ({
		queryKey: ['timesheets', 'capacity', teamId, MONTHS_BACK],
		queryFn: async () => {
			const tz = timezone ? `&timezone=${encodeURIComponent(timezone)}` : '';
			const res = await fetch(`/api/timesheets?teamId=${teamId}&monthsBack=${MONTHS_BACK}${tz}`);
			if (!res.ok) throw new Error(await res.text());
			const data = await res.json();
			return data.usersTimesheets ?? [];
		},
		enabled: !!teamId && !predictionMode
	}));

	const usersTimesheets = $derived(timesheetsQuery.data ?? []);

	const estimatedCapacityQuery = createQuery(() => ({
		queryKey: ['estimated-capacity', teamId],
		queryFn: async () => {
			const res = await fetch(`/api/teams/${teamId}/estimated-capacity`);
			if (!res.ok) throw new Error(await res.text());
			const data = await res.json();
			return data.tasks as Array<{ id: string; name: string; custom_id?: string; time_estimate: number }>;
		},
		enabled: !!teamId && predictionMode
	}));

	const estimatedTasks = $derived(estimatedCapacityQuery.data ?? []);

	const hoursByDay = $derived.by(() => {
		const merged: Record<string, DayDetails> = {};
		for (const { hoursByDay: userHours } of usersTimesheets) {
			for (const [dayKey, dayDetails] of Object.entries(userHours) as [string, DayDetails][]) {
				if (!merged[dayKey]) merged[dayKey] = { total: 0, tasks: [] };
				merged[dayKey].total += dayDetails.total;
				for (const task of dayDetails.tasks) {
					const taskId = task.id;
					const taskName = task.name;
					const existing = merged[dayKey].tasks.find(
						(t) => (taskId && t.id === taskId) || (!taskId && t.name === taskName)
					);
					if (existing) {
						existing.hours += task.hours;
						if (task.custom_id) existing.custom_id = task.custom_id;
					} else {
						merged[dayKey].tasks.push({ ...task });
					}
				}
			}
		}
		return merged;
	});

	const taskSlots = $derived(buildTaskSlotsFromEstimatedTasks(estimatedTasks, MAX_HOURS));

	const taskByDate = $derived.by(() =>
		assignSlotsToFutureWorkingDays(getStartOfTodayMs(), taskSlots, MONTHS_FUTURE)
	);

	const gridData = $derived.by(() => {
		const now = new Date();
		const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		// In prediction mode: only next 3 months, no history. Otherwise: last 12 months ending today.
		let startMonday: Date;
		let gridEndDate: Date;
		if (predictionMode) {
			const startDay = endDate.getDay();
			const mondayOffset = startDay === 0 ? -6 : 1 - startDay;
			startMonday = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + mondayOffset);
			gridEndDate = new Date(endDate.getFullYear(), endDate.getMonth() + MONTHS_FUTURE, endDate.getDate());
		} else {
			const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - MONTHS_BACK, 1);
			const startDay = startDate.getDay();
			const mondayOffset = startDay === 0 ? -6 : 1 - startDay;
			startMonday = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + mondayOffset);
			gridEndDate = endDate;
		}
		const endDay = gridEndDate.getDay();
		const sundayOffset = endDay === 0 ? 0 : 7 - endDay;
		const endSunday = new Date(gridEndDate.getFullYear(), gridEndDate.getMonth(), gridEndDate.getDate() + sundayOffset, 23, 59, 59, 999);
		const totalDays = Math.ceil((endSunday.getTime() - startMonday.getTime()) / (24 * 60 * 60 * 1000)) + 1;
		const numWeeks = Math.ceil(totalDays / 7);
		const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
		const dayLabels = Array.from({ length: 7 }, (_, i) =>
			dayFormatter.format(new Date(startMonday.getFullYear(), startMonday.getMonth(), startMonday.getDate() + i))
		);
		const rows: {
			dayLabel: string;
			cells: { dateKey: string; date: Date; dayNum: number; details: DayDetails | null; effectiveHours: number }[];
		}[] = [];

		for (let row = 0; row < 7; row++) {
			const cells: { dateKey: string; date: Date; dayNum: number; details: DayDetails | null; effectiveHours: number }[] = [];
			for (let col = 0; col < numWeeks; col++) {
				const date = new Date(startMonday.getFullYear(), startMonday.getMonth(), startMonday.getDate() + col * 7 + row);
				if (date > endSunday || date < startMonday) {
					cells.push({ dateKey: '', date, dayNum: 0, details: null, effectiveHours: 0 });
				} else {
					const dateKey = toLocalDateKey(date);
					const details = predictionMode
						? (taskByDate[dateKey] ?? null)
						: (hoursByDay[dateKey] ?? null);
					const effectiveHours = details?.total ?? 0;
					cells.push({
						dateKey,
						date,
						dayNum: date.getDate(),
						details,
						effectiveHours
					});
				}
			}
			rows.push({ dayLabel: dayLabels[row], cells });
		}

		const monthLabels: { label: string; col: number }[] = [];
		let lastMonth = -1;
		for (let col = 0; col < numWeeks; col++) {
			const date = new Date(startMonday.getFullYear(), startMonday.getMonth(), startMonday.getDate() + col * 7);
			const m = date.getMonth();
			if (m !== lastMonth) {
				monthLabels.push({
					label: new Intl.DateTimeFormat(locale, { month: 'short' }).format(date),
					col
				});
				lastMonth = m;
			}
		}
		return { rows, monthLabels, numWeeks };
	});

	function getCellColor(hours: number, isPrediction: boolean): string {
		const prefix = isPrediction ? 'capacity-pred' : 'capacity-cell';
		if (hours <= 0) return `var(--${prefix}-empty)`;
		if (hours > MAX_HOURS) return `var(--${prefix}-over)`;
		const level = Math.min(4, Math.ceil((hours / MAX_HOURS) * 4));
		return `var(--${prefix}-${level})`;
	}
</script>

<div class="capacity-grid-wrapper">
	<div class="capacity-grid-header">
		<span class="capacity-grid-title">
			{predictionMode ? m.capacity_grid_title_prediction() : m.capacity_grid_title()}
		</span>
		<label class="flex items-center gap-2 cursor-pointer shrink-0">
			<span class="text-sm text-muted-foreground whitespace-nowrap">{m.capacity_prediction_toggle()}</span>
			<Switch checked={predictionMode} onCheckedChange={handlePredictionToggle} />
		</label>
	</div>

	{#if timesheetsQuery.isError || (predictionMode && estimatedCapacityQuery.isError)}
		<p class="text-destructive text-sm py-4">
			{m.error_timesheet({ message: (predictionMode ? estimatedCapacityQuery.error : timesheetsQuery.error)?.message ?? '' })}
		</p>
	{:else}
		<Tooltip.Provider>
			<div class="capacity-grid-container">
				<div class="capacity-grid-side">
					<div class="capacity-month-spacer"></div>
					<div
						class="capacity-day-labels"
						style="--cell-size: {CELL_SIZE}; --cell-gap: {CELL_GAP}"
					>
						{#each gridData.rows as row, ri (ri)}
							<span class="capacity-day-label">{row.dayLabel}</span>
						{/each}
					</div>
				</div>
				<div class="capacity-grid-scroll">
					<div
						class="capacity-month-labels"
						style="--grid-cols: {gridData.numWeeks}; --cell-size: {CELL_SIZE}; --cell-gap: {CELL_GAP}"
					>
						{#each gridData.monthLabels as ml (ml.label + ml.col)}
							<span class="capacity-month-label" style="grid-column: {ml.col + 1}">
								{#if (predictionMode ? estimatedCapacityQuery.isPending : timesheetsQuery.isPending)}
									<Skeleton class="h-full w-full rounded" />
								{:else}
									{ml.label}
								{/if}
							</span>
						{/each}
					</div>
					<div
						class="capacity-grid"
						style="--grid-cols: {gridData.numWeeks}; --cell-size: {CELL_SIZE}; --cell-gap: {CELL_GAP}"
					>
						{#each gridData.rows as row, ri (ri)}
							{#each row.cells as cell, ci (cell.dateKey || `${ri}-${ci}`)}
								{@const hours = cell.effectiveHours}
								{@const hasData = !!cell.dateKey}
								<div
									class="capacity-cell-wrapper"
									style="grid-row: {ri + 1}; grid-column: {ci + 1}"
								>
									{#if hasData}
										{#if (predictionMode ? estimatedCapacityQuery.isPending : timesheetsQuery.isPending)}
											<Skeleton class="capacity-cell absolute inset-0 w-full h-full rounded-[2px]" />
										{:else}
											<Tooltip.Root>
												<Tooltip.Trigger
													class="capacity-cell capacity-cell-empty absolute inset-0 w-full h-full cursor-default rounded-[2px]"
													style="background-color: {getCellColor(hours, predictionMode)}"
													aria-label="{cell.dayNum}. {cell.dateKey}"
												/>
												<Tooltip.Content
													class="!bg-white !text-foreground border border-border shadow-lg"
													arrowClasses="!bg-white"
													side="top"
												>
													{#if cell.details?.tasks?.length}
														<div class="min-w-48 space-y-1.5 py-0.5">
															<div class="font-medium text-xs border-b border-border pb-1 mb-1">
																{cell.dayNum}. {cell.dateKey}
																{#if predictionMode && cell.date >= todayStart}
																	<span class="text-muted-foreground font-normal"> {m.capacity_predicted()}</span>
																{/if}
															</div>
															{#each cell.details.tasks as task, i ((task.id ?? task.name) + '-' + i)}
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
														{#if predictionMode && cell.date >= todayStart}
															<span class="text-muted-foreground"> {m.capacity_predicted()}</span>
														{/if}
													</span>
												{/if}
												</Tooltip.Content>
											</Tooltip.Root>
										{/if}
									{:else}
										<div class="capacity-cell capacity-cell-empty" aria-hidden="true"></div>
									{/if}
								</div>
							{/each}
						{/each}
					</div>
				</div>
			</div>
			<div class="capacity-grid-legend">
				<span class="text-xs text-muted-foreground">{m.capacity_legend_less()}</span>
				<div class="legend-swatches">
					<span
						class="legend-swatch"
						style="background-color: var(--{predictionMode ? 'capacity-pred' : 'capacity-cell'}-empty)"
					></span>
					<span
						class="legend-swatch"
						style="background-color: var(--{predictionMode ? 'capacity-pred' : 'capacity-cell'}-1)"
					></span>
					<span
						class="legend-swatch"
						style="background-color: var(--{predictionMode ? 'capacity-pred' : 'capacity-cell'}-2)"
					></span>
					<span
						class="legend-swatch"
						style="background-color: var(--{predictionMode ? 'capacity-pred' : 'capacity-cell'}-3)"
					></span>
					<span
						class="legend-swatch"
						style="background-color: var(--{predictionMode ? 'capacity-pred' : 'capacity-cell'}-4)"
					></span>
					<span
						class="legend-swatch legend-swatch-over"
						style="background-color: var(--{predictionMode ? 'capacity-pred' : 'capacity-cell'}-over)"
					></span>
				</div>
				<span class="text-xs text-muted-foreground">{m.capacity_legend_more()}</span>
			</div>
		</Tooltip.Provider>
	{/if}
</div>

<style>
	.capacity-grid-wrapper {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
		max-width: 100%;
	}

	.capacity-grid-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.capacity-grid-title {
		font-weight: 600;
		font-size: 0.875rem;
	}

	.capacity-grid-container {
		display: flex;
		gap: 0.75rem;
		align-items: stretch;
		min-width: 0;
	}

	.capacity-grid-side {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		flex-shrink: 0;
	}

	.capacity-month-spacer {
		height: 26px;
		flex-shrink: 0;
	}

	.capacity-day-labels {
		display: grid;
		grid-template-rows: repeat(7, var(--cell-size, 1rem));
		gap: 2px;
		height: calc(7 * var(--cell-size, 1rem) + 6 * var(--cell-gap, 2px));
		padding: 0 var(--cell-gap, 2px) 0 0;
	}

	.capacity-day-label {
		font-size: 0.65rem;
		color: var(--muted-foreground);
		line-height: var(--cell-size, 1rem);
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}

	.capacity-grid-scroll {
		overflow-x: auto;
		overflow-y: hidden;
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		padding: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
		flex: 1;
	}

	.capacity-month-labels {
		display: grid;
		grid-template-columns: repeat(var(--grid-cols), minmax(var(--cell-size, 1rem), 1fr));
		gap: var(--cell-gap, 2px);
		width: 100%;
		height: var(--cell-size, 1rem);
		position: relative;
	}

	.capacity-month-label {
		font-size: 0.65rem;
		color: var(--muted-foreground);
		grid-row: 1;
		line-height: var(--cell-size, 1rem);
	}

	.capacity-grid {
		display: grid;
		grid-template-columns: repeat(var(--grid-cols), minmax(var(--cell-size, 1rem), 1fr));
		grid-template-rows: repeat(7, var(--cell-size, 1rem));
		gap: var(--cell-gap, 2px);
		width: 100%;
		min-width: max-content;
	}

	.capacity-cell-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
		min-width: var(--cell-size, 1rem);
		min-height: var(--cell-size, 1rem);
	}

	.capacity-cell {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 2px;
		cursor: default;
		transition: outline 0.1s;
	}

	.capacity-cell:hover {
		outline: 1px solid var(--border);
		outline-offset: 1px;
	}

	.capacity-cell-empty {
		background-color: var(--capacity-cell-empty);
	}

	.capacity-grid-legend {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
	}

	.legend-swatches {
		display: flex;
		gap: 2px;
		align-items: center;
	}

	.legend-swatch {
		width: 1rem;
		height: 1rem;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.legend-swatch-over {
		margin-left: 0.25rem;
		border-left: 1px solid var(--border);
		padding-left: 0.25rem;
	}
</style>
