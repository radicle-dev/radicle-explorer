<script lang="ts">
  import type { ErrorParam } from "@app/lib/error";

  import { page } from "$app/stores";

  import ErrorView from "@app/views/error/View.svelte";
  import NotFound from "@app/views/NotFound.svelte";

  $: appError = $page.error;
  $: isNotFound =
    appError?.variant === "notFound" ||
    (appError?.variant === undefined && $page.status === 404);
  $: title = isNotFound ? "Page not found" : "Error";
</script>

<svelte:head>
  <title>{title} · Radicle</title>
</svelte:head>

{#if appError?.variant === "notFound"}
  <NotFound
    title={appError.title ?? "Page not found"}
    description={appError.description}
    baseUrl={appError.baseUrl} />
{:else if appError?.variant === "error"}
  <ErrorView
    title={appError.title ?? "Error"}
    description={appError.description ?? ""}
    error={appError.cause as ErrorParam} />
{:else if $page.status === 404}
  <NotFound title="Page not found" />
{:else}
  <ErrorView
    title="Could not load this route"
    description="You stumbled on an unknown error, we aren’t exactly sure what happened." />
{/if}
