<script lang="ts">
	import { browser } from '$app/environment';
	import { persistedToken, CLICKUP_TOKEN_COOKIE } from '$lib/auth/token.js';
	import LoginForm from './LoginForm.svelte';

	let { children } = $props();

	// Sync cookie to store on mount when store is empty but cookie exists
	$effect(() => {
		if (!browser) return;
		if ($persistedToken) return;
		const match = document.cookie.match(new RegExp(`(?:^|; )${CLICKUP_TOKEN_COOKIE}=([^;]*)`));
		if (match) {
			persistedToken.set(decodeURIComponent(match[1]));
		}
	});
</script>

{#if browser && !$persistedToken}
	<LoginForm />
{:else}
	{@render children()}
{/if}
