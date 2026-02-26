import { persisted } from 'svelte-persisted-store';

/** Keys: `${spaceId}:${statusKey}` -> boolean. Status groups default to expanded (true). */
export const statusGroupsExpanded = persisted<Record<string, boolean>>(
	'clickuptool-status-groups-expanded',
	{}
);
