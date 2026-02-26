import { persisted } from 'svelte-persisted-store';

export const spaceSectionsExpanded = persisted<Record<string, boolean>>(
	'clickuptool-tasks-by-spaces-expanded',
	{}
);
