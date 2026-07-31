<script lang="ts">
  import type { PageData } from "./$types";

  import Issues from "@app/views/repos/Issues.svelte";
  import { projectName } from "@app/views/repos/router";

  export let data: PageData;
</script>

<svelte:head>
  <title>{[projectName(data.repo), "issues"].join(" · ")}</title>
</svelte:head>

<Issues {...data} />
