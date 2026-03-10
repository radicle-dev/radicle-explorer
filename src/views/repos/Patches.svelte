<script lang="ts">
  import type {
    BaseUrl,
    Patch,
    PatchState,
    Repo,
    SeedingPolicy,
  } from "@http-client";

  import { HttpdClient } from "@http-client";
  import capitalize from "lodash/capitalize";

  import { PATCHES_PER_PAGE } from "./router";
  import { baseUrlToString } from "@app/lib/utils";

  import Button from "@app/components/Button.svelte";
  import DropdownList from "@app/components/DropdownList.svelte";
  import DropdownListItem from "@app/components/DropdownList/DropdownListItem.svelte";
  import ErrorMessage from "@app/components/ErrorMessage.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Layout from "./Layout.svelte";
  import Link from "@app/components/Link.svelte";
  import List from "@app/components/List.svelte";
  import Loading from "@app/components/Loading.svelte";
  import PatchTeaser from "./Patch/PatchTeaser.svelte";
  import Placeholder from "@app/components/Placeholder.svelte";
  import Popover, { closeFocused } from "@app/components/Popover.svelte";
  import Separator from "./Separator.svelte";
  import Share from "./Share.svelte";

  export let baseUrl: BaseUrl;
  export let seedingPolicy: SeedingPolicy;
  export let patches: Patch[];
  export let repo: Repo;
  export let status: PatchState["status"];
  export let nodeAvatarUrl: string | undefined;

  let loading = false;
  let page = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let error: any;
  let allPatches: Patch[];

  $: {
    allPatches = patches;
    page = 0;
  }

  const api = new HttpdClient(baseUrl);

  async function loadMore(status: PatchState["status"]): Promise<void> {
    loading = true;
    page += 1;
    try {
      const response = await api.repo.getAllPatches(repo.rid, {
        status,
        page,
        perPage: PATCHES_PER_PAGE,
      });
      allPatches = [...allPatches, ...response];
    } catch (e) {
      error = e;
    } finally {
      loading = false;
    }
  }

  const stateOptions: PatchState["status"][] = [
    "draft",
    "open",
    "archived",
    "merged",
  ];

  const stateColor: Record<PatchState["status"], string> = {
    draft: "var(--color-text-draft)",
    open: "var(--color-text-open)",
    archived: "var(--color-text-archived)",
    merged: "var(--color-text-merged)",
  };

  const stateBackground: Record<PatchState["status"], string> = {
    draft: "var(--color-surface-draft)",
    open: "var(--color-surface-open)",
    archived: "var(--color-surface-archived)",
    merged: "var(--color-surface-merged)",
  };

  $: showMoreButton =
    !loading &&
    !error &&
    allPatches.length <
      repo.payloads["xyz.radicle.project"].meta.patches[status];
</script>

<style>
  .header {
    display: flex;
    justify-content: space-between;
    padding: 1rem;
  }
  .more {
    margin-top: 2rem;
    min-height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .dropdown-button-counter {
    border-radius: var(--border-radius-sm);
    background-color: var(--color-surface-alpha-subtle);
    color: var(--color-text-primary);
    padding: 0 0.25rem;
  }
  .dropdown-list-counter {
    border-radius: var(--border-radius-sm);
    background-color: var(--color-surface-mid);
    color: var(--color-text-tertiary);
    padding: 0 0.25rem;
  }
  .selected {
    background-color: var(--color-surface-alpha-subtle);
    color: var(--color-text-tertiary);
  }
  .placeholder {
    height: calc(100% - 4rem);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  @media (max-width: 719.98px) {
    .placeholder {
      height: calc(100vh - 10rem);
    }
  }
</style>

<Layout {nodeAvatarUrl} {seedingPolicy} {baseUrl} {repo} activeTab="patches">
  <svelte:fragment slot="breadcrumb">
    <Separator />
    <Link
      route={{
        resource: "repo.patches",
        repo: repo.rid,
        node: baseUrl,
      }}>
      Patches
    </Link>
  </svelte:fragment>
  <div slot="header" class="header">
    <Popover
      popoverPadding="0"
      popoverPositionTop="2.5rem"
      popoverBorderRadius="var(--border-radius-md)">
      <Button
        let:expanded
        slot="toggle"
        let:toggle
        on:click={toggle}
        ariaLabel="filter-dropdown"
        title="Filter patches by state">
        <div
          style:color={stateColor[status]}
          style:background={stateBackground[status]}
          style:padding="0.25rem 0.25rem"
          style:border-radius="var(--border-radius-sm)">
          <Icon
            name={status === "draft"
              ? "patch-draft"
              : status === "merged"
                ? "patch-merged"
                : status === "archived"
                  ? "patch-archived"
                  : "patch"} />
        </div>
        {capitalize(status)}
        <div class="dropdown-button-counter">
          {repo.payloads["xyz.radicle.project"].meta.patches[status]}
        </div>
        <Icon name={expanded ? "chevron-up" : "chevron-down"} />
      </Button>
      <DropdownList slot="popover" items={stateOptions}>
        <Link
          slot="item"
          let:item
          on:afterNavigate={() => closeFocused()}
          route={{
            resource: "repo.patches",
            repo: repo.rid,
            node: baseUrl,
            search: `status=${item}`,
          }}>
          <DropdownListItem selected={item === status}>
            <div
              style:color={stateColor[item]}
              style:background={stateBackground[item]}
              style:padding="0.25rem 0.25rem"
              style:border-radius="var(--border-radius-sm)">
              <Icon
                name={item === "draft"
                  ? "patch-draft"
                  : item === "merged"
                    ? "patch-merged"
                    : item === "archived"
                      ? "patch-archived"
                      : "patch"} />
            </div>
            <div
              style="display: flex; gap: 1rem;justify-content: space-between; width: 100%;">
              {capitalize(item)}
              <div
                class="dropdown-list-counter"
                class:selected={item === status}>
                {repo.payloads["xyz.radicle.project"].meta.patches[item]}
              </div>
            </div>
          </DropdownListItem>
        </Link>
      </DropdownList>
    </Popover>

    <Share />
  </div>

  <List items={allPatches}>
    <PatchTeaser
      slot="item"
      let:item
      {baseUrl}
      repoId={repo.rid}
      patch={item} />
  </List>

  {#if error}
    <ErrorMessage
      title="Couldn't load patches"
      description="Please make sure you are able to connect to the seed <code>{baseUrlToString(
        api.baseUrl,
      )}</code>"
      {error} />
  {/if}

  {#if repo.payloads["xyz.radicle.project"].meta.patches[status] === 0}
    <div class="placeholder">
      <Placeholder iconName="no-patches" caption={`No ${status} patches`} />
    </div>
  {/if}

  {#if loading || showMoreButton}
    <div class="more">
      {#if loading}
        <div style:margin-top={page === 0 ? "8rem" : ""}>
          <Loading noDelay small={page !== 0} center />
        </div>
      {/if}

      {#if showMoreButton}
        <Button
          size="large"
          variant="outline"
          on:click={() => loadMore(status)}>
          More
        </Button>
      {/if}
    </div>
  {/if}
</Layout>
