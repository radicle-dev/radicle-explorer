<script lang="ts">
  import type { BaseUrl, Node, NodeStats } from "@http-client";

  import dompurify from "dompurify";
  import { markdown } from "@app/lib/markdown";

  import Settings from "@app/App/Settings.svelte";

  import Button from "@app/components/Button.svelte";
  import Command from "@app/components/Command.svelte";
  import Help from "@app/App/Help.svelte";
  import Icon from "@app/components/Icon.svelte";
  import IconButton from "@app/components/IconButton.svelte";
  import Link from "@app/components/Link.svelte";
  import MobileFooter from "@app/App/MobileFooter.svelte";
  import Popover from "@app/components/Popover.svelte";
  import ReposView from "./ReposView.svelte";

  import PolicyExplainer from "./PolicyExplainer.svelte";
  import SeedSelector from "./SeedSelector.svelte";
  import Seeding from "./Seeding.svelte";
  import UserAgent from "./UserAgent.svelte";
  import NodeAddress from "./NodeAddress.svelte";

  export let baseUrl: BaseUrl;
  export let stats: NodeStats;
  export let node: Node;

  let scrollY: number;
  let top: number;

  $: if (scrollY >= 0 && scrollY < 289) {
    top = 288 - scrollY;
  } else if (scrollY >= 289) {
    top = 0;
  }

  $: background = node.bannerUrl
    ? `url("${node.bannerUrl}")`
    : `url("/images/default-seed-header.png")`;

  function render(content: string): string {
    return dompurify.sanitize(
      markdown({ linkify: true, emojis: true }).parse(content) as string,
    );
  }
</script>

<style>
  .below-header {
    display: grid;
    grid-template: auto 1fr auto / auto 1fr auto;
  }
  .breadcrumbs {
    display: flex;
    gap: 0.5rem;
    flex-direction: row;
    align-items: center;
    height: 3.5rem;
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-small);
    padding: 0.5rem 0.5rem 0.5rem 1rem;
    justify-content: flex-end;
  }

  .description {
    word-break: break-word;
  }

  .header {
    grid-column: 1 / 4;
    border-bottom: 1px solid var(--color-fill-separator);
    height: 18rem;
    display: flex;
    justify-content: space-between;
    flex-direction: column;
    position: sticky;
    z-index: 5;
    background-color: var(--color-background-default);
    background-position: center;
    background-size: cover;
  }
  .sidebar {
    grid-column: 1 / 2;
    border-right: 1px solid var(--color-fill-separator);
    width: 30rem;
    position: fixed;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 1.5rem;
    height: 100%;
    z-index: 1;
  }

  .content {
    grid-column: 2 / 3;
    margin-left: 30rem;
  }

  .mobile-header {
    height: 8rem;
    display: flex;
    align-items: flex-end;
    border-bottom: 1px solid var(--color-fill-separator);
    background-color: var(--color-background-default);
    background-position: center;
    background-size: cover;
  }

  .mobile-footer {
    display: none;
  }

  .container {
    width: 100%;
    display: flex;
    justify-content: center;
  }
  .wrapper {
    padding: 1.5rem;
    max-width: 78rem;
    margin: 0 auto;
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  .sidebar-item {
    display: flex;
    align-items: center;
    height: 2rem;
  }

  .box {
    font-size: var(--font-size-small);
    line-height: 1.625rem;
    width: 17rem;
  }
  code {
    font-family: var(--font-family-monospace);
    font-size: var(--font-size-small);
    background-color: var(--color-fill-ghost);
    border-radius: var(--border-radius-tiny);
    padding: 0.125rem 0.25rem;
  }
  .desktop-hostname {
    max-width: 22rem;
  }
  @media (max-width: 1010.98px) {
    .wrapper {
      padding: 1.5rem;
    }
    .sidebar {
      width: 325px;
    }
    .content {
      margin-left: 325px;
    }
    .desktop-hostname {
      max-width: 12rem;
    }
  }

  @media (max-width: 719.98px) {
    .title {
      display: flex;
      flex-direction: column;
      margin-left: 1.5rem;
    }
    .layout {
      height: 100%;
    }
    .below-header {
      height: 100%;
    }
    .header {
      display: none;
    }
    .content {
      overflow-x: hidden;
      margin-left: 0;
    }
    .wrapper {
      width: 100%;
      padding: 1rem;
    }
    .container {
      padding: 0;
    }
    .mobile-footer {
      margin-top: auto;
      display: grid;
      grid-column: 1 / 4;
      background-color: pink;
    }
  }
</style>

<svelte:window bind:scrollY />

<div class="layout">
  <div class="header" style:background-image={background}>
    <div class="breadcrumbs">
      <Link
        style="display: flex; align-items: center;"
        route={{ resource: "nodes", params: undefined }}>
        <div
          style="background-color: var(--color-background-default);border-radius: var(--border-radius-small); display: flex; padding: 0.5rem 0;">
          <img
            style:margin="0 0.5rem"
            width="24"
            height="24"
            class="logo"
            alt="Radicle logo"
            src="/radicle.svg" />
        </div>
      </Link>
    </div>
  </div>

  <div class="below-header">
    <div
      class="sidebar global-hide-on-mobile-down"
      style:top={`${top}px`}
      style:height={`calc(100% - ${top}px)`}>
      <div class="title">
        <div
          style="display: flex; align-items: center; gap: 1rem;"
          style:margin-bottom="1.5rem">
          <img
            style:border-radius="var(--border-radius-small)"
            style:min-width="64px"
            width="64"
            height="64"
            class="avatar"
            alt="Seed avatar"
            src={node.avatarUrl
              ? node.avatarUrl
              : "/images/default-seed-avatar.png"} />
          <div style:width="100%">
            <div class="global-flex-item desktop-hostname">
              <SeedSelector {baseUrl} />
            </div>
            <NodeAddress {node} />
          </div>
        </div>
        {#if node.description}
          <div class="description txt-small">
            {@html render(node.description)}
          </div>
        {:else}
          <div
            class="global-flex-item txt-small txt-missing"
            style:align-items="center"
            style:justify-content="space-between"
            style:gap="0.25rem">
            No description configured.
            <Popover popoverPositionTop="0" popoverPositionLeft="2.25rem">
              <IconButton slot="toggle" let:toggle on:click={toggle}>
                <Icon name="info" />
              </IconButton>

              <div slot="popover" class="box">
                If you're the owner of this node, you can customize this page by
                setting the
                <code>avatarUrl</code>
                ,
                <code>bannerUrl</code>
                and
                <code>description</code>
                fields under the
                <code>web</code>
                object in your node config.
                <div style:margin-top="1rem">
                  <Command command="rad config edit" fullWidth />
                </div>
              </div>
            </Popover>
          </div>
        {/if}
        <div
          style:display="flex"
          style:margin-top="1.5rem"
          style:margin-bottom="1rem"
          style:flex-direction="column">
          <PolicyExplainer seedingPolicy={node.config?.seedingPolicy} />
          <div class="sidebar-item">
            <Seeding count={stats.repos.total}>
              <div style:width="2rem"></div>
            </Seeding>
          </div>
          <div class="sidebar-item">
            <UserAgent agent={node.agent} />
          </div>
        </div>
      </div>
      <div class="sidebar-footer">
        <div
          style:margin-top="1.5rem"
          style:display="flex"
          style:justify-content="space-between"
          style:flex-direction="row">
          <div class="horizontal-buttons">
            <Popover popoverPositionBottom="2.5rem" popoverPositionLeft="0">
              <Button
                variant="outline"
                title="Settings"
                slot="toggle"
                let:toggle
                on:click={toggle}>
                <Icon name="settings" />
                Settings
              </Button>

              <Settings slot="popover" />
            </Popover>
          </div>
          <div class="horizontal-buttons">
            <Popover popoverPositionBottom="2.5rem" popoverPositionLeft="0">
              <Button
                variant="outline"
                title="Help"
                slot="toggle"
                let:toggle
                on:click={toggle}>
                <Icon name="help" />
                Help
              </Button>
              <Help slot="popover" />
            </Popover>
          </div>
        </div>
      </div>
    </div>

    <div class="content">
      <div class="global-hide-on-small-desktop-up">
        <div
          class="mobile-header txt-huge txt-semibold"
          style:background-image={background}>
        </div>
      </div>
      <div class="container">
        <div class="wrapper">
          <div
            class="global-hide-on-small-desktop-up"
            style="display: flex; align-items: center; gap: 1rem;">
            <img
              style:min-width="64px"
              style:border-radius="var(--border-radius-small)"
              width="64"
              height="64"
              alt="Seed avatar"
              src={node.avatarUrl
                ? node.avatarUrl
                : "/images/default-seed-avatar.png"} />
            <div>
              <div class="global-flex-item">
                <SeedSelector {baseUrl} />
              </div>
              <NodeAddress {node} />
            </div>
          </div>
          {#if node.description}
            <div
              class="global-hide-on-small-desktop-up"
              style:margin-top="1.5rem"
              style:display="flex"
              style:flex-direction="column"
              style:gap="0.25rem">
              {#if node.description}
                <div class="description txt-small">
                  {@html render(node.description)}
                </div>
              {/if}
            </div>
          {:else}
            <div
              class="global-flex-item txt-small txt-missing global-hide-on-small-desktop-up"
              style:margin-top="1.5rem">
              No description configured.
            </div>
          {/if}

          <ReposView {baseUrl} {stats} />
        </div>
      </div>
    </div>

    <div class="mobile-footer">
      <MobileFooter>
        <div style:width="100%">
          <Popover popoverPositionBottom="3rem" popoverPositionRight="-7.5rem">
            <Button
              let:expanded
              slot="toggle"
              variant={expanded ? "secondary" : "secondary-mobile-toggle"}
              styleWidth="100%"
              let:toggle
              on:click={toggle}>
              <Icon name="info" />
            </Button>

            <div slot="popover" style:width="20rem">
              <PolicyExplainer seedingPolicy={node.config?.seedingPolicy} />
              <UserAgent agent={node.agent} />
            </div>
          </Popover>
        </div>
      </MobileFooter>
    </div>
  </div>
</div>
