<script lang="ts">
  import type { PageData } from "./$types";

  import Landing from "@app/views/marketing/Landing.svelte";
  import MarketingShell from "@app/views/marketing/MarketingShell.svelte";
  import Nodes from "@app/views/nodes/View.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.kind === "landing" ? "Radicle" : data.title}</title>
</svelte:head>

{#if data.kind === "landing"}
  <MarketingShell>
    <Landing />
  </MarketingShell>
{:else}
  <Nodes baseUrl={data.baseUrl} stats={data.stats} node={data.node} />
{/if}
