/** Safe parseInt with default value. */
export function parseIntSafe(
	value: string | number | undefined | null,
	radix = 10,
	defaultValue?: number
): number {
	if (value == null || value === '') {
		return defaultValue ?? NaN;
	}
	if (typeof value === 'number') {
		return Number.isNaN(value) ? (defaultValue ?? NaN) : Math.floor(value);
	}
	const n = parseInt(String(value).trim(), radix);
	return Number.isNaN(n) ? (defaultValue ?? NaN) : n;
}

/** Parse comma-separated IDs into number array. */
export function parseCommaSeparatedIds(
	param: string | null | undefined
): number[] {
	if (param == null || param === '') return [];
	return param
		.split(',')
		.map((segment) => parseInt(segment.trim(), 10))
		.filter((num) => !Number.isNaN(num));
}
