<script lang="ts">
  import type { PageData } from "./$types";

  import ExploreReposView from "@app/views/explore/ReposView.svelte";
  import { exploreReposTitle } from "@app/views/explore/router";

  export let data: PageData;
</script>

<svelte:head>
  <title>{exploreReposTitle(data.sort).join(" · ")}</title>
</svelte:head>

<ExploreReposView {...data} />
