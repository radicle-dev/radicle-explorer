<script lang="ts">
  import type { PageData } from "./$types";

  import ExploreView from "@app/views/explore/View.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>Explore · Radicle</title>
</svelte:head>

<ExploreView {...data} />
