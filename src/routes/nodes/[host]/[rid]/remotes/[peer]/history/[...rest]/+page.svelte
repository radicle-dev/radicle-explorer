<script lang="ts">
  import type { PageData } from "./$types";

  import History from "@app/views/repos/History.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.title}</title>
</svelte:head>

<History
  baseUrl={data.baseUrl}
  seedingPolicy={data.seedingPolicy}
  commit={data.commit}
  repo={data.repo}
  peers={data.peers}
  peer={data.peer}
  revision={data.revision}
  tree={data.tree}
  commitHeaders={data.commitHeaders}
  nodeId={data.nodeId}
  nodeAvatarUrl={data.nodeAvatarUrl} />
