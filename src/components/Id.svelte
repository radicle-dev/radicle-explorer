<script lang="ts">
  import type { ComponentProps } from "svelte";
  import debounce from "lodash/debounce";

  import Icon from "@app/components/Icon.svelte";

  import { formatObjectId, isKeyboardClick, toClipboard } from "@app/lib/utils";

  export let id: string;
  export let shorten: boolean = true;
  export let ariaLabel: string | undefined = undefined;
  export let styleWidth: string | undefined = undefined;
  export let title: string | undefined = undefined;
  export let focusable: boolean = true;

  let icon: ComponentProps<Icon>["name"] = "copy";
  const text = "Click to copy";
  let tooltip = text;

  const restoreIcon = debounce(() => {
    icon = "copy";
    tooltip = text;
    visible = false;
  }, 1000);

  async function copy() {
    await toClipboard(id);
    icon = "checkmark";
    tooltip = "Copied to clipboard";
    restoreIcon();
  }

  let visible: boolean = false;
  export let debounceTimeout = 50;

  const setVisible = debounce((value: boolean) => {
    visible = value;
  }, debounceTimeout);
</script>

<style>
  .container {
    position: relative;
    display: inline-block;
  }
  .popover {
    position: absolute;
    left: 1rem;
    display: flex;
    align-items: center;
    flex-direction: row;
    gap: 0.5rem;
    justify-content: center;
    z-index: 20;
    background: var(--color-surface-subtle);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--border-radius-md);
    box-shadow: var(--elevation-low);
    font: var(--txt-body-m-regular);
    white-space: nowrap;
    width: max-content;
    padding: 0.25rem 0.5rem;
  }
</style>

<div class="container" style:width={styleWidth} {title}>
  <div
    style:display="inline-flex"
    style:flex-wrap="wrap"
    on:mouseenter={() => {
      setVisible(true);
    }}
    on:mouseleave={() => {
      setVisible(false);
    }}
    class="txt-id"
    style:cursor="copy"
    aria-label={ariaLabel}
    on:keydown|preventDefault|stopPropagation={async event => {
      if (!isKeyboardClick(event)) {
        return;
      }
      await copy();
      setVisible(true);
    }}
    on:click|preventDefault|stopPropagation={async () => {
      await copy();
      setVisible(true);
    }}
    role="button"
    tabindex={focusable ? 0 : -1}>
    <slot>
      {#if shorten}
        {formatObjectId(id)}
      {:else}
        {id}
      {/if}
    </slot>
  </div>

  {#if visible}
    <div style:position="absolute" style:top="-2rem">
      <div class="popover">
        <Icon name={icon} />
        {tooltip}
      </div>
    </div>
  {/if}
</div>
