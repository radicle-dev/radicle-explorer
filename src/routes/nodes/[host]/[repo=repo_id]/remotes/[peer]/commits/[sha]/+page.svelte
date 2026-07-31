<script lang="ts">
  import type { PageData } from "./$types";

  import Commit from "@app/views/repos/Commit.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>{[data.commit.commit.summary, "commit"].join(" · ")}</title>
</svelte:head>

<Commit {...data} />
