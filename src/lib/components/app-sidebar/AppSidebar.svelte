<script lang="ts">
	import { invalidateAll, goto } from "$app/navigation";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import * as m from "$lib/paraglide/messages.js";
	import { page } from "$app/state";
	import { resolve } from "$app/paths";
	import { clearToken } from "$lib/auth/token.js";
	import LayoutDashboard from "@lucide/svelte/icons/layout-dashboard";
	import ListTodo from "@lucide/svelte/icons/list-todo";
	import LogOut from "@lucide/svelte/icons/log-out";
	import { cn } from "$lib/utils.js";

	async function handleLogout() {
		await fetch("/api/auth/logout", { method: "POST" });
		clearToken();
		await invalidateAll();
	}

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
		"flex w-full items-center gap-2 overflow-hidden rounded-md p-1 text-start text-sm outline-none transition-colors [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0";
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
			<Sidebar.GroupLabel class="mt-2">{m.nav_label()}</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each navItems as item (item.href)}
						{@const Icon = item.icon}
						<Sidebar.MenuItem>
							<button
								type="button"
								class={cn(
									linkClass,
									isActive(item.href)
										? linkActiveClass
										: linkInactiveClass,
								)}
								onclick={() => goto(resolve(item.href as import('$app/types').Pathname))}
							>
								<Icon />
								<span>{item.label}</span>
							</button>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
		<Sidebar.Group>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					<Sidebar.MenuItem>
						<button
							type="button"
							class={cn(linkClass, linkInactiveClass)}
							onclick={handleLogout}
						>
							<LogOut />
							<span>{m.nav_logout()}</span>
						</button>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
</Sidebar.Root>
