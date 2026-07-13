<script lang="ts">
  import type { PageData } from "./$types";

  import Issues from "@app/views/repos/Issues.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.title}</title>
</svelte:head>

<Issues
  baseUrl={data.baseUrl}
  repo={data.repo}
  issues={data.issues}
  status={data.status}
  nodeId={data.nodeId}
  nodeAvatarUrl={data.nodeAvatarUrl} />
