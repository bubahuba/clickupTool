import { toLocalDateKey } from '$lib/utils.js';
import type { DayDetails } from '$lib/components/timesheet-table/types.js';

export const MAX_HOURS_DEFAULT = 8;

export interface EstimatedTask {
	id: string;
	name: string;
	custom_id?: string;
	time_estimate: number; // milliseconds
}

export interface TaskSlot {
	id: string;
	name: string;
	custom_id?: string;
	hours: number;
}

/**
 * Split estimated tasks into 8h (or maxHours) chunks. Tasks <= maxHours = 1 slot;
 * tasks > maxHours = split into chunks across slots.
 */
export function buildTaskSlotsFromEstimatedTasks(
	estimatedTasks: EstimatedTask[],
	maxHours: number = MAX_HOURS_DEFAULT
): TaskSlot[] {
	const slots: TaskSlot[] = [];
	for (const task of estimatedTasks) {
		let remainingHours = task.time_estimate / (1000 * 60 * 60);
		if (remainingHours <= 0) continue;
		while (remainingHours > 0) {
			const chunkHours = Math.min(maxHours, remainingHours);
			slots.push({
				id: task.id,
				name: task.name,
				custom_id: task.custom_id,
				hours: chunkHours
			});
			remainingHours -= chunkHours;
		}
	}
	return slots;
}

/**
 * Assign one slot per future working day (Mon–Fri). Returns Record<dateKey, DayDetails>.
 * Uses same logic as capacity-grid: iterate from today, skip weekends, assign slots in order.
 */
export function assignSlotsToFutureWorkingDays(
	todayStartMs: number,
	taskSlots: TaskSlot[],
	monthsFuture: number = 3
): Record<string, DayDetails> {
	const today = new Date(todayStartMs);
	const futureEnd = new Date(
		today.getFullYear(),
		today.getMonth() + monthsFuture,
		today.getDate()
	);
	const result: Record<string, DayDetails> = {};
	const d = new Date(today);
	let slotIndex = 0;
	while (d <= futureEnd && slotIndex < taskSlots.length) {
		const dow = d.getDay();
		if (dow !== 0 && dow !== 6) {
			const slot = taskSlots[slotIndex];
			const dateKey = toLocalDateKey(d);
			result[dateKey] = {
				total: slot.hours,
				tasks: [
					{
						id: slot.id,
						custom_id: slot.custom_id,
						name: slot.name,
						hours: slot.hours
					}
				]
			};
			slotIndex++;
		}
		d.setDate(d.getDate() + 1);
	}
	return result;
}

/** Get start of today at 00:00:00 in local time (ms). */
export function getStartOfTodayMs(): number {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d.getTime();
}
