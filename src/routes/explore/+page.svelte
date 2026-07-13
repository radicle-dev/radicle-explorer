<script lang="ts">
  import type { PageData } from "./$types";

  import Explore from "@app/views/explore/View.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.title}</title>
</svelte:head>

<Explore baseUrl={data.baseUrl} searchAvailable={data.searchAvailable} />
