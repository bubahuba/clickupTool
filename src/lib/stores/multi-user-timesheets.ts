import { persisted } from 'svelte-persisted-store';

const STORAGE_KEY = 'clickuptool-multi-user-timesheets-allowed';

/**
 * When false, user cannot view other users' timesheets (Workspace Admin required).
 * Set to false on 403 from timesheets API with multi-user request.
 * Persisted across visits. Reset to true on logout.
 */
export const multiUserTimesheetsAllowed = persisted<boolean>(STORAGE_KEY, true);
