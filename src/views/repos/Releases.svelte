<script lang="ts">
  import type { BaseUrl, Release, Repo } from "@http-client";

  import { HttpdClient } from "@http-client";
  import { RELEASES_PER_PAGE } from "./router";
  import { baseUrlToString } from "@app/lib/utils";

  import Button from "@app/components/Button.svelte";
  import ErrorMessage from "@app/components/ErrorMessage.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Layout from "./Layout.svelte";
  import Link from "@app/components/Link.svelte";
  import List from "@app/components/List.svelte";
  import Loading from "@app/components/Loading.svelte";
  import Placeholder from "@app/components/Placeholder.svelte";
  import ReleaseTeaser from "@app/views/repos/Release/ReleaseTeaser.svelte";

  export let baseUrl: BaseUrl;
  export let releases: Release[];
  export let repo: Repo;
  export let allAuthors: boolean;
  export let nodeId: string;
  export let nodeAvatarUrl: string | undefined;

  let loading = false;
  let page = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let error: any;
  let allReleases: Release[];

  $: {
    allReleases = releases;
    page = 0;
  }

  const api = new HttpdClient(baseUrl);

  async function loadReleases(): Promise<void> {
    loading = true;
    page += 1;
    try {
      const response = await api.repo.getAllReleases(repo.rid, {
        allAuthors,
        page,
        perPage: RELEASES_PER_PAGE,
      });
      allReleases = [...allReleases, ...response];
    } catch (e) {
      error = e;
    } finally {
      loading = false;
    }
  }

  // The count for the current filter isn't in repo metadata, so offer "More"
  // whenever every loaded page came back full; a short page means we've reached
  // the end.
  $: showMoreButton =
    !loading && !error && allReleases.length === (page + 1) * RELEASES_PER_PAGE;
</script>

<style>
  .header {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border-subtle);
  }
  .counter {
    border-radius: var(--border-radius-sm);
    background-color: var(--color-surface-mid);
    color: var(--color-text-tertiary);
    padding: 0 0.25rem;
    min-width: 1.5rem;
    text-align: center;
  }
  .selected {
    background-color: var(--color-surface-alpha-subtle);
    color: var(--color-text-primary);
  }
  .hover {
    background-color: var(--color-surface-strong);
    color: var(--color-text-primary);
  }
  .title-counter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .more {
    margin-top: 2rem;
    min-height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
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

<Layout {nodeId} {nodeAvatarUrl} {baseUrl} {repo} activeTab="releases">
  <div slot="header" class="header">
    <Link route={{ resource: "repo.releases", repo: repo.rid, node: baseUrl }}>
      <Button variant={!allAuthors ? "gray" : "background"}>
        <Icon name="parcel" />
        <div class="title-counter">
          Delegates
          <!-- The delegate count isn't in repo metadata; derive it from the
          loaded list while this view is active, appending "+" if more remain. -->
          {#if !allAuthors}
            <span class="counter selected">
              {allReleases.length}{showMoreButton ? "+" : ""}
            </span>
          {/if}
        </div>
      </Button>
    </Link>
    <Link
      route={{
        resource: "repo.releases",
        repo: repo.rid,
        node: baseUrl,
        allAuthors: true,
      }}>
      <Button let:hover variant={allAuthors ? "gray" : "background"}>
        <Icon name="parcel" />
        <div class="title-counter">
          All authors
          <!-- Only the full (all-authors) count is in repo metadata; absent on
          older nodes. -->
          {#if repo.payloads["xyz.radicle.project"].meta.releases !== undefined}
            <span
              class="counter"
              class:selected={allAuthors}
              class:hover={hover && !allAuthors}>
              {repo.payloads["xyz.radicle.project"].meta.releases}
            </span>
          {/if}
        </div>
      </Button>
    </Link>
  </div>

  <List items={allReleases}>
    <ReleaseTeaser
      slot="item"
      let:item
      {baseUrl}
      repoId={repo.rid}
      release={item} />
  </List>

  {#if error}
    <ErrorMessage
      title="Couldn't load releases"
      description="Please make sure you are able to connect to the seed <code>{baseUrlToString(
        api.baseUrl,
      )}</code>"
      {error} />
  {/if}

  {#if allReleases.length === 0 && !error}
    <div class="placeholder">
      <Placeholder iconName="desert" caption="No releases" />
    </div>
  {/if}

  {#if loading || showMoreButton}
    <div class="more">
      {#if loading}
        <Loading noDelay small={page !== 0} center />
      {/if}

      {#if showMoreButton}
        <Button size="large" variant="outline" on:click={loadReleases}>
          More
        </Button>
      {/if}
    </div>
  {/if}
</Layout>
