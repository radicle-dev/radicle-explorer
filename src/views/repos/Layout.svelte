<script lang="ts">
  import type { ActiveTab } from "./Header.svelte";
  import type { BaseUrl, Repo, SeedingPolicy } from "@http-client";

  import CopyLinkButton from "./Header/CopyLinkButton.svelte";
  import Header from "@app/components/Header.svelte";
  import Link from "@app/components/Link.svelte";
  import RepoHeader from "./Header.svelte";
  import RepoNameHeader from "./Source/RepoNameHeader.svelte";
  import SeedButton from "./Header/SeedButton.svelte";
  import SeedPicker from "@app/views/explore/SeedPicker.svelte";
  import Separator from "./Separator.svelte";
  import NodeAvatar from "@app/components/NodeAvatar.svelte";

  export let activeTab: ActiveTab | undefined = undefined;
  export let baseUrl: BaseUrl;
  export let repo: Repo;
  export let repoId: string;
  export let stylePaddingBottom: string = "2.5rem";
  export let nodeId: string;
  export let nodeAvatarUrl: string | undefined;
  export let seedingPolicy: SeedingPolicy | undefined = undefined;
  export let commit: string | undefined = undefined;
  export let peer: string | undefined = undefined;
  export let revision: string | undefined = undefined;
</script>

<style>
  .layout {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .content {
    overflow: scroll;
    flex: 1;
  }

  .breadcrumbs {
    display: flex;
    align-items: center;
    column-gap: 0.25rem;
    font: var(--txt-body-m-regular);
    white-space: nowrap;
    flex-wrap: wrap;
  }
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .breadcrumb :global(a:hover) {
    color: var(--color-text-brand);
  }
  @media (max-width: 719.98px) {
    .breadcrumbs {
      display: none;
    }
    .content {
      overflow-y: scroll;
      overflow-x: hidden;
    }
  }
</style>

<div class="layout">
  <div class="app-header">
    <Header>
      <svelte:fragment slot="breadcrumbs">
        <nav class="breadcrumbs" aria-label="Breadcrumb">
          <span class="breadcrumb">
            <SeedPicker
              {baseUrl}
              mode="node"
              variant="breadcrumb"
              ariaLabel="Current node selector"
              title="Switch the node serving this page">
              <svelte:fragment slot="icon">
                <NodeAvatar {nodeId} avatarUrl={nodeAvatarUrl} />
              </svelte:fragment>
            </SeedPicker>
          </span>

          <Separator />

          <span class="breadcrumb" title={repo.rid}>
            <Link
              route={{
                resource: "repo.source",
                repo: repoId,
                node: baseUrl,
              }}>
              <div class="breadcrumb">
                {repo.payloads["xyz.radicle.project"].data.name}
              </div>
            </Link>
          </span>

          <div class="breadcrumb">
            <slot name="breadcrumb" />
          </div>
        </nav>
      </svelte:fragment>
    </Header>
  </div>

  <div class="content" style:padding-bottom={stylePaddingBottom}>
    {#if activeTab === "files" && seedingPolicy}
      <RepoNameHeader {repo} {repoId} {baseUrl} {seedingPolicy}>
        <svelte:fragment slot="actions">
          <CopyLinkButton {baseUrl} {repoId} />
          <SeedButton seedCount={repo.seeding} repoId={repo.rid} />
        </svelte:fragment>
      </RepoNameHeader>
    {/if}
    <div class="tab-bar">
      <RepoHeader
        {activeTab}
        {baseUrl}
        {repo}
        {repoId}
        {commit}
        {peer}
        {revision} />
    </div>
    <slot name="header" />
    <slot name="subheader" />
    <slot />
  </div>
</div>
