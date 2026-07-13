<script lang="ts">
  import type { PageData } from "./$types";

  import Nodes from "@app/views/nodes/View.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.title}</title>
</svelte:head>

<Nodes baseUrl={data.baseUrl} stats={data.stats} node={data.node} />
