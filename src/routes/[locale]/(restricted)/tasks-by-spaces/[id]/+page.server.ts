import { fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { taskFormSchema } from '$lib/forms/task.schema.js';
import {
	fetchClickUpTask,
	updateClickUpTask,
	fetchClickUpTaskComments,
	createClickUpTaskComment,
	fetchClickUpList,
	fetchClickUpSpace,
	fetchClickUpTaskTime
} from '$lib/api/clickup-fetch.js';
import type { ClickUpStatus } from '$lib/api/clickup-types.js';
import { getToken } from '$lib/auth/server.js';
import type { Actions, PageServerLoad } from './$types';

const commentFormSchema = z.object({ comment_text: z.string().min(1) });
/** Lenient schema for initial load – accepts empty so we don't show errors before submit */
const commentFormSchemaInit = z.object({ comment_text: z.string().default('') });

export const load: PageServerLoad = async (event) => {
	const token = getToken(event);
	if (!token) {
		return {
			form: await superValidate({ name: '', description: '' }, zod(taskFormSchema)),
			comments: [],
			commentForm: await superValidate({ comment_text: '' }, zod(commentFormSchemaInit)),
			statuses: []
		};
	}

	const { id } = event.params;
	try {
		const [task, comments, timeResult] = await Promise.all([
			fetchClickUpTask(token, id),
			fetchClickUpTaskComments(token, id),
			fetchClickUpTaskTime(token, id)
		]);

		// Fetch available statuses from list (or space as fallback)
		let statuses: ClickUpStatus[] = [];
		if (task.list?.id || task.space?.id) {
			try {
				if (task.list?.id) {
					const list = await fetchClickUpList(token, task.list.id);
					statuses = list.statuses ?? (list.status ? [list.status] : []);
				}
				if (statuses.length === 0 && task.space?.id) {
					const space = await fetchClickUpSpace(token, task.space.id);
					statuses = space.statuses ?? [];
				}
				// Fallback: ensure current task status is in the list
				if (statuses.length === 0 && task.status) {
					statuses = [task.status];
				}
			} catch {
				// If list/space fetch fails, use task's current status only
				if (task.status) statuses = [task.status];
			}
		}

		const form = await superValidate(
			{ name: task.name, description: task.description ?? '' },
			zod(taskFormSchema)
		);
		const commentForm = await superValidate(
			{ comment_text: '' },
			zod(commentFormSchemaInit)
		);
		return { task, form, comments, commentForm, statuses, timeTrackedMs: timeResult.totalMs };
	} catch {
		const form = await superValidate({ name: '', description: '' }, zod(taskFormSchema));
		const commentForm = await superValidate(
			{ comment_text: '' },
			zod(commentFormSchemaInit)
		);
		return { task: null, form, comments: [], commentForm, statuses: [], timeTrackedMs: 0 };
	}
};

export const actions: Actions = {
	default: async (event) => {
		const token = getToken(event);
		if (!token) {
			return fail(401, { message: 'Not authenticated' });
		}
		const { request, params } = event;

		const form = await superValidate(request, zod(taskFormSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		const { id } = params;
		const data = form.data as { name: string; description: string };
		try {
			await updateClickUpTask(token, id, {
				name: data.name,
				description: data.description || undefined
			});
			return { form, success: true };
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to update task';
			return fail(500, { form, message });
		}
	},
	addComment: async (event) => {
		const token = getToken(event);
		if (!token) {
			return fail(401, { message: 'Not authenticated' });
		}
		const { request, params } = event;

		const commentForm = await superValidate(request, zod(commentFormSchema));
		if (!commentForm.valid) {
			return fail(400, { commentForm });
		}
		const { id } = params;
		const text = (commentForm.data as { comment_text: string }).comment_text;
		try {
			await createClickUpTaskComment(token, id, text);
			return {
				commentForm: await superValidate({ comment_text: '' }, zod(commentFormSchemaInit)),
				commentSuccess: true
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to add comment';
			return fail(500, { commentForm, commentMessage: message });
		}
	},
};
