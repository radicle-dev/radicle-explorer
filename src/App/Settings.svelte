<script lang="ts">
  import {
    codeFont,
    codeFonts,
    theme,
    followSystemTheme,
    loadTheme,
  } from "@app/lib/appearance";

  import Button from "@app/components/Button.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Radio from "@app/components/Radio.svelte";
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
    <div class="right">
      <Radio>
        <Button
          ariaLabel="Light Mode"
          styleBorderRadius="0"
          variant={!$followSystemTheme && $theme === "light"
            ? "selected"
            : "not-selected"}
          on:click={() => {
            theme.set("light");
            followSystemTheme.set(false);
          }}>
          <Icon name="sun" />
        </Button>
        <div class="global-spacer"></div>
        <Button
          ariaLabel="Dark Mode"
          styleBorderRadius="0"
          variant={!$followSystemTheme && $theme === "dark"
            ? "selected"
            : "not-selected"}
          on:click={() => {
            theme.set("dark");
            followSystemTheme.set(false);
          }}>
          <Icon name="moon" />
        </Button>
        <div class="global-spacer"></div>
        <Button
          ariaLabel="System Theme"
          styleBorderRadius="0"
          variant={$followSystemTheme ? "selected" : "not-selected"}
          on:click={() => {
            theme.set(loadTheme());
            followSystemTheme.set(true);
          }}>
          <Icon name="device" />
        </Button>
      </Radio>
    </div>
  </div>
  <div class="item">
    <div>Code Font</div>
    <div class="right">
      <Radio>
        {#each codeFonts as font}
          <Button
            styleBorderRadius="0"
            styleFontFamily={font.fontFamily}
            on:click={() => codeFont.set(font.storedName)}
            variant={$codeFont === font.storedName
              ? "selected"
              : "not-selected"}>
            {font.displayName}
          </Button>
          <div class="global-spacer"></div>
        {/each}
      </Radio>
    </div>
  </div>
</div>
