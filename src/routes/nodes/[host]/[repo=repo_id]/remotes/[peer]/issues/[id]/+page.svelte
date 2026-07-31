<script lang="ts">
  import type { PageData } from "./$types";

  import Issue from "@app/views/repos/Issue.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>{[data.issue.title, "issue"].join(" · ")}</title>
</svelte:head>

<Issue {...data} />
