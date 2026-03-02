<script lang="ts">
  import type { ComponentProps } from "svelte";

  import IconLarge from "./IconLarge.svelte";

  export let iconName: ComponentProps<IconLarge>["name"];
  export let caption: string;
  export let inline: boolean = false;
</script>

<style>
  .placeholder {
    align-items: center;
    text-align: center;
    color: var(--color-text-tertiary);
    display: flex;
    flex-direction: column;
    font: var(--txt-body-m-regular);
    gap: 0.5rem;
    justify-content: center;
  }
  .inline {
    flex-direction: row;
  }
</style>

<div class="placeholder" class:inline>
  <IconLarge name={iconName} />
  {#each caption.split("\n") as line}
    {line}
    <br />
  {/each}
</div>
