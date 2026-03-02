<script lang="ts">
  import type { BaseUrl, Node, NodeStats } from "@http-client";

  import dompurify from "dompurify";
  import { markdown } from "@app/lib/markdown";

  import Command from "@app/components/Command.svelte";
  import Icon from "@app/components/Icon.svelte";
  import IconButton from "@app/components/IconButton.svelte";
  import Layout from "@app/components/Layout.svelte";
  import Popover from "@app/components/Popover.svelte";
  import ReposView from "./ReposView.svelte";
  import UserAvatar from "@app/components/UserAvatar.svelte";

  import PolicyExplainer from "./PolicyExplainer.svelte";
  import SeedSelector from "./SeedSelector.svelte";
  import Seeding from "./Seeding.svelte";
  import UserAgent from "./UserAgent.svelte";
  import NodeAddress from "./NodeAddress.svelte";

  export let baseUrl: BaseUrl;
  export let stats: NodeStats;
  export let node: Node;

  function render(content: string): string {
    return dompurify.sanitize(
      markdown({ linkify: true, emojis: true }).parse(content) as string,
    );
  }
</script>

<style>
  .sidebar {
    padding: 1rem;
  }

  .sidebar-content {
    gap: 1rem;
    display: flex;
    flex-direction: column;
  }

  .description {
    word-break: break-word;
  }

  .sidebar-item {
    display: flex;
    align-items: center;
    height: 2rem;
  }

  .box {
    font: var(--txt-body-m-regular);
    line-height: 1.625rem;
    width: 17rem;
  }

  code {
    font: var(--txt-code-regular);
    background-color: var(--color-surface-mid);
    border-radius: var(--border-radius-sm);
    padding: 0.125rem 0.25rem;
  }
</style>

<Layout>
  <div slot="sidebar">
    {#if node.bannerUrl}
      <img style:width="100%" alt="Node banner" src={node.bannerUrl} />
    {:else}
      <UserAvatar nodeId={node.id} styleWidth="100%" />
    {/if}

    <div class="sidebar">
      <div class="sidebar-content">
        <div style:display="flex" style:align-items="center" style:gap="1rem">
          {#if node.avatarUrl}
            <img
              style:border-radius="var(--border-radius-md)"
              style:min-width="64px"
              width="64"
              height="64"
              class="avatar"
              alt="Seed avatar"
              src={node.avatarUrl} />
          {:else}
            <UserAvatar nodeId={node.id} styleWidth="4rem" />
          {/if}
          <div style:width="100%">
            <div class="global-flex-item">
              <SeedSelector {baseUrl} />
            </div>
            <NodeAddress {node} />
          </div>
        </div>

        {#if node.description}
          <div class="description txt-body-m-regular">
            {@html render(node.description)}
          </div>
        {:else}
          <div
            class="global-flex-item txt-body-m-regular txt-missing"
            style:align-items="center"
            style:justify-content="space-between"
            style:gap="0.25rem">
            No description configured.
            <Popover popoverPositionTop="0" popoverPositionLeft="2.25rem">
              <IconButton slot="toggle" let:toggle on:click={toggle}>
                <Icon name="guide" />
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

        <div style:display="flex" style:flex-direction="column">
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
    </div>
  </div>

  <div slot="center">
    <ReposView {baseUrl} {stats} />
  </div>
</Layout>
