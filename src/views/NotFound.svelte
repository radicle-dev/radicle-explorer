<script lang="ts">
  import type { BaseUrl } from "@http-client";

  import Layout from "@app/App/Layout.svelte";
  import Icon from "@app/components/Icon.svelte";
  import SeedSelector from "@app/views/nodes/SeedSelector.svelte";

  export let title: string;
  export let description: string | undefined = undefined;
  export let baseUrl: BaseUrl | undefined = undefined;
</script>

<style>
  .container {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 1.5rem;
    height: 100%;
  }
  .container :global(svg) {
    width: 2rem;
    height: 2rem;
  }
  .title-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    white-space: nowrap;
  }
</style>

<Layout>
  <div class="container">
    <Icon name="placeholder" />
    <div class="title-row txt-heading-m">
      <span>{title}</span>
      {#if baseUrl}
        <SeedSelector {baseUrl} compact />
      {/if}
    </div>
    {#if description}
      <div
        class="txt-body-m-regular"
        style:color="var(--color-text-tertiary)"
        style:text-align="center">
        {#each description.split("\n") as line}
          <div>{line}</div>
        {/each}
      </div>
    {/if}
  </div>
</Layout>
