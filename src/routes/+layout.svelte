<script lang="ts">
  import { onMount } from "svelte";
  import {
    afterNavigate,
    beforeNavigate,
    invalidate,
    onNavigate,
  } from "$app/navigation";
  import { page } from "$app/stores";

  import {
    codeFont,
    followSystemTheme,
    loadTheme,
    theme,
  } from "@app/lib/appearance";
  import { isCobRouteId, isRepoRouteId } from "@app/lib/routeId";
  import { pageError } from "@app/lib/error";

  import FullscreenModalPortal from "@app/App/FullscreenModalPortal.svelte";
  import LoadingBar from "@app/App/LoadingBar.svelte";

  import ErrorView from "@app/views/error/View.svelte";
  import NotFound from "@app/views/NotFound.svelte";

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", ({ matches }) => {
      if ($followSystemTheme) {
        theme.set(matches ? "dark" : "light");
      }
    });

  // Detect any change to the system theme on first load.
  if ($followSystemTheme) {
    theme.set(loadTheme());
  }

  onMount(() => {
    // The static boot indicator from app.html; the app has rendered once this
    // layout mounts.
    document.getElementById("app-loading")?.remove();
  });

  beforeNavigate(() => {
    pageError.set(undefined);
  });

  // The repo layout data (repo metadata, seeding policy, node info) is only
  // reloaded when the host or repo changes. Issue and patch counts in it feed
  // the COB list views and their pagination, so refresh it in the background
  // after navigating to a COB page within the same repo. When the repo
  // changed, the layout load already ran and fetched fresh data.
  afterNavigate(({ from, to }) => {
    if (
      isCobRouteId(to?.route.id) &&
      from?.params?.host === to?.params?.host &&
      from?.params?.repo === to?.params?.repo
    ) {
      void invalidate("repo:layout");
    }
  });

  // Run the global page transition (fade + slide, see index.css) on every
  // client-side navigation, except between two repo pages (e.g. switching
  // tabs within a repo), where a full-page slide would be distracting.
  // `onNavigate` never fires on the initial load, so the first page paints
  // instantly.
  onNavigate(navigation => {
    if (typeof document.startViewTransition !== "function") {
      return;
    }
    if (
      isRepoRouteId(navigation.from?.route.id) &&
      isRepoRouteId(navigation.to?.route.id)
    ) {
      return;
    }
    return new Promise(resolve => {
      const transition = document.startViewTransition(async () => {
        resolve();
        await navigation.complete.catch(() => undefined);
      });
      // Safety net: the view-transition update callback can be skipped or
      // abandoned when the DOM mutates concurrently (e.g. the header search
      // closing its dropdown as it navigates). If that happens `resolve()`
      // above never runs and the navigation would stall indefinitely, so
      // settle the promise here as well; resolving twice is a no-op.
      transition.updateCallbackDone.catch(() => resolve());
    });
  });

  $: document.documentElement.setAttribute("data-codefont", $codeFont);
  $: document.documentElement.setAttribute("data-theme", $theme);
  $: document.documentElement.setAttribute(
    "data-repo-view",
    isRepoRouteId($page.route.id) ? "true" : "false",
  );
</script>

<LoadingBar />
<FullscreenModalPortal />

{#if $pageError}
  {#if $pageError.status === 404}
    <NotFound
      title={$pageError.body.title}
      description={$pageError.body.description}
      baseUrl={$pageError.body.baseUrl} />
  {:else}
    <ErrorView
      title={$pageError.body.title}
      description={$pageError.body.description ?? ""}
      error={$pageError.body.error}
      icon={$pageError.body.icon ?? "desert"} />
  {/if}
{:else}
  <slot />
{/if}
