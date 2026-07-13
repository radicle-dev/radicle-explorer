<script lang="ts">
  import Icon from "@app/components/Icon.svelte";
</script>

<style>
  .mobile-footer {
    width: 100%;
    display: flex;
    justify-content: space-between;
    padding: 0.5rem;
    z-index: 1;
    gap: 0.5rem;
    border-top: 1px solid var(--color-border-subtle);
    background-color: var(--color-surface-base);
  }
</style>

<div class="mobile-footer">
  <a
    style="width: 100%; display: flex; align-items: center; justify-content: center;"
    href="/">
    <Icon name="seed" />
  </a>

  <slot />
</div>
