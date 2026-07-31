<script lang="ts">
  import type { PageData } from "./$types";

  import NodesView from "@app/views/nodes/View.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.baseUrl.hostname}</title>
</svelte:head>

<NodesView {...data} />
