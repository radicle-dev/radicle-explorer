<script lang="ts">
  import { createEventDispatcher } from "svelte";

  import { isKeyboardClick } from "@app/lib/utils";
  import Loading from "./Loading.svelte";

  export let ariaLabel: string | undefined = undefined;
  export let inline: boolean = false;
  export let loading: boolean = false;
  export let title: string | undefined = undefined;
  export let stylePadding: string | undefined = undefined;
  export let disabled: boolean = false;
  export let stopPropagation: boolean = false;

  const dispatch = createEventDispatcher<{
    click: MouseEvent | KeyboardEvent;
  }>();
</script>

<style>
  .button {
    user-select: none;
    background-color: transparent;
    border-radius: var(--border-radius-sm);
    color: var(--color-text-tertiary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 6px;
    gap: 0.25rem;
    font: var(--txt-body-m-regular);
  }
  .inline {
    display: inline-flex;
  }
  .button:hover {
    color: var(--color-text-primary);
    background-color: var(--color-surface-strong);
  }
  .disabled,
  .disabled:hover {
    color: var(--color-surface-alpha-subtle);
    background-color: unset;
  }
</style>

{#if loading}
  <Loading small noDelay />
{:else}
  <div
    class:disabled
    aria-label={ariaLabel}
    class:inline
    class="button"
    on:click={ev => {
      if (stopPropagation) {
        ev.stopPropagation();
      }
      if (disabled) {
        return;
      }
      dispatch("click", ev);
    }}
    on:keydown={event => {
      if (!isKeyboardClick(event)) {
        return;
      }
      if (stopPropagation) {
        event.stopPropagation();
      }
      event.preventDefault();
      if (disabled) {
        return;
      }
      dispatch("click", event);
    }}
    role="button"
    style:padding={stylePadding}
    tabindex="0"
    {title}>
    <slot />
  </div>
{/if}
