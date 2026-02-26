<script lang="ts">
	import { mode } from 'mode-watcher';
	import { browser } from '$app/environment';

	$effect(() => {
		if (browser && mode.current) {
			document.body.classList.toggle('dark', mode.current === 'dark');
		}
	});
</script>
