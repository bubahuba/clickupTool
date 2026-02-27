<script lang="ts">
	import { I18nProvider } from '$lib/components/i18n/index.js';

	let { children } = $props();
</script>

<I18nProvider>
	{@render children()}
</I18nProvider>
