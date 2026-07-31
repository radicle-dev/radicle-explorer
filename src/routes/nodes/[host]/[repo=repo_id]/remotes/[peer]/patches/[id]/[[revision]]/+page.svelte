<script lang="ts">
  import type { PageData } from "./$types";

  import Patch from "@app/views/repos/Patch.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>{[data.patch.title, "patch"].join(" · ")}</title>
</svelte:head>

<Patch {...data} />
