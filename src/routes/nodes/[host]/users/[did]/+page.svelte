<script lang="ts">
  import type { PageData } from "./$types";

  import UsersView from "@app/views/users/View.svelte";
  import { userTitle } from "@app/views/users/router";

  export let data: PageData;
</script>

<svelte:head>
  <title>{userTitle(data.node, data.did).join(" · ")}</title>
</svelte:head>

<UsersView {...data} />
