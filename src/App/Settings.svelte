<script lang="ts">
  import {
    codeFont,
    codeFonts,
    theme,
    followSystemTheme,
    loadTheme,
  } from "@app/lib/appearance";

  import Button from "@app/components/Button.svelte";
</script>

<style>
  .settings {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    font: var(--txt-body-m-regular);
  }

  .item {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 2rem;
    white-space: nowrap;
  }

  .right {
    display: flex;
    margin-left: auto;
  }
</style>

<div class="settings">
  <div class="item">
    <div>Theme</div>
    <div class="right" style:display="flex" style:gap="0.25rem">
      <Button
        ariaLabel="Light Mode"
        styleBorderRadius="0"
        variant={!$followSystemTheme && $theme === "light"
          ? "gray"
          : "background"}
        on:click={() => {
          theme.set("light");
          followSystemTheme.set(false);
        }}>
        Light
      </Button>
      <Button
        ariaLabel="Dark Mode"
        styleBorderRadius="0"
        variant={!$followSystemTheme && $theme === "dark"
          ? "gray"
          : "background"}
        on:click={() => {
          theme.set("dark");
          followSystemTheme.set(false);
        }}>
        Dark
      </Button>
      <Button
        ariaLabel="System Theme"
        styleBorderRadius="0"
        variant={$followSystemTheme ? "gray" : "background"}
        on:click={() => {
          theme.set(loadTheme());
          followSystemTheme.set(true);
        }}>
        System
      </Button>
    </div>
  </div>
  <div class="item">
    <div>Code Font</div>
    <div class="right" style:display="flex" style:gap="0.25rem">
      {#each codeFonts as font}
        <Button
          ariaLabel={`Code Font ${font.displayName}`}
          styleBorderRadius="0"
          styleFontFamily={font.fontFamily}
          on:click={() => codeFont.set(font.storedName)}
          variant={$codeFont === font.storedName ? "gray" : "background"}>
          {font.displayName}
        </Button>
      {/each}
    </div>
  </div>
</div>
