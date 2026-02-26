import { z } from 'zod';
import * as m from '$lib/paraglide/messages.js';

export const taskFormSchema = z.object({
	name: z.string().min(1, m.task_name_required()),
	description: z.string().default('')
});

export type TaskFormSchema = z.infer<typeof taskFormSchema>;
