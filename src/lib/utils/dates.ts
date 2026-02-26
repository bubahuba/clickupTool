/** Check if date is Saturday (6) or Sunday (0). */
export function isWeekend(date: Date): boolean {
	const dow = date.getDay();
	return dow === 0 || dow === 6;
}

/** Set time to 00:00:00.000. Returns new Date. */
export function getStartOfDay(date: Date): Date {
	const result = new Date(date);
	result.setHours(0, 0, 0, 0);
	return result;
}

/** Set time to 23:59:59.999. Returns new Date. */
export function getEndOfDay(date: Date): Date {
	const result = new Date(date);
	result.setHours(23, 59, 59, 999);
	return result;
}

/** Validate date value. */
export function isValidDate(
	ts: number | string | Date | undefined | null
): boolean {
	if (ts == null || ts === '') return false;
	if (ts instanceof Date) return !Number.isNaN(ts.getTime());
	if (typeof ts === 'string') {
		const parsed = Number(ts);
		if (!Number.isNaN(parsed)) {
			const ms = parsed < 1e12 ? parsed * 1000 : parsed;
			return !Number.isNaN(new Date(ms).getTime());
		}
	}
	if (typeof ts === 'number') {
		const ms = ts < 1e12 ? ts * 1000 : ts;
		return !Number.isNaN(new Date(ms).getTime());
	}
	const date = new Date(ts);
	return !Number.isNaN(date.getTime());
}

/** Get previous month. Handles year rollover. */
export function getPrevMonth(
	year: number,
	month: number
): { year: number; month: number } {
	return month === 0
		? { year: year - 1, month: 11 }
		: { year, month: month - 1 };
}

/** Get next month. Handles year rollover. */
export function getNextMonth(
	year: number,
	month: number
): { year: number; month: number } {
	return month === 11
		? { year: year + 1, month: 0 }
		: { year, month: month + 1 };
}

/** Format date as YYYY-MM-DD in a specific timezone. */
export function toDateKeyInTimezone(date: Date, timezone?: string): string {
	if (timezone) {
		const formatter = new Intl.DateTimeFormat('en-CA', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
		return formatter.format(date);
	}
	const year = date.getFullYear();
	const monthPadded = String(date.getMonth() + 1).padStart(2, '0');
	const dayPadded = String(date.getDate()).padStart(2, '0');
	return `${year}-${monthPadded}-${dayPadded}`;
}

/** Format date for day-cell tooltips: localized e.g. "út 31. bře" (weekday day month) */
export function formatDayCellLabel(date: Date, locale: string): string {
	const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
	const day = new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date);
	const month = new Intl.DateTimeFormat(locale, { month: 'short' }).format(date);
	return `${weekday} ${day} ${month}`;
}

/** Parse API timestamp to Date, handling ClickUp formats (seconds/ms, string/number). Returns null if invalid. */
function parseCommentTimestamp(
	ts: number | string | Date | undefined | null
): Date | null {
	if (ts == null || ts === '') return null;
	let date: Date;
	if (ts instanceof Date) {
		date = ts;
	} else if (typeof ts === 'number') {
		date = new Date(ts < 1e12 ? ts * 1000 : ts);
	} else if (typeof ts === 'string') {
		const parsed = Number(ts);
		date = Number.isNaN(parsed)
			? new Date(ts)
			: new Date(parsed < 1e12 ? parsed * 1000 : parsed);
	} else {
		date = new Date(ts);
	}
	return Number.isNaN(date.getTime()) ? null : date;
}

/** Return ISO string for datetime attribute, or '' if invalid. Handles ClickUp timestamp formats. */
export function toISOStringSafe(
	ts: number | string | Date | undefined | null
): string {
	const date = parseCommentTimestamp(ts);
	return date ? date.toISOString() : '';
}

/** Format date with time for comments: localized e.g. "út 31. bře. 14:30" */
export function formatCommentDateTime(
	ts: number | string | Date | undefined | null,
	locale: string
): string {
	const date = parseCommentTimestamp(ts);
	if (!date) return '';
	const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
	const day = new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date);
	const month = new Intl.DateTimeFormat(locale, { month: 'short' }).format(date);
	const time = new Intl.DateTimeFormat(locale, {
		hour: 'numeric',
		minute: '2-digit'
	}).format(date);
	return `${weekday} ${day} ${month} ${time}`;
}
