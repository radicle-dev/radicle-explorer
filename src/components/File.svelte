<script lang="ts">
  import { tick } from "svelte";

  import ExpandButton from "./ExpandButton.svelte";

  export let collapsable: boolean = false;
  export let expanded: boolean = true;
  export let sticky: boolean = true;

  let header: HTMLDivElement;
</script>

<style>
  .header {
    display: flex;
    height: 3rem;
    align-items: center;
    padding: 0 0.5rem 0 1rem;
    border: 1px solid var(--color-border-subtle);
    border-top-left-radius: var(--border-radius-md);
    border-top-right-radius: var(--border-radius-md);
    background-color: var(--color-surface-base);
    z-index: 2;
  }

  .sticky {
    position: sticky;
    top: 0;
  }

  .collapsed {
    border-radius: var(--border-radius-md);
    border: 1px solid var(--color-border-subtle);
  }

  .left {
    display: flex;
    gap: 0.5rem;
    margin-right: 1rem;
    align-items: center;
  }

  .right {
    display: flex;
    gap: 0.5rem;
    margin-left: auto;
    overflow: hidden;
  }

  .container {
    position: relative;
    overflow-x: auto;
    border: 1px solid var(--color-border-subtle);
    border-top: 0;
    background: var(--color-surface-subtle);
    border-bottom-left-radius: var(--border-radius-md);
    border-bottom-right-radius: var(--border-radius-md);
  }
  @media (max-width: 719.98px) {
    .header {
      border-radius: 0;
      border-left: 0;
      border-right: 0;
      padding: 0 1rem 0 1rem;
    }
    .container {
      border-radius: 0;
      border-left: 0;
      border-right: 0;
    }
  }
</style>

<div bind:this={header} class="header" class:collapsed={!expanded} class:sticky>
  <div class="left">
    {#if collapsable}
      <ExpandButton
        {expanded}
        on:toggle={async () => {
          expanded = !expanded;
          if (!expanded) {
            await tick();
            header.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        }} />
    {/if}
    <slot name="left-header" />
  </div>

  <div class="right">
    <slot name="right-header" {expanded} />
  </div>
</div>

{#if expanded}
  <div class="container">
    <slot />
  </div>
{/if}
