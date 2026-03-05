<script lang="ts">
  import Button from "@app/components/Button.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Link from "@app/components/Link.svelte";
  import Popover from "@app/components/Popover.svelte";

  import Help from "./Help.svelte";
  import Settings from "./Settings.svelte";
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
  .divider {
    border-bottom: 1px solid var(--color-border-subtle);
    margin: 1.5rem 0;
  }
</style>

<div class="mobile-footer">
  <Link
    style="width: 100%; display: flex; align-items: center; justify-content: center;"
    route={{ resource: "nodes", params: undefined }}>
    <Icon name="seed" />
  </Link>

  <slot />

  <div style:width="100%">
    <Popover popoverPositionBottom="3rem" popoverPositionRight="0">
      <Button
        let:expanded
        slot="toggle"
        variant={expanded ? "secondary" : "secondary-mobile-toggle"}
        styleWidth="100%"
        let:toggle
        on:click={toggle}>
        <Icon name="menu" />
      </Button>

      <div slot="popover">
        <Help hideShortcuts />
        <div class="divider"></div>
        <Settings />
      </div>
    </Popover>
  </div>
</div>
