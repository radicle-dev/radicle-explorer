<script lang="ts">
  import type { PageData } from "./$types";

  import Source from "@app/views/repos/Source.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.title}</title>
</svelte:head>

<Source
  baseUrl={data.baseUrl}
  seedingPolicy={data.seedingPolicy}
  commit={data.commit}
  repo={data.repo}
  peers={data.peers}
  peer={data.peer}
  rawPath={data.rawPath}
  revision={data.revision}
  tree={data.tree}
  path={data.path}
  blobResult={data.blobResult}
  nodeId={data.nodeId}
  nodeAvatarUrl={data.nodeAvatarUrl} />
