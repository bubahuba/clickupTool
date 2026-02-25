/** User for timesheet display */
export interface TimesheetUser {
	id: number;
	username: string;
	initials?: string;
	color?: string;
}

/** Task with hours tracked on a day */
export interface DayTask {
	id?: string;
	name: string;
	hours: number;
}

/** Per-day breakdown: total hours and list of tasks */
export interface DayDetails {
	total: number;
	tasks: DayTask[];
}

/** Hours tracked per day: date string (YYYY-MM-DD) -> day details */
export type DailyHours = Record<string, DayDetails>;

/** User with their timesheet data for a month */
export interface UserTimesheet {
	user: TimesheetUser;
	hoursByDay: DailyHours;
}
