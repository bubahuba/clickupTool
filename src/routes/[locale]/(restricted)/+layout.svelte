<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { AppSidebar } from '$lib/components/app-sidebar/index.js';
	import AuthProvider from '$lib/components/auth/AuthProvider.svelte';
	import * as Button from '$lib/components/ui/button/index.js';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { toggleMode } from 'mode-watcher';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';

	let { children } = $props();

	const LOCALES = ['cs', 'en'] as const;

	function switchLocale(target: (typeof LOCALES)[number]) {
		const pathname = $page.url.pathname;
		const newPath = pathname.replace(/^\/(cs|en)/, `/${target}`) as `/${string}`;
		window.location.href = resolve(newPath);
	}
</script>

<AuthProvider>
	<Sidebar.Provider>
		<AppSidebar />
		<div
			class="fixed end-2 top-2 z-50 flex items-center gap-2"
			aria-label="Theme and locale"
		>
			<Button.Root
				variant="ghost"
				size="icon-sm"
				onclick={() => toggleMode()}
				aria-label="Toggle theme"
			>
				<SunIcon class="hidden dark:block size-4" aria-hidden />
				<MoonIcon class="block dark:hidden size-4" aria-hidden />
			</Button.Root>
			<span class="text-muted-foreground text-sm select-none">|</span>
			{#each LOCALES.filter((l) => l !== $page.params.locale) as loc (loc)}
				<Button.Root variant="ghost" size="sm" onclick={() => switchLocale(loc)}>
					{loc.toUpperCase()}
				</Button.Root>
			{/each}
		</div>
		<Sidebar.Inset class="flex flex-1 flex-col overflow-auto h-svh">
			<Sidebar.Trigger class="fixed start-2 top-2 z-50" />
			<div class="flex-1 p-4 pt-14 md:pt-4">
				{@render children()}
			</div>
		</Sidebar.Inset>
	</Sidebar.Provider>
</AuthProvider>
