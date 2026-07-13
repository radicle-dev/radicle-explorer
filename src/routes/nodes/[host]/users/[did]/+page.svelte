<script lang="ts">
  import type { PageData } from "./$types";

  import Users from "@app/views/users/View.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.title}</title>
</svelte:head>

<Users
  did={data.did}
  baseUrl={data.baseUrl}
  node={data.node}
  nodeId={data.nodeId}
  nodeAvatarUrl={data.nodeAvatarUrl}
  stats={data.stats} />
