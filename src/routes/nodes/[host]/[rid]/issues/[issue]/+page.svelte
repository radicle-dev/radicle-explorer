<script lang="ts">
  import type { PageData } from "./$types";

  import Issue from "@app/views/repos/Issue.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.title}</title>
</svelte:head>

<Issue
  baseUrl={data.baseUrl}
  repo={data.repo}
  rawPath={data.rawPath}
  issue={data.issue}
  nodeId={data.nodeId}
  nodeAvatarUrl={data.nodeAvatarUrl} />
