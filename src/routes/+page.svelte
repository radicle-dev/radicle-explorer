<script lang="ts">
  import type { PageData } from "./$types";

  import Landing from "@app/marketing/Landing.svelte";
  import NodesView from "@app/views/nodes/View.svelte";
  import Shell from "@app/marketing/Shell.svelte";

  export let data: PageData;
</script>

<svelte:head>
  {#if data.homepage === "node"}
    <title>{data.baseUrl.hostname}</title>
  {/if}
</svelte:head>

{#if data.homepage === "landing"}
  <Shell>
    <Landing />
  </Shell>
{:else}
  <NodesView baseUrl={data.baseUrl} node={data.node} stats={data.stats} />
{/if}
