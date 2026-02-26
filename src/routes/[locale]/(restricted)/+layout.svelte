<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { AppSidebar } from '$lib/components/app-sidebar/index.js';
	import AuthProvider from '$lib/components/auth/AuthProvider.svelte';

	let { children } = $props();
</script>

<AuthProvider>
	<Sidebar.Provider>
		<AppSidebar />
		<Sidebar.Inset class="flex flex-1 flex-col overflow-auto h-svh">
			<Sidebar.Trigger class="fixed start-2 top-2 z-50" />
			<div class="flex-1 p-4 pt-14 md:pt-4">
				{@render children()}
			</div>
		</Sidebar.Inset>
	</Sidebar.Provider>
</AuthProvider>
