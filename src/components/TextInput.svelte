<script lang="ts">
  import debounce from "lodash/debounce";
  import { createEventDispatcher } from "svelte";
  import { onMount } from "svelte";

  import Icon from "@app/components/Icon.svelte";
  import KeyHint from "@app/components/KeyHint.svelte";
  import Loading from "@app/components/Loading.svelte";

  export let name: string | undefined = undefined;
  export let placeholder: string | undefined = undefined;
  export let value: string | undefined = undefined;

  export let size: "small" | "regular" = "regular";

  export let autofocus: boolean = false;
  export let autoselect: boolean = false;
  export let disabled: boolean = false;
  export let loading: boolean = false;
  export let valid: boolean = true;
  export let showKeyHint: boolean = true;

  const dispatch = createEventDispatcher<{
    blur: FocusEvent;
    focus: FocusEvent;
    submit: null;
  }>();

  let rightContainerWidth: number;
  let inputElement: HTMLInputElement | undefined = undefined;
  let isFocused = false;
  let success = false;

  onMount(() => {
    if (inputElement === undefined) {
      return;
    }
    if (autofocus) {
      // We set preventScroll to true for Svelte animations to work.
      inputElement.focus({ preventScroll: true });
    }
    if (autoselect) {
      inputElement.select();
    }
  });

  const restoreIcon = debounce(() => {
    success = false;
  }, 800);

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && valid) {
      success = true;
      dispatch("submit");
      restoreIcon();
    }

    if (event.key === "Escape") {
      inputElement?.blur();
    }
  }

  function handleFocusEvent(e: FocusEvent) {
    if (isFocused) {
      dispatch("blur", e);
    } else {
      dispatch("focus", e);
    }
    isFocused = !isFocused;
  }
</script>

<style>
  .wrapper {
    display: flex;
    flex-direction: column;
    margin: 0;
    position: relative;
    flex: 1;
    align-items: center;
    background: var(--color-background-dip);
  }
  .wrapper.small {
    height: var(--button-small-height);
  }
  .wrapper.regular {
    height: var(--button-regular-height);
  }
  input {
    background: var(--color-background-dip);
    font-family: inherit;
    font-size: var(--font-size-small);
    color: var(--color-foreground-contrast);
    border: 1px solid var(--color-border-hint);
    border-radius: var(--border-radius-tiny);
    line-height: 1.6;
    outline: none;
    text-overflow: ellipsis;
    width: 100%;
    height: 100%;
    padding-left: 0.75rem;
    margin: 0;
  }
  input::placeholder {
    font-family: var(--font-family-sans-serif);
    color: var(--color-foreground-dim);
    opacity: 1 !important;
  }
  input:hover:not(.invalid) {
    border: 1px solid var(--color-border-default);
  }
  input:hover:not(.invalid) + .right-container {
    border-top: 1px solid var(--color-border-default);
    border-right: 1px solid var(--color-border-default);
    border-bottom: 1px solid var(--color-border-default);
    color: var(--color-fill-contrast);
  }
  input:focus:not(.invalid) + .right-container {
    border-top: 1px solid var(--color-fill-secondary);
    border-right: 1px solid var(--color-fill-secondary);
    border-bottom: 1px solid var(--color-fill-secondary);
    color: var(--color-fill-contrast);
  }
  input:focus:not(.invalid) {
    border: 1px solid var(--color-fill-secondary);
  }
  input[disabled] {
    cursor: not-allowed;
  }
  .right-container {
    border: 1px solid transparent;
    color: var(--color-fill-gray);
    position: absolute;
    right: 0;
    top: 0;
    display: flex;
    align-items: center;
    padding-left: 0.5rem;
    overflow: hidden;
    height: 100%;
    border-top-right-radius: var(--border-radius-tiny);
    border-bottom-right-radius: var(--border-radius-tiny);
    gap: 0.25rem;
  }
  .invalid {
    border: 1px solid var(--color-border-error);
  }
</style>

<div class="wrapper {size}">
  <input
    class:invalid={!valid && value}
    style:padding-right={rightContainerWidth
      ? `${rightContainerWidth}px`
      : "auto"}
    bind:this={inputElement}
    type="text"
    {name}
    {placeholder}
    {disabled}
    bind:value
    autocomplete="off"
    spellcheck="false"
    on:input
    on:focus={handleFocusEvent}
    on:blur={handleFocusEvent}
    on:keydown|stopPropagation={handleKeydown}
    on:click
    on:change />

  <div class="right-container" bind:clientWidth={rightContainerWidth}>
    {#if loading}
      <div style:padding-right="0.5rem">
        <Loading small noDelay />
      </div>
    {/if}

    {#if valid && !loading && isFocused && showKeyHint}
      <div style:padding-right="0.25rem">
        {#if success}
          <Icon name="checkmark" />
        {:else}
          <KeyHint>⏎</KeyHint>
        {/if}
      </div>
    {/if}
  </div>
</div>
