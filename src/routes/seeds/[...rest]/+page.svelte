<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";

  // `/seeds/*` is a legacy alias for `/nodes/*`; generated paths always use
  // `/nodes`. The redirect happens client-side instead of in a `load`
  // function so that the URL fragment (e.g. `#L10` line anchors in old
  // shared links) survives — `load` functions never see the fragment. It
  // rebuilds the target from the raw pathname rather than the decoded route
  // params so that percent-encoded characters survive the redirect.
  onMount(() => {
    void goto(
      $page.url.pathname.replace(/^\/seeds/, "/nodes") +
        $page.url.search +
        window.location.hash,
      { replaceState: true },
    );
  });
</script>
