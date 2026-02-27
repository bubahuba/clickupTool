<script lang="ts">
  import { Label } from "$lib/components/ui/label/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as m from "$lib/paraglide/messages.js";
  import { toast } from "svelte-sonner";
  import { cn } from "$lib/utils.js";
  import Textarea from "@/components/ui/textarea/textarea.svelte";
  import Input from "@/components/ui/input/input.svelte";

  interface Props {
    taskId: string;
    initialName: string;
    initialDescription: string;
    class?: string;
    onSuccess?: () => void | Promise<void>;
  }

  let {
    taskId,
    initialName,
    initialDescription,
    class: className,
    onSuccess,
  }: Props = $props();

  let name = $state("");
  let description = $state("");
  $effect(() => {
    name = initialName;
    description = initialDescription;
  });

  let submitting = $state(false);
  let nameError = $state("");

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      nameError = m.task_name_required();
      return;
    }
    nameError = "";
    submitting = true;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || undefined,
        }),
      });
      const dataRes = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          (dataRes as { error?: string }).error ?? `Error ${res.status}`,
        );
        return;
      }
      toast.success(m.task_saved());
      await onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : m.task_save_failed());
    } finally {
      submitting = false;
    }
  }
</script>

<form class={cn(className)} onsubmit={handleSubmit}>
  <div class="space-y-4">
    <div class="space-y-2">
      <Label for="task-name">{m.task_name()}</Label>
      <Input
        id="task-name"
        type="text"
        placeholder={m.task_name()}
        bind:value={name}
        oninput={() => (nameError = "")}
      />
      {#if nameError}
        <p class="text-destructive text-sm">{nameError}</p>
      {/if}
    </div>

    <div class="space-y-2">
      <Label for="task-description">{m.task_description()}</Label>
      <Textarea
        id="task-description"
        rows={4}
        placeholder={m.task_description()}
        bind:value={description}
      ></Textarea>
    </div>

    <Button type="submit" class="w-fit" disabled={submitting}>
      {m.save_task()}
    </Button>
  </div>
</form>
