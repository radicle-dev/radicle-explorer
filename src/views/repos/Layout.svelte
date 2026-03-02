<script lang="ts">
  import type { ActiveTab } from "./Header.svelte";
  import type { BaseUrl, Repo, SeedingPolicy } from "@http-client";

  import Button from "@app/components/Button.svelte";
  import Header from "@app/components/Header.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Link from "@app/components/Link.svelte";
  import MobileFooter from "@app/App/MobileFooter.svelte";
  import Separator from "./Separator.svelte";
  import Sidebar from "@app/views/repos/Sidebar.svelte";
  import UserAvatar from "@app/components/UserAvatar.svelte";

  export let activeTab: ActiveTab | undefined = undefined;
  export let seedingPolicy: SeedingPolicy;
  export let baseUrl: BaseUrl;
  export let repo: Repo;
  export let stylePaddingBottom: string = "2.5rem";
  export let nodeAvatarUrl: string | undefined;
</script>

<style>
  .layout {
    display: grid;
    grid-template: auto 1fr auto / auto 1fr auto;
    height: 100%;
  }

  .desktop-header {
    grid-column: 1 / 4;
  }

  .sidebar {
    grid-column: 1 / 2;
    border-right: 1px solid var(--color-border-subtle);
  }

  .content {
    grid-column: 2 / 3;
    overflow: scroll;
  }

  .mobile-footer {
    display: none;
  }

  .breadcrumbs {
    display: flex;
    align-items: center;
    column-gap: 0.25rem;
    font: var(--txt-body-m-semibold);
    white-space: nowrap;
    flex-wrap: wrap;
    margin-left: 1rem;
  }
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .breadcrumb :global(a:hover) {
    color: var(--color-surface-brand-primary);
  }
  .avatar {
    border-radius: var(--border-radius-md);
    margin-right: 0.5rem;
  }

  @media (max-width: 719.98px) {
    .desktop-header {
      display: none;
    }
    .content {
      overflow-y: scroll;
      overflow-x: hidden;
    }
    .mobile-footer {
      margin-top: auto;
      display: grid;
      grid-column: 1 / 4;
      background-color: pink;
    }
  }
</style>

<div class="layout">
  <div class="desktop-header">
    <Header>
      <svelte:fragment slot="breadcrumbs">
        <div class="breadcrumbs">
          <Separator />
          <span class="breadcrumb">
            <Link
              style="display: flex; align-items: center; gap: 0.25rem;"
              route={{
                resource: "nodes",
                params: {
                  baseUrl,
                  repoPageIndex: 0,
                },
              }}>
              {#if nodeAvatarUrl}
                <img
                  width="24"
                  height="24"
                  class="avatar"
                  alt="Node avatar"
                  src={nodeAvatarUrl} />
              {:else}
                <UserAvatar nodeId={baseUrl.hostname} styleWidth="1.5rem" />
              {/if}
              {baseUrl.hostname}
            </Link>
          </span>

          <Separator />

          <span class="breadcrumb" title={repo.rid}>
            <Link
              route={{
                resource: "repo.source",
                repo: repo.rid,
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
        </div>
      </svelte:fragment>
    </Header>
  </div>

  <div class="sidebar global-hide-on-medium-desktop-down">
    <Sidebar {seedingPolicy} {activeTab} {baseUrl} {repo} />
  </div>

  <div class="sidebar global-hide-on-mobile-down global-hide-on-desktop-up">
    <Sidebar {seedingPolicy} {activeTab} {baseUrl} {repo} collapsedOnly />
  </div>

  <div class="content" style:padding-bottom={stylePaddingBottom}>
    <slot name="header" />
    <slot name="subheader" />
    <slot />
  </div>

  <div class="mobile-footer">
    <MobileFooter>
      <div style:width="100%">
        <Link
          title="Home"
          route={{
            resource: "repo.source",
            repo: repo.rid,
            node: baseUrl,
            path: "/",
          }}>
          <Button
            variant={activeTab === "source" ? "secondary" : "secondary-mobile"}
            styleWidth="100%">
            <Icon name="chevron-left-right" />
          </Button>
        </Link>
      </div>

      <div style:width="100%">
        <Link
          title={`${repo.payloads["xyz.radicle.project"].meta.issues.open} Issues`}
          route={{
            resource: "repo.issues",
            repo: repo.rid,
            node: baseUrl,
          }}>
          <Button
            variant={activeTab === "issues" ? "secondary" : "secondary-mobile"}
            styleWidth="100%">
            <Icon name="issue" />
          </Button>
        </Link>
      </div>

      <div style:width="100%">
        <Link
          title={`${repo.payloads["xyz.radicle.project"].meta.patches.open} Patches`}
          route={{
            resource: "repo.patches",
            repo: repo.rid,
            node: baseUrl,
          }}>
          <Button
            variant={activeTab === "patches" ? "secondary" : "secondary-mobile"}
            styleWidth="100%">
            <Icon name="patch" />
          </Button>
        </Link>
      </div>
    </MobileFooter>
  </div>
</div>
