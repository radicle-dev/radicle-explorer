<script lang="ts">
  import type { PageData } from "./$types";

  import History from "@app/views/repos/History.svelte";
  import { projectName } from "@app/views/repos/router";

  export let data: PageData;
</script>

<svelte:head>
  <title>{[projectName(data.repo), "history"].join(" · ")}</title>
</svelte:head>

<History {...data} />
