<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { cn } from '$lib/utils.js';
	import { persistedToken, syncTokenToCookie } from '$lib/auth/token.js';

	interface Props {
		class?: string;
	}

	let { class: className }: Props = $props();
	let tokenInput = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		const token = tokenInput.trim();
		if (!token) {
			error = m.login_error_invalid();
			return;
		}

		loading = true;
		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token })
			});
			const data = await res.json();

			if (!res.ok) {
				error = data?.error ? String(data.error) : m.login_error_invalid();
				return;
			}

			persistedToken.set(token);
			syncTokenToCookie(token);
			await invalidateAll();
		} catch {
			error = m.login_error_invalid();
		} finally {
			loading = false;
		}
	}
</script>

<div class={cn('flex min-h-svh flex-col items-center justify-center gap-6 p-4', className)}>
	<form
		class="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm"
		onsubmit={handleSubmit}
	>
		<h1 class="text-lg font-semibold">{m.login_title()}</h1>
		<div class="flex flex-col gap-2">
			<Input
				type="password"
				bind:value={tokenInput}
				placeholder={m.login_placeholder()}
				disabled={loading}
				aria-invalid={!!error}
			/>
			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}
		</div>
		<Button type="submit" disabled={loading}>
			{loading ? m.loading() : m.login_submit()}
		</Button>
	</form>
</div>
