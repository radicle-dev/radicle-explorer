<script lang="ts">
  import type { BaseUrl } from "@http-client";

  import isEqual from "lodash/isEqual";
  import { get } from "svelte/store";

  import config from "@app/lib/config";
  import { HttpdClient, ResponseError } from "@http-client";
  import {
    activeRouteStore,
    activeUnloadedRouteStore,
    push,
    withBaseUrl,
  } from "@app/lib/router";
  import { isLocal, isOnion } from "@app/lib/utils";
  import {
    addBookmark,
    bookmarkedSeeds,
    clearSeedFailure,
    failedSeeds,
    removeBookmark,
    selectedSeed,
  } from "@app/views/nodes/SeedSelector";
  import { closeFocused } from "@app/components/Popover.svelte";

  import DropdownList from "@app/components/DropdownList.svelte";
  import DropdownListItem from "@app/components/DropdownList/DropdownListItem.svelte";
  import Icon from "@app/components/Icon.svelte";
  import IconButton from "@app/components/IconButton.svelte";
  import Popover from "@app/components/Popover.svelte";
  import TextInput from "@app/components/TextInput.svelte";

  export let baseUrl: BaseUrl;
  // When false (e.g. used in global settings), picking a seed updates the
  // explore/search seed without navigating the current page onto it — only
  // the explore listing reloads. The default navigates like a seed switch.
  export let navigateOnApply = true;

  const VALIDATION_TIMEOUT_MS = 10000;

  let expanded: boolean = false;
  let loading = false;
  let addingNew = false;
  let seedAddressInput: string = "";
  let validationMessage: string | undefined = undefined;

  $: if (expanded === false) {
    validationMessage = "";
    addingNew = false;
    seedAddressInput = "";
  }

  function beginAdd() {
    validationMessage = undefined;
    seedAddressInput = "";
    addingNew = true;
  }

  async function validateInput(seed: BaseUrl): Promise<string | undefined> {
    const api = new HttpdClient(seed);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);
    try {
      await api.getNode({ abort: controller.signal });
    } catch (e) {
      console.warn(e);
      return "Seed node isn’t reachable";
    } finally {
      clearTimeout(timer);
    }
  }

  // Probe a seed to decide if it's reachable. Mirrors the reachability
  // check in `tryWithFailover`: prefer `/info`, only swallow 404/405 (older
  // httpd) and try `/node` instead. Any other error → not reachable.
  async function probeSeed(seed: BaseUrl): Promise<boolean> {
    const api = new HttpdClient(seed);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);
    try {
      try {
        await api.getInfo({ abort: controller.signal });
        return true;
      } catch (error) {
        if (
          error instanceof ResponseError &&
          (error.status === 404 || error.status === 405)
        ) {
          await api.getNode({ abort: controller.signal });
          return true;
        }
        throw error;
      }
    } catch (e) {
      console.warn(`Probe for seed ${seed.hostname} failed:`, e);
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  function parseInputToBaseUrl(input: string): BaseUrl | undefined {
    if (!input) return undefined;
    const [hostname, portString] = input.split(":");
    if (!hostname) return undefined;
    let port: number;
    if (portString !== undefined) {
      const parsed = Number(portString);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
        return undefined;
      }
      port = parsed;
    } else {
      port = isLocal(hostname)
        ? config.nodes.defaultLocalHttpdPort
        : config.nodes.defaultHttpdPort;
    }
    const scheme =
      isLocal(hostname) || isOnion(hostname)
        ? "http"
        : config.nodes.defaultHttpdScheme;
    return { hostname, port, scheme };
  }

  async function applySeed(seed: BaseUrl) {
    selectedSeed.set(seed);
    const isDefault = config.preferredSeeds.some(s => isEqual(s, seed));
    const isBookmarked = get(bookmarkedSeeds).some(s => isEqual(s, seed));
    if (!isDefault && !isBookmarked) {
      addBookmark(seed);
    }
    closeFocused();
    if (navigateOnApply) {
      // Rewrite the route's baseUrl-bearing field so we retry the same
      // logical page (repo, user, node) on the new seed — important for
      // pages opened via a hardcoded seed URL such as the "node
      // unreachable" error view. Routes without a baseUrl field
      // (explore) pass through unchanged and rely on the updated
      // `selectedSeed` store; transient routes (notFound, error,
      // booting) fall back to the new seed's node view.
      const route = withBaseUrl(get(activeUnloadedRouteStore), seed);
      await push(route);
    } else {
      // Settings context: don't move the current page onto the new seed;
      // just reload the explore listing when that's what's on screen.
      const resource = get(activeRouteStore).resource;
      if (resource === "explore" || resource === "explore.repos") {
        await push(get(activeUnloadedRouteStore));
      }
    }
  }

  async function submitSeed() {
    loading = true;
    const seed = parseInputToBaseUrl(seedAddressInput.trim());
    if (!seed) {
      validationMessage = "Enter a valid hostname or hostname:port";
      loading = false;
      return;
    }
    validationMessage = await validateInput(seed);
    if (validationMessage === undefined) {
      if (!isEqual(baseUrl, seed)) {
        await applySeed(seed);
      } else {
        closeFocused();
      }
    }
    loading = false;
  }

  async function selectSeed(seed: BaseUrl) {
    if (isEqual(baseUrl, seed)) {
      closeFocused();
      return;
    }
    // If the clicked seed is currently marked unreachable, give it a fresh
    // probe before navigating. On success the mark is cleared so the route
    // loader treats it as the primary; on failure the mark stays in place
    // and the loader's failover picks a reachable seed instead.
    if (get(failedSeeds).some(s => isEqual(s, seed))) {
      if (await probeSeed(seed)) {
        clearSeedFailure(seed);
      }
    }
    await applySeed(seed);
  }

  function openNodeView(seed: BaseUrl) {
    closeFocused();
    void push({
      resource: "nodes",
      params: { baseUrl: seed, repoPageIndex: 0 },
    });
  }

  function isSeedFailed(seed: BaseUrl, failed: BaseUrl[]) {
    return failed.some(s => isEqual(s, seed));
  }

  function handleEscape(event: KeyboardEvent) {
    if (expanded && event.key === "Escape") {
      closeFocused();
    }
  }

  function handleRemoveBookmark(item: BaseUrl) {
    const wasActive = isEqual(baseUrl, item);
    removeBookmark(item);
    if (wasActive) {
      // Clear the explicit pick so `determineSeed()` falls back through
      // its normal resolution path (bucket-pick a preferred seed, or the
      // hardcoded fallback). Setting it to the first remaining bookmark
      // or preferred seed would orphan the store when neither exists, and
      // would also bypass the bucket-based load balancing.
      selectedSeed.set(undefined);
    }
  }
</script>

<style>
  .target {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.375rem;
    max-width: 14rem;
    padding: 0.375rem 0.5rem;
    border-radius: var(--border-radius-sm);
    color: var(--color-text-secondary);
    cursor: pointer;
  }
  .target:hover {
    background-color: var(--color-surface-mid);
    color: var(--color-text-primary);
  }
  .hostname {
    font: var(--txt-body-m-regular);
  }
  .validation-message {
    color: var(--color-feedback-error-text);
    margin: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .popover-content {
    min-width: 16rem;
    display: flex;
    flex-direction: column;
  }
  .section-label {
    font: var(--txt-body-s-regular);
    color: var(--color-text-tertiary);
    margin: 0.5rem 0.5rem 0.25rem;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 0.125rem;
  }
  .add-new-row {
    padding: 0.25rem 0.25rem 0 0.25rem;
  }
  .add-new {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    width: 100%;
    height: 2.5rem;
    padding: 0.5rem 0.375rem;
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    border-radius: var(--border-radius-sm);
    font: var(--txt-body-m-regular);
    text-align: left;
  }
  .add-new:hover {
    background-color: var(--color-surface-mid);
    color: var(--color-text-primary);
  }
  .add-new-input {
    padding: 0.25rem 0.25rem 0 0.25rem;
  }
  .failed-icon {
    display: inline-flex;
    align-items: center;
    color: var(--color-feedback-warning-text);
  }
</style>

<svelte:window on:keydown={handleEscape} />

<Popover
  bind:expanded
  popoverPositionTop="2.5rem"
  popoverPositionRight="0"
  popoverPadding="0.25rem"
  popoverBorderRadius="var(--border-radius-md)">
  <div
    slot="toggle"
    let:toggle
    class="target"
    title="Switch seed used for explore"
    aria-label="Seed selector"
    on:click={toggle}
    on:keydown={e => e.key === "Enter" && toggle()}
    role="button"
    tabindex="0"
    aria-haspopup="dialog"
    aria-expanded={expanded}>
    <Icon name="seed" />
    <div class="hostname txt-overflow">{baseUrl.hostname}</div>
    <Icon name={expanded ? "chevron-up" : "chevron-down"} />
  </div>

  <svelte:fragment slot="popover">
    <div class="popover-content">
      <div class="section-label">Custom seeds</div>
      {#if $bookmarkedSeeds.length > 0}
        <DropdownList items={$bookmarkedSeeds} styleDropdownPadding="0">
          <DropdownListItem
            slot="item"
            let:item
            style="height: 2.5rem"
            on:click={() => void selectSeed(item)}
            selected={isEqual(baseUrl, item)}>
            <div class="item">
              <Icon name="seed" />
              <div class="txt-overflow" style:flex="1">{item.hostname}</div>
              {#if isSeedFailed(item, $failedSeeds)}
                <span class="failed-icon" title="Unable to reach seed">
                  <Icon name="warning" />
                </span>
              {/if}
              <div class="actions">
                <IconButton
                  ariaLabel="Open node view"
                  title="Open node view"
                  stopPropagation
                  on:click={() => openNodeView(item)}>
                  <Icon name="open-external" />
                </IconButton>
                <IconButton
                  ariaLabel="Remove bookmark"
                  stopPropagation
                  on:click={() => handleRemoveBookmark(item)}>
                  <Icon name="close" />
                </IconButton>
              </div>
            </div>
          </DropdownListItem>
        </DropdownList>
      {/if}

      {#if addingNew}
        <div class="add-new-input">
          <TextInput
            autofocus
            autoselect
            bind:value={seedAddressInput}
            name="seed"
            placeholder="seed.radicle.example"
            {loading}
            on:submit={submitSeed} />
        </div>
        {#if validationMessage}
          <span class="validation-message txt-body-s-regular">
            {validationMessage}
          </span>
        {/if}
      {:else}
        <div class="add-new-row">
          <button type="button" class="add-new" on:click={beginAdd}>
            <Icon name="plus" />
            <span>Add new</span>
          </button>
        </div>
      {/if}

      <div style:padding-top="0.5rem">
        {#if config.preferredSeeds.length > 0}
          <div class="section-label">Default seeds</div>
          <DropdownList items={config.preferredSeeds}>
            <DropdownListItem
              style="height: 2.5rem"
              on:click={() => void selectSeed(item)}
              slot="item"
              selected={isEqual(baseUrl, item)}
              let:item>
              <div class="item">
                <Icon name="seed" />
                <div class="txt-overflow" style:flex="1">{item.hostname}</div>
                {#if isSeedFailed(item, $failedSeeds)}
                  <span class="failed-icon" title="Unable to reach seed">
                    <Icon name="warning" />
                  </span>
                {/if}
                <IconButton
                  ariaLabel="Open node view"
                  title="Open node view"
                  stopPropagation
                  on:click={() => openNodeView(item)}>
                  <Icon name="open-external" />
                </IconButton>
              </div>
            </DropdownListItem>
          </DropdownList>
        {/if}
      </div>
    </div>
  </svelte:fragment>
</Popover>
