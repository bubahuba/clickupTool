import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/** Format date as YYYY-MM-DD using local timezone (not UTC). */
export function toLocalDateKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export {
	formatDayCellLabel,
	formatCommentDateTime,
	isWeekend,
	getStartOfDay,
	getEndOfDay,
	isValidDate,
	getPrevMonth,
	getNextMonth,
	toDateKeyInTimezone
} from './utils/dates.js';

export { formatHours, formatHoursFromMs, formatHoursWithUnit, hoursToMs } from './utils/numbers.js';
export { getInitials, getTaskDisplayId } from './utils/strings.js';
export {
	getSessionStorageBoolean,
	setSessionStorageBoolean
} from './utils/storage.js';
export { parseIntSafe, parseCommaSeparatedIds } from './utils/validation.js';

export type {
	WithElementRef,
	WithoutChild,
	WithoutChildren,
	WithoutChildrenOrChild
} from 'bits-ui';
