<script lang="ts">
  import type { PageData } from "./$types";

  import Source from "@app/views/repos/Source.svelte";
  import { sourceTitle } from "@app/views/repos/router";

  export let data: PageData;
</script>

<svelte:head>
  <title>{sourceTitle(data.repo).join(" · ")}</title>
</svelte:head>

<Source {...data} />
