<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import * as m from '$lib/paraglide/messages.js';
	import { clickUpQueryKeys, parseUsername } from '$lib/api/index.js';
	import type { GetAuthorizedUserResponse } from '$lib/api/schemas.js';

	const userQuery = createQuery(() => ({
		queryKey: clickUpQueryKeys.user.queryKey,
		queryFn: async (): Promise<GetAuthorizedUserResponse> => {
			const res = await fetch('/api/user');
			if (!res.ok) {
				throw new Error(await res.text());
			}
			return res.json();
		}
	}));

	const welcomeMessage = $derived.by(() => {
		const user = userQuery.data?.user;
		if (!user) return null;
		const { name, surname } = parseUsername(user.username);
		return m.welcome_dashboard({ name, surname });
	});
</script>

<div class="dashboard">
	{#if userQuery.isPending}
		<p>Loading...</p>
	{:else if userQuery.isError}
		<p class="error">Error: {userQuery.error?.message}</p>
	{:else if welcomeMessage}
		<h1>{welcomeMessage}</h1>
	{:else}
		<h1>{m.welcome_dashboard({ name: '', surname: '' })}</h1>
	{/if}
</div>

<style>
	.dashboard {
		padding: 2rem;
	}
	.error {
		color: #c00;
	}
</style>
