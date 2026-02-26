<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { slide } from 'svelte/transition';
	import { createQuery } from '@tanstack/svelte-query';
	import { resolve } from '$app/paths';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import * as m from '$lib/paraglide/messages.js';
	import { clickUpQueryKeys } from '$lib/api/index.js';
	import { page } from '$app/state';
	import { spaceSectionsExpanded } from '$lib/stores/space-sections-expanded.js';

	interface Props {
		spaceId: string;
		spaceName: string;
		teamIdStr: string;
	}

	let { spaceId, spaceName, teamIdStr }: Props = $props();

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
</script>

<button
	type="button"
	class="space-header"
	class:space-header-sticky={expanded}
	onclick={toggleExpanded}
	aria-expanded={expanded}
>
	{#if expanded}
		<ChevronDown class="size-4 shrink-0 transition-transform" />
	{:else}
		<ChevronRight class="size-4 shrink-0 transition-transform" />
	{/if}
	<span class="space-name">{spaceName}</span>
</button>
{#if expanded}
	<section class="space-section" in:slide out:slide>
		{#if tasksQuery.isPending}
			<p class="text-muted-foreground text-sm">{m.loading_tasks()}</p>
		{:else if tasks.length === 0}
			<p class="text-muted-foreground text-sm">{m.no_tasks()}</p>
		{:else}
			<ul class="task-list">
				{#each tasks as task (task.id)}
					<li>
						<a
							href={resolve(`/${locale}/tasks-by-spaces/${task.id}`)}
							class="task-link"
						>
							<span class="task-id">{task.custom_id ?? task.id}</span>
							<span class="task-name">{task.name}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}

<style>
	.space-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		text-align: left;
		font-size: 1.125rem;
		font-weight: 500;
		padding: 1rem 1rem;
		margin-bottom: 0.75rem;
		background: var(--background);
		border: none;
		cursor: pointer;
		color: var(--foreground);
		transition: background 0.15s;
	}
	.space-header-sticky {
		position: sticky;
		top: 2rem;
		z-index: 10;
	}
	.space-header:hover {
		background: color-mix(in oklch, var(--muted) 50%, transparent);
	}
	.space-name {
		flex: 1;
	}
	.space-section {
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		padding: 1rem 1.25rem;
	}

	.task-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.task-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.375rem;
		text-decoration: none;
		color: var(--foreground);
		transition: background 0.15s;
	}

	.task-link:hover {
		background: var(--muted);
	}

	.task-id {
		font-family: monospace;
		font-size: 0.75rem;
		color: var(--muted-foreground);
		min-width: 6rem;
	}

	.task-name {
		flex: 1;
	}
</style>
