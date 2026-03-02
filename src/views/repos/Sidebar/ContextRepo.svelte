<script lang="ts">
  import type { BaseUrl, Repo, SeedingPolicy } from "@http-client";

  import capitalize from "lodash/capitalize";

  import IconButton from "@app/components/IconButton.svelte";
  import Icon from "@app/components/Icon.svelte";
  import NodeId from "@app/components/NodeId.svelte";

  export let baseUrl: BaseUrl;
  export let repoThreshold: number;
  export let repoDelegates: Repo["delegates"];
  export let seedingPolicy: SeedingPolicy;

  let delegateExpanded = false;
  let policyExpanded = false;
</script>

<style>
  .item-header {
    gap: 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0.2rem 0;
  }
  .item-header:first-child {
    margin-top: 0;
  }
  .item-header:last-child {
    margin-bottom: 0;
  }
  .nid {
    height: 21.5px;
    margin: 0.5rem 0;
  }
</style>

<div class="item-header">
  <span>Delegates</span>
  <div class="global-flex-item">
    <span class="txt-body-m-semibold">
      {repoThreshold}/{repoDelegates.length}
    </span>
    <IconButton on:click={() => (delegateExpanded = !delegateExpanded)}>
      <Icon name={delegateExpanded ? "chevron-up" : "chevron-down"} />
    </IconButton>
  </div>
</div>
{#if delegateExpanded}
  <div style:color="var(--color-text-tertiary)" style:margin-bottom="1rem">
    {#if repoDelegates.length === 1}
      Any changes accepted by the sole delegate will be included in the
      canonical branch.
    {:else}
      {repoThreshold} out of {repoDelegates.length} delegates have to accept changes
      to be included in the canonical branch.
    {/if}
  </div>
  <div class="delegates">
    {#each repoDelegates as delegate}
      <div class="nid">
        <NodeId {baseUrl} nodeId={delegate.id} alias={delegate.alias} />
      </div>
    {/each}
  </div>
{/if}
<div class="item-header">
  <span style:text-wrap="nowrap">Seeding Scope</span>
  <div class="global-flex-item">
    <span class="txt-body-m-semibold">
      {capitalize(
        "scope" in seedingPolicy ? seedingPolicy.scope : "not defined",
      )}
    </span>
    <IconButton on:click={() => (policyExpanded = !policyExpanded)}>
      <Icon name={policyExpanded ? "chevron-up" : "chevron-down"} />
    </IconButton>
  </div>
</div>
{#if policyExpanded}
  <div style:color="var(--color-text-tertiary)">
    {#if seedingPolicy.policy === "block"}
      Seeding scope only has an effect when a repository is seeded. This repo
      isn't seeded by the seed node.
    {:else if seedingPolicy.scope === "all"}
      This repository tracks changes by any peer.
    {:else}
      This repository tracks only peers followed by the seed node.
    {/if}
  </div>
{/if}
