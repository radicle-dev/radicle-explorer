<script lang="ts">
  import type { PageData } from "./$types";

  import Patches from "@app/views/repos/Patches.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.title}</title>
</svelte:head>

<Patches
  baseUrl={data.baseUrl}
  repo={data.repo}
  patches={data.patches}
  status={data.status}
  nodeId={data.nodeId}
  nodeAvatarUrl={data.nodeAvatarUrl} />
