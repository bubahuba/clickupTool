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
	task?: { id: string; name?: string };
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
