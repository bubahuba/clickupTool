<script lang="ts">
	import * as ResizablePrimitive from "paneforge";
	import { cn } from "$lib/utils.js";

	/* eslint-disable no-useless-assignment -- paneGroup used in bind:this */
	let {
		ref = $bindable(null),
		this: paneGroup = $bindable(),
		class: className,
		...restProps
	}: ResizablePrimitive.PaneGroupProps & {
		this?: ResizablePrimitive.PaneGroup;
	} = $props();
	/* eslint-enable no-useless-assignment */
</script>

<ResizablePrimitive.PaneGroup
	bind:this={paneGroup}
	data-slot="resizable-pane-group"
	class={cn("flex h-full w-full data-[direction=vertical]:flex-col", className)}
	{...restProps}
/>
