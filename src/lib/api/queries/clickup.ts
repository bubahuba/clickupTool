import { createQueryKeys } from '@lukemorales/query-key-factory';

export const clickUpQueryKeys = createQueryKeys('clickup', {
	user: null,
	teams: null,
	timesheets: (teamId: string, year: string, month: string) => ({
		queryKey: [teamId, year, month]
	})
});
