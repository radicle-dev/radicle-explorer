<script lang="ts">
  import type { BaseUrl, Repo, SeedingPolicy } from "@http-client";

  import capitalize from "lodash/capitalize";
  import HoverPopover from "@app/components/HoverPopover.svelte";
  import Link from "@app/components/Link.svelte";
  import NodeId from "@app/components/NodeId.svelte";
  import UserAvatar from "@app/components/UserAvatar.svelte";

  export let baseUrl: BaseUrl;

  export let repoThreshold: number;
  export let repoDelegates: Repo["delegates"];
  export let seedingPolicy: SeedingPolicy;
</script>

<style>
  .context-repo {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.25rem;
  }
  .row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }
  .label {
    color: var(--color-text-tertiary);
  }
  .value {
    color: var(--color-text-primary);
  }
  .term {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: help;
  }
  .avatars {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.25rem;
  }
  .avatars :global(.popover) {
    padding: 0.25rem 0.5rem;
  }
  .avatar-popover {
    white-space: nowrap;
  }
  .description {
    width: 16rem;
    font: var(--txt-body-s-regular);
    color: var(--color-text-secondary);
  }
</style>

<div class="context-repo">
  <div class="row">
    <HoverPopover stylePopoverPositionTop="0.5rem" stylePopoverPositionLeft="0">
      <div slot="toggle" class="term">
        <span class="label txt-body-m-medium">Delegates</span>
        <span class="value txt-body-m-medium">
          {repoThreshold}/{repoDelegates.length}
        </span>
      </div>
      <div slot="popover" class="description">
        {#if repoDelegates.length === 1}
          Any changes accepted by the sole delegate will be included in the
          canonical branch.
        {:else}
          {repoThreshold} out of {repoDelegates.length} delegates have to accept changes
          to be included in the canonical branch.
        {/if}
      </div>
    </HoverPopover>
    <div class="avatars">
      {#each repoDelegates as delegate}
        <HoverPopover>
          <Link
            slot="toggle"
            style="display: flex"
            route={{ resource: "users", did: delegate.id, baseUrl }}>
            <UserAvatar nodeId={delegate.id} styleWidth="1rem" />
          </Link>
          <div slot="popover" class="avatar-popover">
            <NodeId {baseUrl} nodeId={delegate.id} alias={delegate.alias} />
          </div>
        </HoverPopover>
      {/each}
    </div>
  </div>
  <HoverPopover alignRight stylePopoverPositionTop="0.5rem">
    <div slot="toggle" class="term">
      <span class="label txt-body-m-medium">Seeding Scope</span>
      <span class="value txt-body-m-medium">
        {capitalize(
          "scope" in seedingPolicy ? seedingPolicy.scope : "not defined",
        )}
      </span>
    </div>
    <div slot="popover" class="description">
      {#if seedingPolicy.policy === "block"}
        Seeding scope only has an effect when a repository is seeded. This repo
        isn’t seeded by the seed node.
      {:else if seedingPolicy.scope === "all"}
        This repository tracks changes by any peer.
      {:else}
        This repository tracks only peers followed by the seed node.
      {/if}
    </div>
  </HoverPopover>
</div>
