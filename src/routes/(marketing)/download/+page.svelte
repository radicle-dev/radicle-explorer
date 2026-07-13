<script lang="ts">
  import type { PageData } from "./$types";

  import Docs from "@app/views/marketing/Docs.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.title}</title>
</svelte:head>

<Docs page={data.page} component={data.component} />
