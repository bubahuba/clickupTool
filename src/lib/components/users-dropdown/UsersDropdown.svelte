<script lang="ts">
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuCheckboxGroup,
		DropdownMenuCheckboxItem
	} from '$lib/components/ui/dropdown-menu/index.js';
	import { cn } from '$lib/utils.js';
	import * as m from '$lib/paraglide/messages.js';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import type { TimesheetUser } from '$lib/components/timesheet-table/types.js';

	interface Props {
		users: TimesheetUser[];
		selectedIds: number[];
		onSelect: (ids: number[]) => void;
		class?: string;
		disabled?: boolean;
	}

	let { users, selectedIds, onSelect, class: className, disabled = false }: Props = $props();

	const selectedValue = $derived(selectedIds.map(String));

	function handleValueChange(value: string[]) {
		onSelect(value.map((v) => parseInt(v, 10)).filter((n) => !isNaN(n)));
	}

	const selectedUsers = $derived(
		users.filter((u) => selectedIds.includes(u.id))
	);
</script>

<div class={cn(className)}>
<DropdownMenu>
	<DropdownMenuTrigger
		disabled={disabled}
		class="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground min-w-[8rem] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed"
	>
		{#if selectedUsers.length === 0}
			<span class="text-muted-foreground">{m.select_users()}</span>
		{:else}
			<div class="flex flex-wrap gap-1 max-w-[12rem] overflow-hidden">
				{#each selectedUsers as u (u.id)}
					<span
						class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shrink-0"
						style="background: color-mix(in srgb, {u.color ?? '#6b7280'} 20%, transparent); color: {u.color ?? 'inherit'}"
					>
						<span
							class="size-2 rounded-full shrink-0"
							style="background-color: {u.color ?? '#6b7280'}"
						></span>
						<span class="truncate">{u.username}</span>
					</span>
				{/each}
			</div>
		{/if}
		<ChevronDown class="size-4 opacity-70 shrink-0" />
	</DropdownMenuTrigger>
	<DropdownMenuContent align="end" class="max-h-[16rem] overflow-y-auto">
		<DropdownMenuCheckboxGroup value={selectedValue} onValueChange={handleValueChange}>
			{#each users as u (u.id)}
				<DropdownMenuCheckboxItem value={String(u.id)}>
					<span
						class="inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs font-medium shrink-0"
						style="background: color-mix(in srgb, {u.color ?? '#6b7280'} 20%, transparent); color: {u.color ?? 'inherit'}"
					>
						<span
							class="size-2 rounded-full shrink-0"
							style="background-color: {u.color ?? '#6b7280'}"
						></span>
						{u.username}
					</span>
				</DropdownMenuCheckboxItem>
			{/each}
		</DropdownMenuCheckboxGroup>
	</DropdownMenuContent>
</DropdownMenu>
</div>
