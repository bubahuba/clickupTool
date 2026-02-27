<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import * as m from "$lib/paraglide/messages.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { cn } from "$lib/utils.js";
  import { page } from "$app/stores";
  import { locales as LOCALES } from "$lib/paraglide/runtime.js";

  import {
    persistedToken,
    syncTokenToCookie,
    encodeToken,
  } from "$lib/auth/token.js";
  import { resolve } from "$app/paths";

  interface Props {
    class?: string;
  }

  let { class: className }: Props = $props();
  let tokenInput = $state("");
  let error = $state("");
  let loading = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = "";
    const token = tokenInput.trim();
    if (!token) {
      error = m.login_error_invalid();
      return;
    }

    loading = true;
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok) {
        error = data?.error ? String(data.error) : m.login_error_invalid();
        return;
      }

      persistedToken.set(encodeToken(token));
      syncTokenToCookie(token);
      await invalidateAll();
    } catch {
      error = m.login_error_invalid();
    } finally {
      loading = false;
    }
  }

  function switchLocale(target: (typeof LOCALES)[number]) {
    const pathname = $page.url.pathname;
    const localeRegex = new RegExp(
      `^/(${(LOCALES as readonly string[]).join("|")})`,
    );
    const newPath = pathname.replace(localeRegex, `/${target}`) as `/${string}`;
    goto(resolve(newPath));
  }
</script>

<div
  class={cn(
    "flex min-h-svh flex-col items-center justify-center gap-6 p-4",
    className,
  )}
>
  <form
    class="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm"
    onsubmit={handleSubmit}
  >
    <div class="flex gap-2 justify-between">
      <h1 class="text-lg font-semibold">{m.login_title()}</h1>

      {#each LOCALES.filter((l) => l !== $page.params.locale) as loc (loc)}
        <Button variant="ghost" size="sm" onclick={() => switchLocale(loc)}>
          {loc.toUpperCase()}
        </Button>
      {/each}
    </div>
    <p class="text-sm text-muted-foreground">
      {m.login_api_key_instructions()}
    </p>
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
