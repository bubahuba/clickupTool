import type { ClickUpStatus } from './clickup-types.js';

const CLOSED_STATUS_NAMES = ['complete', 'closed', 'done', 'finished', 'resolved'];

/**
 * Returns true if the status represents a closed/done task.
 * Matches by type ("closed" or "done") or by status name (complete, closed, done, etc.).
 */
export function isStatusClosed(status: ClickUpStatus | { type?: string; status?: string } | null | undefined): boolean {
	if (!status?.status) return false;
	const type = (status as { type?: string }).type;
	if (type === 'closed' || type === 'done') return true;
	const name = String(status.status).toLowerCase();
	return CLOSED_STATUS_NAMES.includes(name);
}

/** First closed-type status from a list (for "mark as closed" action). */
export function getClosedStatus(
	statuses: Array<{ type?: string; status: string; orderindex?: number }> | null | undefined
): { status: string } | null {
	const list = statuses ?? [];
	const byType = list.find((status) => status.type === 'closed' || status.type === 'done');
	if (byType) return byType;
	return list.find((status) => CLOSED_STATUS_NAMES.includes(status.status?.toLowerCase?.() ?? '')) ?? null;
}
