<script lang="ts">
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';
	import * as m from '$lib/paraglide/messages.js';
	import { clickUpQueryKeys } from '$lib/api/index.js';
	import { getClosedStatus } from '$lib/api/status-utils.js';
	import { TaskForm } from '$lib/forms/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem
	} from '$lib/components/ui/dropdown-menu/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Check from '@lucide/svelte/icons/check';
	import { page } from '$app/state';
	import {
		formatCommentDateTime,
		toISOStringSafe
	} from '$lib/utils/dates.js';
	import {
		formatHoursFromMs,
		hoursToMs,
		getInitials,
		getTaskDisplayId
	} from '$lib/utils.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import Pencil from '@lucide/svelte/icons/pencil';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const queryClient = useQueryClient();

	const taskDetailQuery = createQuery(() => ({
		queryKey: clickUpQueryKeys.taskDetail(data.task?.id ?? '').queryKey,
		queryFn: async () => {
			const res = await fetch(`/api/tasks/${data.task!.id}/details`);
			if (!res.ok) throw new Error(await res.text());
			return res.json();
		},
		enabled: !!data.task?.id,
		initialData: data.task
			? {
					task: data.task,
					comments: data.comments ?? [],
					statuses: data.statuses ?? [],
					timeTrackedMs: data.timeTrackedMs ?? 0
				}
			: undefined
	}));

	const taskDetail = $derived(taskDetailQuery.data);
	const task = $derived(taskDetail?.task ?? data.task);
	const comments = $derived(taskDetail?.comments ?? data.comments ?? []);
	const statuses = $derived(taskDetail?.statuses ?? data.statuses ?? []);
	const timeTrackedMs = $derived(
		task?.time_spent ?? taskDetail?.timeTrackedMs ?? data.timeTrackedMs ?? 0
	);

	async function invalidateTaskDetail() {
		if (data.task?.id) {
			await queryClient.invalidateQueries({ queryKey: clickUpQueryKeys.taskDetail(data.task.id).queryKey });
		}
	}

	let commentText = $state('');
	let commentSubmitting = $state(false);
	let commentError = $state('');

	const locale = $derived(page.params.locale ?? 'en');

	const backHref = $derived(`/${page.params.locale ?? 'en'}/tasks-by-spaces`);

	const closedStatus = $derived(getClosedStatus(statuses));

	const isClosed = $derived(
		!!closedStatus && task?.status?.status === closedStatus.status
	);

	let markClosedSubmitting = $state(false);
	let estimateEditing = $state(false);
	let estimateInputValue = $state('');
	let estimateSubmitting = $state(false);

	async function markTaskClosed() {
		if (!closedStatus || !task?.id || markClosedSubmitting || isClosed) return;
		markClosedSubmitting = true;
		try {
			const res = await fetch(`/api/tasks/${task.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: closedStatus.status })
			});
			const dataRes = await res.json().catch(() => ({}));
			if (!res.ok) {
				toast.error((dataRes as { error?: string }).error ?? `Error ${res.status}`);
				return;
			}
			toast.success(m.status_updated());
			await invalidateTaskDetail();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update status');
		} finally {
			markClosedSubmitting = false;
		}
	}

	function startEditEstimate() {
		estimateInputValue = task?.time_estimate && task.time_estimate > 0
			? formatHoursFromMs(task.time_estimate)
			: '';
		estimateEditing = true;
	}

	function cancelEditEstimate() {
		estimateEditing = false;
		estimateInputValue = '';
	}

	async function saveTimeEstimate() {
		if (!task?.id || estimateSubmitting) return;
		const trimmed = String(estimateInputValue ?? '').trim();
		const hours = trimmed === '' ? 0 : parseFloat(trimmed);
		if (isNaN(hours) || hours < 0) {
			toast.error('Please enter a valid non-negative number');
			return;
		}
		estimateSubmitting = true;
		try {
			const res = await fetch(`/api/tasks/${task.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ time_estimate: hoursToMs(hours) })
			});
			const dataRes = await res.json().catch(() => ({}));
			if (!res.ok) {
				toast.error((dataRes as { error?: string }).error ?? `Error ${res.status}`);
				return;
			}
			toast.success(m.time_estimate_updated());
			estimateEditing = false;
			estimateInputValue = '';
			await invalidateTaskDetail();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update time estimate');
		} finally {
			estimateSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>{m.edit_task()} – {task?.name ?? ''}</title>
</svelte:head>

<div class="p-8">
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-2 justify-between">
			<Button variant="ghost" size="sm" href={backHref}>
				<ArrowLeft class="size-4" />
				{m.back_to_spaces()}
			</Button>
			{#if task?.url}
				<Button variant="ghost" size="sm" href={task.url} target="_blank" rel="noopener noreferrer">
					<ExternalLink class="size-4" />
					{m.show_in_clickup()}
				</Button>
			{:else if task?.id}
				<Button
					variant="ghost"
					size="sm"
					href="https://app.clickup.com/t/{task.id}"
					target="_blank"
					rel="noopener noreferrer"
				>
					<ExternalLink class="size-4" />
					{m.show_in_clickup()}
				</Button>
			{/if}
		</div>
		<h1 class="text-xl font-semibold">{m.edit_task()}</h1>
		{#if task && getTaskDisplayId(task) !== '—'}
			<span class="text-sm text-muted-foreground font-mono ml-2">{getTaskDisplayId(task)}</span>
		{/if}
	</div>

	{#if task}
		<div class="flex flex-wrap gap-8 lg:gap-10 mt-6">
			<main class="min-w-0 flex-1">
		{#if (statuses?.length ?? 0) > 0}
			<div class="flex items-center gap-2 mt-4">
				<span class="text-sm font-medium text-muted-foreground">{m.task_status()}:</span>
				<DropdownMenu>
					<DropdownMenuTrigger class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
						<span class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium cursor-pointer hover:bg-accent transition-colors"
							style="background: {task.status?.color
								? `color-mix(in srgb, ${task.status.color} 20%, transparent)`
								: 'transparent'}; border-color: {task.status?.color ?? 'var(--border)'}; color: {task.status?.color ?? 'inherit'}"
						>
							{#if task.status?.color}
								<span
									class="size-2 rounded-full shrink-0"
									style="background-color: {task.status.color}"
								></span>
							{/if}
							{task.status?.status ?? '—'}
							<ChevronDown class="size-3.5 opacity-70" />
						</span>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						{#each statuses ?? [] as status (status.status)}
							<DropdownMenuItem
								onclick={async () => {
									const taskId = task?.id;
									if (!taskId) return;
									try {
										const res = await fetch(`/api/tasks/${taskId}`, {
											method: 'PUT',
											headers: { 'Content-Type': 'application/json' },
											body: JSON.stringify({ status: status.status })
										});
										const data_res = await res.json().catch(() => ({}));
										if (!res.ok) {
											toast.error((data_res as { error?: string }).error ?? `Error ${res.status}`);
											return;
										}
										toast.success(m.status_updated());
										await invalidateTaskDetail();
									} catch (err) {
										toast.error(err instanceof Error ? err.message : 'Failed to update status');
									}
								}}
							>
								<button
									type="button"
									class="flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
								>
									{#if status.color}
										<span
											class="size-2.5 shrink-0 rounded-full"
											style="background-color: {status.color}"
										></span>
									{/if}
									{status.status}
								</button>
							</DropdownMenuItem>
						{/each}
					</DropdownMenuContent>
				</DropdownMenu>
				{#if closedStatus && !isClosed}
					<Tooltip.Root>
						<Tooltip.Trigger>
							<button
								type="button"
								class="text-muted-foreground rounded-full p-1.5 transition-colors disabled:opacity-50 hover:enabled:text-green-500"
								onclick={markTaskClosed}
								disabled={markClosedSubmitting}
								aria-label={m.mark_task_closed()}
							>
								<Check class="size-3.5" />
							</button>
						</Tooltip.Trigger>
						<Tooltip.Content side="bottom">
							{m.mark_task_closed()}
						</Tooltip.Content>
					</Tooltip.Root>
				{/if}
			</div>
		{:else if task.status}
			<div class="flex items-center gap-2 mt-4">
				<span class="text-sm font-medium text-muted-foreground">{m.task_status()}:</span>
				<Badge variant="outline" class="gap-1">
					{#if task.status.color}
						<span
							class="size-2 rounded-full shrink-0"
							style="background-color: {task.status.color}"
						></span>
					{/if}
					<span style="color: {task.status.color ?? 'inherit'}">{task.status.status}</span>
				</Badge>
				{#if closedStatus && !isClosed}
					<Tooltip.Root>
						<Tooltip.Trigger>
							<button
								type="button"
								class="text-muted-foreground rounded-full p-1.5 transition-colors disabled:opacity-50 hover:enabled:text-green-500"
								onclick={markTaskClosed}
								disabled={markClosedSubmitting}
								aria-label={m.mark_task_closed()}
							>
								<Check class="size-3.5" />
							</button>
						</Tooltip.Trigger>
						<Tooltip.Content side="bottom">
							{m.mark_task_closed()}
						</Tooltip.Content>
					</Tooltip.Root>
				{/if}
			</div>
		{/if}

		<div class="task-meta grid gap-3 mt-4 sm:grid-cols-3">
			<div class="sm:col-span-2">
				<span class="text-sm font-medium text-muted-foreground">{m.assignees()}:</span>
				<p class="text-sm mt-0.5">
					<Tooltip.Provider>
					{#if task.assignees && task.assignees.length > 0}
						{#each task.assignees as assignee (assignee.id)}
							<span
								class="assignee-badge inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mr-1 last:mr-0"
								style="background: color-mix(in srgb, {assignee.color ?? '#6b7280'} 20%, transparent); color: {assignee.color ?? 'inherit'}"
							>
								<span class="sm:hidden">
									<Tooltip.Root>
										<Tooltip.Trigger
											class="cursor-default rounded-full px-1 -mx-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										>
											{getInitials(assignee.username, assignee.initials)}
										</Tooltip.Trigger>
										<Tooltip.Content side="top">
											{assignee.username}
										</Tooltip.Content>
									</Tooltip.Root>
								</span>
								<span class="hidden sm:inline">{assignee.username}</span>
							</span>
						{/each}
					{:else}
						<span class="text-muted-foreground">{m.no_assignees()}</span>
					{/if}
					</Tooltip.Provider>
				</p>
			</div>
			<div>
				<span class="text-sm font-medium text-muted-foreground">{m.time_estimate()}:</span>
				<div class="text-sm mt-0.5 flex items-center gap-2">
					{#if estimateEditing}
						<form
							class="flex items-center gap-2"
							onsubmit={(e) => {
								e.preventDefault();
								saveTimeEstimate();
							}}
						>
							<Input
								type="number"
								min="0"
								step="0.5"
								placeholder="0"
								class="w-20 h-8 text-sm"
								bind:value={estimateInputValue}
							/>
							<span class="text-muted-foreground">h</span>
							<Button
								type="submit"
								size="sm"
								variant="default"
								disabled={estimateSubmitting}
							>
								{m.save_task()}
							</Button>
							<Button
								type="button"
								size="sm"
								variant="ghost"
								onclick={cancelEditEstimate}
								disabled={estimateSubmitting}
							>
								{m.cancel()}
							</Button>
						</form>
					{:else}
						{#if task.time_estimate && task.time_estimate > 0}
							{m.hours_format({ hours: formatHoursFromMs(task.time_estimate) })}
						{:else}
							<span class="text-muted-foreground">—</span>
						{/if}
						<button
							type="button"
							class="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
							onclick={startEditEstimate}
							aria-label="Edit time estimate"
						>
							<Pencil class="size-3.5" />
						</button>
					{/if}
				</div>
			</div>
			<div>
				<span class="text-sm font-medium text-muted-foreground">{m.time_spent()}:</span>
				<p class="text-sm mt-0.5">
					{#if timeTrackedMs > 0}
						{m.hours_format({ hours: formatHoursFromMs(timeTrackedMs) })}
					{:else}
						<span class="text-muted-foreground">{m.no_time_tracked()}</span>
					{/if}
				</p>
			</div>
		</div>

		<div class="task-edit-form mt-6">
			<TaskForm
				taskId={task.id}
				initialName={task.name}
				initialDescription={task.description ?? ''}
				onSuccess={invalidateTaskDetail}
			/>
		</div>

		</main>

		<aside class="task-comments min-w-0 flex-1 max-w-md">
			<h2 class="text-lg font-semibold mb-4">{m.comments()}</h2>

			{#if comments && comments.length > 0}
				<ul class="space-y-4 mb-6">
					{#each comments as comment (comment.id)}
						{@const commentDate = comment.date ?? comment.date_added}
						<li
							class="rounded-lg border border-border bg-muted/30 p-4"
							aria-label="Comment by {comment.user?.username ?? 'Unknown'}"
						>
							<div class="flex items-center justify-between gap-2 mb-2">
								<span class="flex items-center gap-2 flex-wrap text-sm">
									<span
										class="font-medium"
										style="color: {comment.user?.color ?? 'inherit'}"
									>
										{comment.user?.username ?? 'Unknown'}
									</span>
									<time
										class="text-muted-foreground text-xs"
										datetime={toISOStringSafe(commentDate)}
									>
										{formatCommentDateTime(commentDate, locale) || '—'}
									</time>
								</span>
							</div>
							<p class="text-sm whitespace-pre-wrap wrap-break-word">
								{comment.comment_text ?? ''}
							</p>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-muted-foreground text-sm mb-4">{m.no_comments()}</p>
			{/if}

			<form
				class="space-y-3"
				onsubmit={async (e) => {
					e.preventDefault();
					const text = commentText.trim();
					if (!text) {
						commentError = m.comment_required();
						return;
					}
					commentError = '';
					commentSubmitting = true;
					try {
						const res = await fetch(`/api/tasks/${task.id}/comments`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ comment_text: text })
						});
						const dataRes = await res.json().catch(() => ({}));
						if (!res.ok) {
							commentError = (dataRes as { error?: string }).error ?? `Error ${res.status}`;
							toast.error(commentError);
							return;
						}
						toast.success(m.comment_added());
						commentText = '';
						await invalidateTaskDetail();
					} catch (err) {
						commentError = err instanceof Error ? err.message : m.comment_add_failed();
						toast.error(commentError);
					} finally {
						commentSubmitting = false;
					}
				}}
			>
				<div>
					<label for="comment_text" class="sr-only">{m.add_comment()}</label>
					<Textarea
						id="comment_text"
						placeholder={m.comment_placeholder()}
						rows={3}
						class="resize-none"
						bind:value={commentText}
						oninput={() => (commentError = '')}
					/>
					{#if commentError}
						<p class="text-destructive text-sm mt-1" role="alert" aria-live="polite">
							{commentError}
						</p>
					{/if}
				</div>
				<Button type="submit" disabled={commentSubmitting}>
					{m.add_comment()}
				</Button>
			</form>
		</aside>
		</div>
	{:else}
		<p class="text-muted-foreground mt-4">{m.error_prefix({ message: 'Task not found' })}</p>
	{/if}
</div>
