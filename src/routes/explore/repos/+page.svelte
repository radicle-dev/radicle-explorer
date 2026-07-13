<script lang="ts">
  import type { PageData } from "./$types";

  import ExploreRepos from "@app/views/explore/ReposView.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.title}</title>
</svelte:head>

<ExploreRepos
  baseUrl={data.baseUrl}
  stats={data.stats}
  page={data.page}
  sort={data.sort}
  searchAvailable={data.searchAvailable} />
