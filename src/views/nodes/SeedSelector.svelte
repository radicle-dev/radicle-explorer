<script lang="ts">
  import type { BaseUrl } from "@http-client";

  import isEqual from "lodash/isEqual";
  import some from "lodash/some";

  import config from "@app/lib/config";
  import { HttpdClient } from "@http-client";
  import {
    addBookmark,
    bookmarkedSeeds,
    removeBookmark,
    selectedSeed,
  } from "./SeedSelector";
  import { closeFocused } from "@app/components/Popover.svelte";
  import { extractBaseUrl, push } from "@app/lib/router";

  import DropdownList from "@app/components/DropdownList.svelte";
  import DropdownListItem from "@app/components/DropdownList/DropdownListItem.svelte";
  import Icon from "@app/components/Icon.svelte";
  import IconButton from "@app/components/IconButton.svelte";
  import Popover from "@app/components/Popover.svelte";
  import TextInput from "@app/components/TextInput.svelte";

  export let baseUrl: BaseUrl;

  let expanded: boolean = false;
  let loading = false;
  let seedAddressInput: string = baseUrl.hostname;
  let validationMessage: string | undefined = undefined;

  $: if (expanded === false) {
    validationMessage = "";
  }

  async function validateInput(seed: BaseUrl): Promise<string | undefined> {
    const api = new HttpdClient(seed);
    try {
      await api.getNode();
    } catch (e) {
      console.warn(e);
      return "Seed node isn't reachable";
    }
  }

  async function navigateToSeed() {
    loading = true;
    const seed = extractBaseUrl(seedAddressInput.trim());
    validationMessage = await validateInput(seed);
    if (validationMessage === undefined) {
      closeFocused();
      if (isEqual(baseUrl, seed)) {
        loading = false;
        return;
      }
      void push({
        resource: "nodes",
        params: { baseUrl: seed, repoPageIndex: 0 },
      });
      selectedSeed.set(seed);
    }
    loading = false;
  }

  function selectSeed(seed: BaseUrl) {
    closeFocused();
    selectedSeed.set(seed);
    seedAddressInput = seed.hostname;
    void push({
      resource: "nodes",
      params: { baseUrl: seed, repoPageIndex: 0 },
    });
  }
</script>

<style>
  .container {
    justify-content: space-between;
    width: 100%;
  }
  .popover {
    display: flex;
    flex-direction: column;
  }

  .validation-message {
    color: var(--color-foreground-red);
    margin-top: 0.5rem;
    margin-left: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .flex-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .target {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    max-width: 19.5rem;
  }

  @media (max-width: 1010.98px) {
    .target {
      max-width: 10rem;
    }
    .container {
      justify-content: flex-start;
    }
  }

  @media (max-width: 719.98px) {
    .target {
      max-width: 14.5rem;
    }
  }
</style>

<div class="global-flex-item container" style:width="100%">
  <Popover
    bind:expanded
    popoverPositionTop="2.5rem"
    popoverPadding="0.25rem"
    popoverBorderRadius="var(--border-radius-small)">
    <div class="target" slot="toggle" title="Switch preferred seed" let:toggle>
      <div class="txt-medium txt-semibold txt-overflow">
        {baseUrl.hostname}
      </div>
      <IconButton on:click={toggle} ariaLabel="Toggle seed selector dropdown">
        <Icon name={expanded ? "chevron-up" : "chevron-down"} />
      </IconButton>
    </div>

    <svelte:fragment slot="popover">
      <div style:width="16rem">
        <div class="txt-small" style:margin="0.5rem 0.5rem">
          Navigate to seed
        </div>
        <div style:padding="0 0.25rem">
          <TextInput
            autofocus
            autoselect
            bind:value={seedAddressInput}
            name="seed"
            placeholder="seed.radicle.example"
            {loading}
            on:submit={navigateToSeed} />
        </div>
        {#if validationMessage}
          <span class="validation-message txt-small">{validationMessage}</span>
        {/if}
        <div class="popover" style:padding-top="0.75rem">
          <DropdownList items={$bookmarkedSeeds} styleDropdownPadding="0">
            <DropdownListItem
              slot="item"
              let:item
              style="height: 2.5rem"
              on:click={() => {
                selectSeed(item);
              }}
              selected={isEqual(baseUrl, item)}>
              <div class="flex-wrapper">
                <div class="global-flex-item txt-overflow">
                  <Icon name="seedling" />
                  <div class="txt-overflow">{item.hostname}</div>
                </div>
                <IconButton
                  ariaLabel="Remove bookmark"
                  stopPropagation
                  on:click={() => removeBookmark(item)}>
                  <Icon name="bookmark-on" />
                </IconButton>
              </div>
            </DropdownListItem>
          </DropdownList>

          <DropdownList items={config.preferredSeeds}>
            <DropdownListItem
              style="height: 2.5rem"
              on:click={() => selectSeed(item)}
              slot="item"
              selected={isEqual(baseUrl, item)}
              let:item>
              <div class="flex-wrapper">
                <div class="global-flex-item txt-overflow">
                  <Icon name="seedling" />
                  <div class="txt-overflow">{item.hostname}</div>
                </div>
                <IconButton disabled title="Default seeds can't be removed">
                  <Icon name="bookmark-on" />
                </IconButton>
              </div>
            </DropdownListItem>
          </DropdownList>
          {#if !$bookmarkedSeeds.length && !config.preferredSeeds.length}
            <span class="txt-missing txt-small" style:padding="0.5rem">
              No default or bookmarked seeds
            </span>
          {/if}
        </div>
      </div>
    </svelte:fragment>
  </Popover>

  <IconButton
    ariaLabel={some($bookmarkedSeeds, baseUrl) ||
    some(config.preferredSeeds, baseUrl)
      ? "Remove bookmark"
      : "Add bookmark"}
    stopPropagation
    disabled={some(config.preferredSeeds, baseUrl)}
    title={some(config.preferredSeeds, baseUrl)
      ? "Default seeds can't be removed"
      : undefined}
    on:click={() => {
      if (some($bookmarkedSeeds, baseUrl)) {
        removeBookmark(baseUrl);
      } else {
        addBookmark(baseUrl);
      }
    }}>
    {#if some($bookmarkedSeeds, baseUrl) || some(config.preferredSeeds, baseUrl)}
      <Icon name="bookmark-on" />
    {:else}
      <Icon name="bookmark-off" />
    {/if}
  </IconButton>
</div>
