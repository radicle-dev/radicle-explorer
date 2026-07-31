<script lang="ts">
  import { page } from "$app/stores";

  import ErrorView from "@app/views/error/View.svelte";
  import NotFound from "@app/views/NotFound.svelte";

  $: title = $page.status === 404 ? "Page not found" : "Error";
</script>

<svelte:head>
  <title>{title} · Radicle</title>
</svelte:head>

{#if $page.status === 404}
  <NotFound
    title={$page.error?.title ?? "Page not found"}
    description={$page.error?.description}
    baseUrl={$page.error?.baseUrl} />
{:else}
  <ErrorView
    title={$page.error?.title ?? "Error"}
    description={$page.error?.description ?? ""}
    error={$page.error?.error}
    icon={$page.error?.icon ?? "desert"} />
{/if}
