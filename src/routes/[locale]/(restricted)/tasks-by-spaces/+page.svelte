<script lang="ts">
	import { createQuery } from "@tanstack/svelte-query";
	import * as m from "$lib/paraglide/messages.js";
	import { clickUpQueryKeys } from "$lib/api/index.js";
	import type { ClickUpAuthorizedTeamsResponse } from "$lib/api/index.js";
	import { SpaceSection } from "$lib/components/tasks-by-spaces/index.js";

	const teamsQuery = createQuery(() => ({
		queryKey: clickUpQueryKeys.teams.queryKey,
		queryFn: async (): Promise<ClickUpAuthorizedTeamsResponse> => {
			const res = await fetch("/api/teams");
			if (!res.ok) throw new Error(await res.text());
			return res.json();
		},
	}));

	const teamId = $derived(teamsQuery.data?.teams?.[0]?.id);

	const spacesQuery = createQuery(() => ({
		queryKey: clickUpQueryKeys.spaces(teamId?.toString() ?? "").queryKey,
		queryFn: async () => {
			const res = await fetch(`/api/spaces?teamId=${teamId}`);
			if (!res.ok) throw new Error(await res.text());
			const data = await res.json();
			return data.spaces ?? [];
		},
		enabled: !!teamId,
	}));

	const spaces = $derived(spacesQuery.data ?? []);
	const teamIdStr = $derived(teamId?.toString() ?? "");
</script>

<svelte:head>
	<title>{m.tasks_by_spaces_title()}</title>
</svelte:head>

<h1 class="text-2xl font-semibold mb-6 sticky top-0 bg-background z-10">{m.tasks_by_spaces_title()}</h1>

{#if teamsQuery.isError}
	<p class="text-destructive">
		{m.error_workspace({ message: teamsQuery.error?.message ?? "" })}
	</p>
{:else if !teamId}
	{#if teamsQuery.isPending}
		<p class="text-muted-foreground">{m.loading_workspace()}</p>
	{:else}
		<p class="text-muted-foreground">{m.no_workspace()}</p>
	{/if}
{:else if spacesQuery.isPending}
	<p class="text-muted-foreground">{m.loading_spaces()}</p>
{:else if spaces.length === 0}
	<p class="text-muted-foreground">{m.no_spaces()}</p>
{:else}
	{#each spaces as space (space.id)}
		<SpaceSection spaceId={space.id} spaceName={space.name} {teamIdStr} />
	{/each}
{/if}
