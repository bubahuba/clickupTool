/** Format hours for display (whole numbers without decimal, otherwise 1 decimal). */
export function formatHours(hours: number): string {
	if (!hours || hours <= 0) return '0';
	return hours % 1 === 0 ? String(Math.round(hours)) : hours.toFixed(1);
}

/** Format hours with optional "h" unit. */
export function formatHoursWithUnit(hours: number, includeUnit = true): string {
	const str = formatHours(hours);
	return includeUnit ? `${str} h` : str;
}

/** Convert hours to milliseconds. */
export function hoursToMs(hours: number): number {
	return Math.round(hours * 60 * 60 * 1000);
}

/** Convert milliseconds to hours and format. */
export function formatHoursFromMs(ms: number): string {
	if (!ms || ms <= 0) return '0';
	const hours = ms / (1000 * 60 * 60);
	return formatHours(hours);
}
