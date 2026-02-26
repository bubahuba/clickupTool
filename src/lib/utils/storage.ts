/** Get boolean from sessionStorage ("1"/"0"). */
export function getSessionStorageBoolean(
	key: string,
	defaultValue = false
): boolean {
	if (typeof window === 'undefined') return defaultValue;
	try {
		return sessionStorage.getItem(key) === '1';
	} catch {
		return defaultValue;
	}
}

/** Store boolean in sessionStorage ("1"/"0"). */
export function setSessionStorageBoolean(key: string, value: boolean): void {
	try {
		sessionStorage.setItem(key, value ? '1' : '0');
	} catch {
		// ignore
	}
}
