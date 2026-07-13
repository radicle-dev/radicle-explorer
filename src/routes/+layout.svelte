<script lang="ts">
  import { page } from "$app/stores";
  import { onNavigate } from "$app/navigation";

  import {
    codeFont,
    followSystemTheme,
    loadTheme,
    theme,
  } from "@app/lib/appearance";

  import FullscreenModalPortal from "@app/App/FullscreenModalPortal.svelte";
  import LoadingBar from "@app/App/LoadingBar.svelte";

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

  const isRepoRouteId = (routeId: string | null | undefined) =>
    Boolean(routeId?.startsWith("/nodes/[host]/[rid]"));

  // Run the global page transition (fade + slide, see index.css) on every
  // client-side navigation, except between two repo pages (e.g. switching
  // tabs within a repo), where a full-page slide would be distracting.
  // The initial load paints instantly since `onNavigate` doesn't fire for it.
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
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
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

<slot />
