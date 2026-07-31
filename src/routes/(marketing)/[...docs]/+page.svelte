<script lang="ts">
  import type { PageData } from "./$types";

  import Docs from "@app/marketing/Docs.svelte";
  import { docsTitle } from "@app/marketing/router";

  export let data: PageData;
</script>

<svelte:head>
  <title>{docsTitle(data.page).join(" · ")}</title>
</svelte:head>

<Docs page={data.page} component={data.component} />
