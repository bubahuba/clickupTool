<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import LoginForm from '$lib/components/auth/LoginForm.svelte';
	import { persistedToken } from '$lib/auth/token.js';

	// If already authenticated, redirect to dashboard
	$effect(() => {
		if (browser && $persistedToken) {
			const locale = page.params.locale ?? 'en';
			goto(resolve(`/${locale}/dashboard`));
		}
	});
</script>

<LoginForm />
