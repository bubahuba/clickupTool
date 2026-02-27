<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { clickUpQueryKeys } from '$lib/api/index.js';
	import type { GetAuthorizedUserResponse } from '$lib/api/index.js';
	import { getInitials } from '$lib/utils.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { cn } from '$lib/utils.js';

	interface Props {
		avatarClasses?: string;
		class?: string;
	}

	let { avatarClasses = 'size-8', class: className }: Props = $props();

	const userQuery = createQuery(() => ({
		queryKey: clickUpQueryKeys.user.queryKey,
		queryFn: async (): Promise<GetAuthorizedUserResponse> => {
			const res = await fetch('/api/user');
			if (!res.ok) throw new Error(await res.text());
			return res.json();
		}
	}));

	const user = $derived(userQuery.data?.user);
</script>

{#if user}
	<div class={cn('flex items-center gap-2', className)}>
		<Avatar.Root class={avatarClasses}>
			{#if user.profilePicture}
				<Avatar.Image src={user.profilePicture} alt="" />
			{/if}
			<Avatar.Fallback
				class="text-xs font-semibold"
				style="background-color: {user.color ?? '#6b7280'}; color: white"
			>
				{getInitials(user.username ?? '', user.initials)}
			</Avatar.Fallback>
		</Avatar.Root>
		<span class="truncate text-sm font-medium">{user.username}</span>
	</div>
{/if}
