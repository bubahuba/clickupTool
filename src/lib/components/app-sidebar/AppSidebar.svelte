<script lang="ts">
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import * as m from "$lib/paraglide/messages.js";
	import { page } from "$app/state";
	import { resolve } from "$app/paths";
	import LayoutDashboard from "@lucide/svelte/icons/layout-dashboard";
	import ListTodo from "@lucide/svelte/icons/list-todo";
	import { cn } from "$lib/utils.js";

	const locale = $derived(page.params.locale ?? "cs");
	const base = $derived(`/${locale}`);

	const navItems = $derived([
		{
			href: `${base}/dashboard`,
			label: m.nav_dashboard(),
			icon: LayoutDashboard,
		},
		{
			href: `${base}/tasks-by-spaces`,
			label: m.tasks_by_spaces_title(),
			icon: ListTodo,
		},
	]);

	function isActive(href: string) {
		const path = page.url.pathname;
		if (href === `${base}/dashboard`) return path === href || path === base;
		return path.startsWith(href);
	}

	const linkClass =
		"flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-start text-sm outline-none transition-colors [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0";
	const linkActiveClass =
		"bg-sidebar-accent font-medium text-sidebar-accent-foreground";
	const linkInactiveClass =
		"hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground";
</script>

<Sidebar.Root collapsible="icon" mobileBehavior="push">
	<Sidebar.Header>
		<Sidebar.Trigger  class="sm:hidden"/>
	</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>{m.nav_label()}</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each navItems as item (item.href)}
						{@const Icon = item.icon}
						<Sidebar.MenuItem>
							<a
								href={resolve(item.href)}
								class={cn(
									linkClass,
									isActive(item.href)
										? linkActiveClass
										: linkInactiveClass,
								)}
							>
								<Icon />
								<span>{item.label}</span>
							</a>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
</Sidebar.Root>
