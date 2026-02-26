/** Generate initials from username (first+last name or first 2 chars). */
export function getInitials(username: string, providedInitials?: string): string {
	if (providedInitials) return providedInitials;
	const parts = username.trim().split(/\s+/);
	if (parts.length >= 2) {
		return (parts[0][0] + parts[1][0]).toUpperCase();
	}
	const s = username.trim();
	return s.slice(0, 2).toUpperCase() || (s[0]?.toUpperCase() ?? '?');
}

/** Get display ID for a task (custom_id ?? id). */
export function getTaskDisplayId(task: {
	custom_id?: string | null;
	id?: string | null;
}): string {
	return task.custom_id ?? task.id ?? '—';
}
