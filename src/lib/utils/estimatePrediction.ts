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
 * Build task slots for assignment. Tasks <= 8h stay as one slot (not split).
 * Tasks > 8h are split into 8h chunks plus a final remainder < 8h.
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
			// Tasks <= 8h: one slot. Tasks > 8h: 8h chunks, then remainder as one slot
			const chunkHours = remainingHours <= maxHours ? remainingHours : maxHours;
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
 * Assign slots to future working days (Mon–Fri). Packs multiple tasks into a day
 * if their sum fits within maxHours. Splits only tasks > 8h across days.
 * Returns Record<dateKey, DayDetails>.
 */
export function assignSlotsToFutureWorkingDays(
	todayStartMs: number,
	taskSlots: TaskSlot[],
	monthsFuture: number = 3,
	maxHours: number = MAX_HOURS_DEFAULT
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
			const dateKey = toLocalDateKey(d);
			const tasks: DayDetails['tasks'] = [];
			let capacityLeft = maxHours;
			// Pack slots into this day until full or next slot doesn't fit
			while (slotIndex < taskSlots.length && capacityLeft > 0) {
				const slot = taskSlots[slotIndex];
				if (slot.hours <= capacityLeft) {
					tasks.push({
						id: slot.id,
						custom_id: slot.custom_id,
						name: slot.name,
						hours: slot.hours
					});
					capacityLeft -= slot.hours;
					slotIndex++;
				} else {
					// Slot doesn't fit (don't split tasks < 8h); use next day
					break;
				}
			}
			if (tasks.length > 0) {
				result[dateKey] = {
					total: tasks.reduce((s, t) => s + t.hours, 0),
					tasks
				};
			}
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
