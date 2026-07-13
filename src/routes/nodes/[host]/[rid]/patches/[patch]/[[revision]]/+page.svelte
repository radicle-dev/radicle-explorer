<script lang="ts">
  import type { PageData } from "./$types";

  import Patch from "@app/views/repos/Patch.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.title}</title>
</svelte:head>

<Patch
  baseUrl={data.baseUrl}
  repo={data.repo}
  rawPath={data.rawPath}
  patch={data.patch}
  stats={data.stats}
  view={data.view}
  nodeId={data.nodeId}
  nodeAvatarUrl={data.nodeAvatarUrl} />
