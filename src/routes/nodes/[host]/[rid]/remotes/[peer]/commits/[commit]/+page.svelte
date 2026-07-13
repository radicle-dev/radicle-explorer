<script lang="ts">
  import type { PageData } from "./$types";

  import Commit from "@app/views/repos/Commit.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.title}</title>
</svelte:head>

<Commit
  baseUrl={data.baseUrl}
  repo={data.repo}
  commit={data.commit}
  nodeId={data.nodeId}
  nodeAvatarUrl={data.nodeAvatarUrl} />
