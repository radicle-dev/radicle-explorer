<script lang="ts">
  import type { PageData } from "./$types";

  import Patches from "@app/views/repos/Patches.svelte";
  import { projectName } from "@app/views/repos/router";

  export let data: PageData;
</script>

<svelte:head>
  <title>{[projectName(data.repo), "patches"].join(" · ")}</title>
</svelte:head>

<Patches {...data} />
