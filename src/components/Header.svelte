<script lang="ts">
  import Settings from "@app/App/Settings.svelte";
  import Help from "@app/App/Help.svelte";
  import Icon from "@app/components/Icon.svelte";
  import IconButton from "@app/components/IconButton.svelte";
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
    position: relative;
    z-index: 200;
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
    {#if !$$slots.breadcrumbs}
      <a
        style:display="flex"
        style:align-items="center"
        style:gap="0.25rem"
        target="_blank"
        rel="noreferrer"
        href="https://radicle.dev">
        <Logo />
      </a>
    {/if}
    <slot name="breadcrumbs" />
  </div>

  <div class="right-section">
    <Popover popoverPositionTop="2.5rem" popoverPositionRight="0">
      <IconButton
        slot="toggle"
        let:toggle
        on:click={toggle}
        inline
        ariaLabel="Settings">
        <Icon name="settings" />
      </IconButton>

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
