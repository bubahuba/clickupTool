<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { slide } from 'svelte/transition';
	import { SvelteMap } from 'svelte/reactivity';
	import { createQuery } from '@tanstack/svelte-query';
	import { resolve } from '$app/paths';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import * as m from '$lib/paraglide/messages.js';
	import { clickUpQueryKeys } from '$lib/api/index.js';
	import { page } from '$app/state';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { cn, getTaskDisplayId } from '$lib/utils.js';
	import { spaceSectionsExpanded } from '$lib/stores/space-sections-expanded.js';
	import { statusGroupsExpanded } from '$lib/stores/status-groups-expanded.js';

	interface Props {
		spaceId: string;
		spaceName: string;
		teamIdStr: string;
		class?: string;
	}

	let { spaceId, spaceName, teamIdStr, class: className }: Props = $props();

	// Start false for SSR/hydration, restore from persisted store after mount
	let expanded = $state(false);

	onMount(() => {
		const state = get(spaceSectionsExpanded) as Record<string, boolean>;
		expanded = state[spaceId] ?? false;
		return spaceSectionsExpanded.subscribe((state: Record<string, boolean>) => {
			expanded = state[spaceId] ?? false;
		});
	});

	function toggleExpanded() {
		spaceSectionsExpanded.update((state: Record<string, boolean>) => ({
			...state,
			[spaceId]: !(state[spaceId] ?? false)
		}));
	}

	const locale = $derived(page.params.locale ?? 'en');

	const tasksQuery = createQuery(() => ({
		queryKey: clickUpQueryKeys.tasksBySpace(teamIdStr, spaceId).queryKey,
		queryFn: async () => {
			const res = await fetch(`/api/spaces/${spaceId}/tasks?teamId=${teamIdStr}`);
			if (!res.ok) throw new Error(await res.text());
			const data = await res.json();
			return data.tasks ?? [];
		},
		enabled: !!teamIdStr && !!spaceId
	}));

	const tasks = $derived(tasksQuery.data ?? []);

	const NO_STATUS = '__no_status';
	type TaskWithStatus = (typeof tasks)[number];

	const tasksByStatus = $derived.by(() => {
		const map = new SvelteMap<string, { status: { status: string; color?: string } | null; tasks: TaskWithStatus[] }>();
		const order: string[] = [];
		for (const task of tasks) {
			const key = task.status ? task.status.status : NO_STATUS;
			const entry = map.get(key);
			const statusInfo = task.status ?? null;
			if (!entry) {
				order.push(key);
				map.set(key, { status: statusInfo, tasks: [task] });
			} else {
				entry.tasks.push(task);
			}
		}
		return order.map((key) => ({ key, ...map.get(key)! }));
	});

	// Sync status group expansion from persisted store (same pattern as space sections)
	let statusExpandedState = $state<Record<string, boolean>>({});

	onMount(() => {
		statusExpandedState = get(statusGroupsExpanded) ?? {};
		return statusGroupsExpanded.subscribe((v) => {
			statusExpandedState = v ?? {};
		});
	});

	function statusGroupKey(statusKey: string) {
		return `${spaceId}:${statusKey}`;
	}

	function isStatusGroupExpanded(statusKey: string) {
		return statusExpandedState[statusGroupKey(statusKey)] ?? false;
	}

	function toggleStatusGroup(statusKey: string) {
		statusGroupsExpanded.update((state) => {
			const key = statusGroupKey(statusKey);
			return { ...state, [key]: !(state[key] ?? false) };
		});
	}
</script>

<div class={cn(className)}>
<button
	type="button"
	class={cn(
		"flex items-center gap-2 w-full text-left text-lg font-medium px-4 py-4 mb-3 bg-background border-none cursor-pointer text-foreground transition-colors duration-150 hover:bg-muted/50",
		expanded && "sticky top-8 z-10"
	)}
	onclick={toggleExpanded}
	aria-expanded={expanded}
>
	{#if expanded}
		<ChevronDown class="size-4 shrink-0 transition-transform" />
	{:else}
		<ChevronRight class="size-4 shrink-0 transition-transform" />
	{/if}
	<span class="flex-1">{spaceName}</span>
</button>
{#if expanded}
	<section class="border border-border rounded-lg px-5 py-4" in:slide out:slide>
		{#if tasksQuery.isPending}
			<p class="text-muted-foreground text-sm">{m.loading_tasks()}</p>
		{:else if tasks.length === 0}
			<p class="text-muted-foreground text-sm">{m.no_tasks()}</p>
		{:else}
			<Tooltip.Provider>
			<div class="flex flex-col gap-4">
				{#each tasksByStatus as group (group.key)}
					<div class="flex flex-col gap-2">
						<button
							type="button"
							class="flex items-center gap-2 w-full text-left text-xs font-medium text-muted-foreground px-3 py-1.5 rounded-md border-none bg-transparent cursor-pointer hover:bg-muted/50 transition-colors"
							onclick={() => toggleStatusGroup(group.key)}
							aria-expanded={isStatusGroupExpanded(group.key)}
						>
							{#if isStatusGroupExpanded(group.key)}
								<ChevronDown class="size-3 shrink-0 transition-transform" />
							{:else}
								<ChevronRight class="size-3 shrink-0 transition-transform" />
							{/if}
							<span
								class="size-2 shrink-0 rounded-full"
								style="background-color: {group.status?.color ?? '#94a3b8'}"
								aria-hidden="true"
							></span>
							{group.key === NO_STATUS ? m.no_status() : group.key}
							<span
								class="shrink-0 min-w-5 h-5 rounded-full bg-muted inline-flex items-center justify-center text-[10px] font-medium tabular-nums px-1.5"
							>
								{group.tasks.length}
							</span>
						</button>
						{#if isStatusGroupExpanded(group.key)}
						<ul class="list-none p-0 m-0 flex flex-col gap-1" in:slide out:slide>
							{#each group.tasks as task (task.id)}
								<li>
									<a
										href={resolve(`/${locale}/tasks-by-spaces/${task.id}`)}
										class="flex items-center gap-3 px-3 py-2 rounded-md no-underline text-foreground transition-colors duration-150 hover:bg-muted"
									>
										<span class="font-mono text-xs text-muted-foreground min-w-24">{getTaskDisplayId(task)}</span>
										{#if task.status}
											<Tooltip.Root>
												<Tooltip.Trigger
													class="cursor-default shrink-0 inline-flex"
													aria-label={task.status.status}
												>
													{#snippet child({ props })}
														<span
															{...props}
															class={cn(props.class as string | undefined, 'size-2.5 shrink-0 rounded-full block')}
															style="background-color: {task.status.color ?? '#94a3b8'}"
														></span>
													{/snippet}
												</Tooltip.Trigger>
												<Tooltip.Content side="top">
													{task.status.status}
												</Tooltip.Content>
											</Tooltip.Root>
										{/if}
										<span class="flex-1">{task.name}</span>
									</a>
								</li>
							{/each}
						</ul>
						{/if}
					</div>
				{/each}
			</div>
			</Tooltip.Provider>
		{/if}
	</section>
{/if}
</div>
