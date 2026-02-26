<script lang="ts">
	import '../app.css';
	import { browser } from '$app/environment';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { Toaster } from '$lib/components/ui/sonner';
	import BodyDarkSync from '$lib/components/body-dark-sync.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				enabled: browser
			}
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />
<BodyDarkSync />
<QueryClientProvider client={queryClient}>
	{@render children()}
	<Toaster />
</QueryClientProvider>
