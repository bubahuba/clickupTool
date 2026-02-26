import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/** Format date as YYYY-MM-DD using local timezone (not UTC). */
export function toLocalDateKey(date: Date): string {
	const year = date.getFullYear();
	const monthPadded = String(date.getMonth() + 1).padStart(2, '0');
	const dayPadded = String(date.getDate()).padStart(2, '0');
	return `${year}-${monthPadded}-${dayPadded}`;
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
	toDateKeyInTimezone,
	toISOStringSafe
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
