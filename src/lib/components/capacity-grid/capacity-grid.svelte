<script lang="ts">
	import { createQuery } from "@tanstack/svelte-query";
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { SvelteDate } from "svelte/reactivity";
	import * as m from "$lib/paraglide/messages.js";
	import * as Tooltip from "$lib/components/ui/tooltip/index.js";
	import { Switch } from "$lib/components/ui/switch/index.js";
	import { fade } from "svelte/transition";
	import {
		cn,
		toLocalDateKey,
		formatDayCellLabel,
		formatHoursWithUnit,
		getSessionStorageBoolean,
		setSessionStorageBoolean,
		getTaskDisplayId,
	} from "$lib/utils.js";
	import {
		assignSlotsToFutureWorkingDays,
		buildTaskSlotsFromEstimatedTasks,
		getStartOfTodayMs,
		MAX_HOURS_DEFAULT,
	} from "$lib/utils/estimatePrediction.js";
	import type { DayDetails } from "$lib/components/timesheet-table/types.js";

	const PREDICTION_STORAGE_KEY = "capacity-prediction-mode";

	function loadPredictionMode(): boolean {
		return getSessionStorageBoolean(PREDICTION_STORAGE_KEY, false);
	}

	function savePredictionMode(value: boolean): void {
		setSessionStorageBoolean(PREDICTION_STORAGE_KEY, value);
	}

	interface Props {
		teamId: string;
		class?: string;
		isLoading?: boolean;
		error?: Error | null;
	}

	const MAX_HOURS = MAX_HOURS_DEFAULT;
	const MONTHS_BACK = 12;
	const MONTHS_FUTURE = 12; // prediction mode: next 12 months (full year)
	const CELL_SIZE = "1rem";
	const CELL_GAP = "2px";

	let {
		teamId,
		class: className,
		isLoading: _isLoading = false,
		error: _error = null,
	}: Props = $props();
	let predictionMode = $state(loadPredictionMode());

	// Sync from URL when it has prediction param (e.g. back/forward)
	$effect(() => {
		if (typeof window === "undefined") return;
		const param = page.url.searchParams.get("prediction");
		if (param === null) return; // no param: keep sessionStorage value
		const fromUrl = param === "1";
		if (fromUrl !== predictionMode) predictionMode = fromUrl;
		savePredictionMode(fromUrl);
	});

	function handlePredictionToggle(checked: boolean) {
		predictionMode = checked;
		savePredictionMode(checked);
		const url = new URL(page.url);
		url.searchParams.set("prediction", checked ? "1" : "0");
		goto(
			resolve(
				(url.pathname + url.search) as import("$app/types").Pathname,
			),
			{
				replaceState: true,
			},
		);
	}

	const locale = $derived(page.params.locale ?? "en");
	const todayStart = $derived(new SvelteDate(getStartOfTodayMs()));

	const timezone =
		typeof Intl !== "undefined"
			? Intl.DateTimeFormat().resolvedOptions().timeZone
			: undefined;
	const timesheetsQuery = createQuery(() => ({
		queryKey: ["timesheets", "capacity", teamId, MONTHS_BACK],
		queryFn: async () => {
			const timezoneParam = timezone
				? `&timezone=${encodeURIComponent(timezone)}`
				: "";
			const res = await fetch(
				`/api/timesheets?teamId=${teamId}&monthsBack=${MONTHS_BACK}${timezoneParam}`,
			);
			if (!res.ok) throw new Error(await res.text());
			const data = await res.json();
			return data.usersTimesheets ?? [];
		},
		enabled: !!teamId && !predictionMode,
	}));

	const usersTimesheets = $derived(timesheetsQuery.data ?? []);

	const estimatedCapacityQuery = createQuery(() => ({
		queryKey: ["estimated-capacity", teamId],
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
		enabled: !!teamId && predictionMode,
	}));

	const estimatedTasks = $derived(estimatedCapacityQuery.data ?? []);

	const hoursByDay = $derived.by(() => {
		const merged: Record<string, DayDetails> = {};
		for (const { hoursByDay: userHours } of usersTimesheets) {
			for (const [dayKey, dayDetails] of Object.entries(userHours) as [
				string,
				DayDetails,
			][]) {
				if (!merged[dayKey]) merged[dayKey] = { total: 0, tasks: [] };
				merged[dayKey].total += dayDetails.total;
				for (const task of dayDetails.tasks) {
					const taskId = task.id;
					const taskName = task.name;
					const existing = merged[dayKey].tasks.find(
						(existingTask) =>
							(taskId && existingTask.id === taskId) ||
							(!taskId && existingTask.name === taskName),
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

	const taskSlots = $derived(
		buildTaskSlotsFromEstimatedTasks(estimatedTasks, MAX_HOURS),
	);

	const taskByDate = $derived.by(() =>
		assignSlotsToFutureWorkingDays(
			getStartOfTodayMs(),
			taskSlots,
			MONTHS_FUTURE,
		),
	);

	const gridData = $derived.by(() => {
		const now = new Date();
		const endDate = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		);
		// In prediction mode: next 12 months, no history. Otherwise: last 12 months ending today.
		let startMonday: Date;
		let gridEndDate: Date;
		if (predictionMode) {
			const startDay = endDate.getDay();
			const mondayOffset = startDay === 0 ? -6 : 1 - startDay;
			startMonday = new Date(
				endDate.getFullYear(),
				endDate.getMonth(),
				endDate.getDate() + mondayOffset,
			);
			gridEndDate = new Date(
				endDate.getFullYear(),
				endDate.getMonth() + MONTHS_FUTURE,
				endDate.getDate(),
			);
		} else {
			const startDate = new Date(
				endDate.getFullYear(),
				endDate.getMonth() - MONTHS_BACK,
				1,
			);
			const startDay = startDate.getDay();
			const mondayOffset = startDay === 0 ? -6 : 1 - startDay;
			startMonday = new Date(
				startDate.getFullYear(),
				startDate.getMonth(),
				startDate.getDate() + mondayOffset,
			);
			gridEndDate = endDate;
		}
		const endDay = gridEndDate.getDay();
		const sundayOffset = endDay === 0 ? 0 : 7 - endDay;
		const endSunday = new Date(
			gridEndDate.getFullYear(),
			gridEndDate.getMonth(),
			gridEndDate.getDate() + sundayOffset,
			23,
			59,
			59,
			999,
		);
		const totalDays =
			Math.ceil(
				(endSunday.getTime() - startMonday.getTime()) /
					(24 * 60 * 60 * 1000),
			) + 1;
		const numWeeks = Math.ceil(totalDays / 7);
		const dayFormatter = new Intl.DateTimeFormat(locale, {
			weekday: "short",
		});
		const dayLabels = Array.from({ length: 7 }, (_, dayIndex) =>
			dayFormatter.format(
				new Date(
					startMonday.getFullYear(),
					startMonday.getMonth(),
					startMonday.getDate() + dayIndex,
				),
			),
		);
		const rows: {
			dayLabel: string;
			cells: {
				dateKey: string;
				date: Date;
				dayNum: number;
				details: DayDetails | null;
				effectiveHours: number;
			}[];
		}[] = [];

		for (let row = 0; row < 7; row++) {
			const cells: {
				dateKey: string;
				date: Date;
				dayNum: number;
				details: DayDetails | null;
				effectiveHours: number;
			}[] = [];
			for (let col = 0; col < numWeeks; col++) {
				const date = new Date(
					startMonday.getFullYear(),
					startMonday.getMonth(),
					startMonday.getDate() + col * 7 + row,
				);
				if (date > endSunday || date < startMonday) {
					cells.push({
						dateKey: "",
						date,
						dayNum: 0,
						details: null,
						effectiveHours: 0,
					});
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
						effectiveHours,
					});
				}
			}
			rows.push({ dayLabel: dayLabels[row], cells });
		}

		const monthLabels: { label: string; col: number }[] = [];
		let lastMonth = -1;
		for (let col = 0; col < numWeeks; col++) {
			const date = new Date(
				startMonday.getFullYear(),
				startMonday.getMonth(),
				startMonday.getDate() + col * 7,
			);
			const currentMonth = date.getMonth();
			if (currentMonth !== lastMonth) {
				monthLabels.push({
					label: new Intl.DateTimeFormat(locale, {
						month: "short",
					}).format(date),
					col,
				});
				lastMonth = currentMonth;
			}
		}
		return { rows, monthLabels, numWeeks };
	});

	function getCellColor(hours: number, isPrediction: boolean): string {
		const prefix = isPrediction ? "capacity-pred" : "capacity-cell";
		if (hours <= 0) return `var(--${prefix}-empty)`;
		if (hours > MAX_HOURS) return `var(--${prefix}-over)`;
		const level = Math.min(4, Math.ceil((hours / MAX_HOURS) * 4));
		return `var(--${prefix}-${level})`;
	}

	const fadeIn = { duration: 300 };
</script>

<div class={cn("flex flex-col gap-4 min-w-0 max-w-full", className)}>
	<div class="flex items-center justify-between gap-2">
		<div class="flex items-center gap-4 flex-wrap">
			<span class="font-semibold text-sm">
				{predictionMode
					? m.capacity_grid_title_prediction()
					: m.capacity_grid_title()}
			</span>

			<div class="flex items-center gap-2 text-xs">
				<span class="text-muted-foreground"
					>{m.capacity_legend_less()}</span
				>
				<div class="flex gap-0.5 items-center">
					<span
						class="w-4 h-4 rounded-[2px] shrink-0 {predictionMode
							? 'bg-[var(--capacity-pred-empty)]'
							: 'bg-[var(--capacity-cell-empty)]'}"
					></span>
					<span
						class="w-4 h-4 rounded-[2px] shrink-0 {predictionMode
							? 'bg-[var(--capacity-pred-1)]'
							: 'bg-[var(--capacity-cell-1)]'}"
					></span>
					<span
						class="w-4 h-4 rounded-[2px] shrink-0 {predictionMode
							? 'bg-[var(--capacity-pred-2)]'
							: 'bg-[var(--capacity-cell-2)]'}"
					></span>
					<span
						class="w-4 h-4 rounded-[2px] shrink-0 {predictionMode
							? 'bg-[var(--capacity-pred-3)]'
							: 'bg-[var(--capacity-cell-3)]'}"
					></span>
					<span
						class="w-4 h-4 rounded-[2px] shrink-0 {predictionMode
							? 'bg-[var(--capacity-pred-4)]'
							: 'bg-[var(--capacity-cell-4)]'}"
					></span>
					<span
						class="w-4 h-4 rounded-[2px] shrink-0 ml-1 border-l border-border pl-1 {predictionMode
							? 'bg-[var(--capacity-pred-over)]'
							: 'bg-[var(--capacity-cell-over)]'}"
					></span>
				</div>
				<span class="text-muted-foreground"
					>{m.capacity_legend_more()}</span
				>
			</div>
		</div>
		<label class="flex items-center gap-2 cursor-pointer shrink-0">
			<span class="text-sm text-muted-foreground whitespace-nowrap"
				>{m.capacity_prediction_toggle()}</span
			>
			<Switch
				checked={predictionMode}
				onCheckedChange={handlePredictionToggle}
			/>
		</label>
	</div>

	{#if timesheetsQuery.isError || (predictionMode && estimatedCapacityQuery.isError)}
		<p class="text-destructive text-sm py-4">
			{m.error_timesheet({
				message:
					(predictionMode
						? estimatedCapacityQuery.error
						: timesheetsQuery.error
					)?.message ?? "",
			})}
		</p>
	{:else}
		<Tooltip.Provider>
			<div class="flex gap-3 items-stretch min-w-0">
				<div class="flex flex-col items-end shrink-0">
					<div class="h-[26px] shrink-0"></div>
					<div
						class="grid gap-[2px] pr-[var(--cell-gap,2px)]"
						style="--cell-size: {CELL_SIZE}; --cell-gap: {CELL_GAP}; grid-template-rows: repeat(7, var(--cell-size, 1rem)); height: calc(7 * var(--cell-size, 1rem) + 6 * var(--cell-gap, 2px));"
					>
						{#each gridData.rows as row, rowIndex (rowIndex)}
							<span
								class="text-[0.65rem] text-muted-foreground leading-[var(--cell-size,1rem)] flex items-center justify-end"
								>{row.dayLabel}</span
							>
						{/each}
					</div>
				</div>
				<div
					class="overflow-x-auto overflow-y-hidden border border-border rounded-md p-2 flex flex-col gap-1 min-w-0 flex-1"
				>
					<div
						class="grid w-full relative"
						style="--grid-cols: {gridData.numWeeks}; --cell-size: {CELL_SIZE}; --cell-gap: {CELL_GAP}; grid-template-columns: repeat(var(--grid-cols), minmax(var(--cell-size, 1rem), 1fr)); gap: var(--cell-gap, 2px); height: var(--cell-size, 1rem);"
					>
						{#each gridData.monthLabels as monthLabel, _monthIndex (monthLabel.label + monthLabel.col)}
							<span
								class="text-[0.65rem] text-muted-foreground grid-row-1 leading-[var(--cell-size,1rem)]"
								style="grid-column: {monthLabel.col + 1}"
							>
								{monthLabel.label}
							</span>
						{/each}
					</div>
					<div
						class="grid w-full min-w-max"
						style="--grid-cols: {gridData.numWeeks}; --cell-size: {CELL_SIZE}; --cell-gap: {CELL_GAP}; grid-template-columns: repeat(var(--grid-cols), minmax(var(--cell-size, 1rem), 1fr)); grid-template-rows: repeat(7, var(--cell-size, 1rem)); gap: var(--cell-gap, 2px);"
					>
						{#each gridData.rows as row, rowIndex (rowIndex)}
							{#each row.cells as cell, colIndex (cell.dateKey || `${row.dayLabel}-${colIndex}`)}
								{@const hours = cell.effectiveHours}
								{@const hasData = !!cell.dateKey}
								<div
									in:fade={{
										...fadeIn,
										delay: Math.random() * 1000,
									}}
									class="relative w-full h-full min-w-[var(--cell-size,1rem)] min-h-[var(--cell-size,1rem)] transition-background-color duration-300"
									style="grid-row: {rowIndex +
										1}; grid-column: {colIndex +
										1}; background-color: {getCellColor(
										hours,
										predictionMode,
									)}; transition-delay: {Math.random() * 1000}ms;"
								>
									{#if hasData}
										<Tooltip.Root>
											<Tooltip.Trigger
												class="block w-full h-full absolute inset-0 cursor-default rounded-[2px] hover:outline hover:outline-1 hover:outline-border hover:outline-offset-1 transition-[outline] duration-100"
												aria-label={formatDayCellLabel(
													cell.date,
													locale,
												)}
											/>
											<Tooltip.Content
												class="bg-card text-foreground border border-border shadow-lg"
												arrowClasses="bg-card"
												side="top"
											>
												{#if cell.details?.tasks?.length}
													<div
														class="min-w-48 space-y-1.5 py-0.5"
													>
														<div
															class="font-medium text-xs border-b border-border pb-1 mb-1"
														>
															{formatDayCellLabel(
																cell.date,
																locale,
															)}
															{#if predictionMode && cell.date >= todayStart}
																<span
																	class="text-muted-foreground font-normal"
																>
																	{m.capacity_predicted()}</span
																>
															{/if}
														</div>
														{#each cell.details.tasks as task, taskIndex ((task.id ?? task.name) + "-" + taskIndex)}
															<div
																class="flex justify-between gap-4 text-xs"
															>
																<span
																	class="truncate"
																>
																	{#if task.id}
																		<a
																			href={resolve(
																				`/${locale}/tasks-by-spaces/${task.id}`,
																			)}
																			class="hover:underline focus:outline-none focus:underline text-primary"
																		>
																			{#if getTaskDisplayId(task) !== "—"}
																				<span
																					class="font-bold"
																					>{getTaskDisplayId(
																						task,
																					)}</span
																				>
																				{task.name}
																			{:else}
																				{task.name}
																			{/if}
																		</a>
																	{:else if getTaskDisplayId(task) !== "—"}
																		<span
																			class="font-bold"
																			>{getTaskDisplayId(
																				task,
																			)}</span
																		>
																		{task.name}
																	{:else}
																		{task.name}
																	{/if}
																</span>
																<span
																	class="tabular-nums shrink-0"
																	>{formatHoursWithUnit(
																		task.hours,
																	)}</span
																>
															</div>
														{/each}
														<div
															class="flex justify-between gap-4 text-xs font-medium pt-1 border-t border-border"
														>
															<span
																>{m.tooltip_total()}</span
															>
															<span
																class="tabular-nums"
																>{formatHoursWithUnit(
																	hours,
																)}</span
															>
														</div>
													</div>
												{:else}
													<span class="text-xs">
														{hours > 0
															? formatHoursWithUnit(
																	hours,
																)
															: m.no_time_tracked()}
														{#if predictionMode && cell.date >= todayStart}
															<span
																class="text-muted-foreground"
															>
																{m.capacity_predicted()}</span
															>
														{/if}
													</span>
												{/if}
											</Tooltip.Content>
										</Tooltip.Root>
									{:else}
										<div
											class="block w-full h-full rounded-[2px] bg-[var(--capacity-cell-empty)]"
											aria-hidden="true"
										></div>
									{/if}
								</div>
							{/each}
						{/each}
					</div>
				</div>
			</div>
		</Tooltip.Provider>
	{/if}
</div>
