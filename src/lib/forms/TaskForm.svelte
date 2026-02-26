<script lang="ts">
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as m from '$lib/paraglide/messages.js';
	import { toast } from 'svelte-sonner';
	import { cn } from '$lib/utils.js';

	interface Props {
		taskId: string;
		initialName: string;
		initialDescription: string;
		onSuccess?: () => void | Promise<void>;
	}

	let { taskId, initialName, initialDescription, onSuccess }: Props = $props();

	let name = $state('');
	let description = $state('');
	$effect(() => {
		name = initialName;
		description = initialDescription;
	});
	let submitting = $state(false);
	let nameError = $state('');

	const inputClass = cn(
		'border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none',
		'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
	);
	const textareaClass = cn(
		'border-input bg-background flex min-h-16 w-full rounded-md border px-3 py-2 text-sm outline-none',
		'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
	);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		const trimmedName = name.trim();
		if (!trimmedName) {
			nameError = m.task_name_required();
			return;
		}
		nameError = '';
		submitting = true;
		try {
			const res = await fetch(`/api/tasks/${taskId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: trimmedName,
					description: description.trim() || undefined
				})
			});
			const dataRes = await res.json().catch(() => ({}));
			if (!res.ok) {
				toast.error((dataRes as { error?: string }).error ?? `Error ${res.status}`);
				return;
			}
			toast.success(m.task_saved());
			await onSuccess?.();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : m.task_save_failed());
		} finally {
			submitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit}>
	<div class="space-y-4">
		<div class="space-y-2">
			<Label for="task-name">{m.task_name()}</Label>
			<input
				id="task-name"
				type="text"
				class={inputClass}
				placeholder={m.task_name()}
				bind:value={name}
				oninput={() => (nameError = '')}
			/>
			{#if nameError}
				<p class="text-destructive text-sm">{nameError}</p>
			{/if}
		</div>

		<div class="space-y-2">
			<Label for="task-description">{m.task_description()}</Label>
			<textarea
				id="task-description"
				class={textareaClass}
				rows={4}
				placeholder={m.task_description()}
				bind:value={description}
			></textarea>
		</div>

		<Button type="submit" class="w-fit" disabled={submitting}>
			{m.save_task()}
		</Button>
	</div>
</form>
