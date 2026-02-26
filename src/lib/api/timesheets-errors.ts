/** Thrown when API returns 403 - user lacks Workspace Admin permission to view others' timesheets */
export class MultiUserTimesheetsForbiddenError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'MultiUserTimesheetsForbiddenError';
	}
}
