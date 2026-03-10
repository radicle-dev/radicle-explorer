<script lang="ts">
  import Icon from "./Icon.svelte";

  export let title: string;
  export let description: string | undefined = undefined;
</script>

<style>
  .empty-state {
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    justify-content: center;
    text-align: center;
  }
  .empty-state :global(svg) {
    width: 2rem;
    height: 2rem;
  }
  .description {
    color: var(--color-text-tertiary);
    font: var(--txt-body-m-regular);
  }
</style>

<div class="empty-state">
  <Icon name="placeholder" />
  <div class="txt-heading-s">{title}</div>
  {#if description}
    <div class="description">{description}</div>
  {/if}
  <slot />
</div>
