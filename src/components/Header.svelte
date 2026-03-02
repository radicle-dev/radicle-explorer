<script lang="ts">
  import Settings from "@app/App/Settings.svelte";
  import Help from "@app/App/Help.svelte";
  import Button from "@app/components/Button.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Link from "@app/components/Link.svelte";
  import Logo from "@app/components/Logo.svelte";
  import Popover from "@app/components/Popover.svelte";
</script>

<style>
  .header-container {
    background-color: var(--color-surface-base);
    padding: 0 1rem;
    border-bottom: 1px solid var(--color-border-subtle);
    height: var(--global-header-height);
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
  .left-section {
    display: flex;
    align-items: center;
  }
  .right-section {
    display: flex;
    justify-content: flex-end;
  }
  .divider {
    height: 1px;
    width: 100%;
    background-color: var(--color-border-subtle);
  }
</style>

<div class="header-container">
  <div class="left-section">
    <Link
      route={{ resource: "nodes", params: undefined }}
      style="height: 1rem; display: flex; align-items: center;">
      <Logo />
    </Link>
    <slot name="breadcrumbs" />
  </div>

  <div class="right-section">
    <Popover popoverPositionTop="2.5rem" popoverPositionRight="0">
      <Button slot="toggle" let:toggle variant="outline" on:click={toggle}>
        <Icon name="menu" />
      </Button>

      <div
        slot="popover"
        style:display="flex"
        style:flex-direction="column"
        style:gap="0.75rem"
        style:align-items="flex-start">
        <Settings />
        <div class="divider"></div>
        <Help />
      </div>
    </Popover>
  </div>
</div>
