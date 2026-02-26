/** ClickUp API types for team and time tracking endpoints */

export interface ClickUpTeamMember {
	user: {
		id: number | string;
		username: string;
		email?: string;
		color?: string;
		profilePicture?: string;
		initials?: string;
	};
}

export interface ClickUpTeam {
	id: number;
	name: string;
	members?: ClickUpTeamMember[];
}

export interface ClickUpAuthorizedTeamsResponse {
	teams: ClickUpTeam[];
}

export interface ClickUpTimeEntry {
	id: string;
	task?: { id: string; custom_id?: string; name?: string };
	user?: {
		id: number;
		username: string;
		email?: string;
		color?: string;
		initials?: string;
	};
	start: number; // ms
	end: number | null; // ms, null if running
	duration: number; // ms (negative if timer is running)
	billable?: boolean;
}

/** ClickUp may return { data: [...] } or the array directly */
export type ClickUpTimeEntriesResponse =
	| { data: ClickUpTimeEntry[] }
	| ClickUpTimeEntry[];

export interface ClickUpSpace {
	id: string;
	name: string;
	private?: boolean;
	statuses?: unknown[];
	archived?: boolean;
}

export interface ClickUpStatus {
	id?: string | number;
	status: string;
	color?: string;
	type?: string;
	orderindex?: number;
}

export interface ClickUpTask {
	id: string;
	custom_id?: string;
	name: string;
	description?: string;
	status?: ClickUpStatus;
	assignees?: Array<{ id: number; username: string; color?: string; initials?: string }>;
	url?: string;
	list?: { id: string; name: string };
	space?: { id: string; name: string };
	/** Time estimate in milliseconds */
	time_estimate?: number;
	/** Time spent/tracked in milliseconds (may be in API response) */
	time_spent?: number;
}

/** Legacy task time endpoint - returns tracked time entries for a task */
export interface ClickUpTaskTimeEntry {
	id: string;
	task_id: string;
	user_id: number;
	start: number;
	end: number;
	duration: number; // ms
}

export interface ClickUpTaskUpdatePayload {
	name?: string;
	description?: string;
	status?: string;
	assignees?: number[];
}

export interface ClickUpCommentUser {
	id: number;
	username: string;
	email?: string;
	color?: string;
	profilePicture?: string;
	initials?: string;
}

export interface ClickUpTaskComment {
	id: string;
	comment_text: string;
	user: ClickUpCommentUser;
	/** Unix timestamp in ms - ClickUp returns as string e.g. "1772134561016" */
	date?: number | string;
	date_added?: number | string;
	/**
	 * Rich text format - array of { text, attributes } objects.
	 * Use comment_text for plain text display.
	 */
	comment?: unknown[];
}

/** Response from GET /task/{id}/comment - may be array or { comments: [] } */
export type ClickUpTaskCommentsResponse =
	| { comments: ClickUpTaskComment[] }
	| ClickUpTaskComment[];
