import { createQueryKeys } from '@lukemorales/query-key-factory';

export const clickUpQueryKeys = createQueryKeys('clickup', {
	user: null,
	teams: null,
	timesheets: (teamId: string, year: string, month: string) => ({
		queryKey: [teamId, year, month]
	}),
	spaces: (teamId: string) => ({ queryKey: [teamId] }),
	tasksBySpace: (teamId: string, spaceId: string) => ({
		queryKey: [teamId, spaceId]
	}),
	task: (taskId: string) => ({ queryKey: [taskId] }),
	taskDetail: (taskId: string) => ({ queryKey: ['taskDetail', taskId] })
});
