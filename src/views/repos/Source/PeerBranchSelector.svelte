<script lang="ts">
  import type { RepoRoute } from "@app/views/repos/router";
  import type { Repo, Remote } from "@http-client";

  import fuzzysort from "fuzzysort";
  import orderBy from "lodash/orderBy";
  import { formatCommit, formatNodeId } from "@app/lib/utils";

  import Badge from "@app/components/Badge.svelte";
  import Button from "@app/components/Button.svelte";
  import DropdownListItem from "@app/components/DropdownList/DropdownListItem.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Link from "@app/components/Link.svelte";
  import Peer from "./PeerBranchSelector/Peer.svelte";
  import Popover from "@app/components/Popover.svelte";
  import TextInput from "@app/components/TextInput.svelte";
  import UserAvatar from "@app/components/UserAvatar.svelte";

  export let baseRoute: Extract<
    RepoRoute,
    { resource: "repo.source" } | { resource: "repo.history" }
  >;
  export let onCanonical: boolean;
  export let peer: string | undefined;
  export let peers: Remote[];
  export let repo: Repo;
  export let selectedBranch: string | undefined;

  const subgridStyle =
    "display: grid; grid-template-columns: subgrid; grid-column: span 2;";
  const highlightSearchStyle = [
    '<span style="background: var(--color-feedback-warning-bg); color: var(--color-text-primary);">',
    "</span>",
  ];
  let searchInput = "";

  const searchElements = [
    {
      peer: undefined,
      revision: repo.payloads["xyz.radicle.project"].data.defaultBranch,
      head: repo.payloads["xyz.radicle.project"].meta.head,
    },
    ...peers.flatMap(peer =>
      Object.entries(peer.heads).map(([name, head]) => ({
        peer: { id: peer.id, alias: peer.alias, delegate: peer.delegate },
        revision: name,
        head,
      })),
    ),
  ];

  $: selectedPeer = peers.find(p => p.id === peer);
  $: searchResults = fuzzysort.go(searchInput, searchElements, {
    keys: ["peer.alias", "revision"],
    scoreFn: r =>
      r.score *
      (r.obj.peer?.delegate ? 2 : 1) *
      (r.obj.peer === undefined ? 10 : 1) *
      (r.obj.peer?.alias ? 2 : 1),
  });
</script>

<style>
  .dropdown {
    border-radius: var(--border-radius-sm);
    width: 40rem;
    max-height: 60vh;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0.25rem;
  }
  .subgrid-item {
    display: grid;
    grid-template-columns: subgrid;
    grid-column: span 2;
  }
  .dropdown-grid {
    display: grid;
    column-gap: 2rem;
    grid-template-columns: [branch] minmax(20ch, 1fr) [commit] 7ch;
  }
  .dropdown-header {
    display: grid;
    grid-template-columns: subgrid;
    font: var(--txt-body-s-regular);
    padding: 0.5rem;
    color: var(--color-text-tertiary);
  }
  .container {
    display: flex;
    gap: 1px;
    min-width: 0;
    flex-wrap: nowrap;
  }
  .node-id {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    height: 1rem;
    font: var(--txt-body-m-regular);
  }
  @media (max-width: 719.98px) {
    .dropdown {
      width: 100%;
    }
  }
</style>

<div class="container">
  <Popover
    popoverContainerMinWidth="0"
    popoverPadding="0"
    popoverPositionTop="2.5rem"
    popoverBorderRadius="var(--border-radius-sm)">
    <Button
      slot="toggle"
      let:expanded
      let:toggle
      styleBorderRadius="var(--border-radius-sm) 0 0 var(--border-radius-sm)"
      styleWidth="100%"
      on:click={toggle}
      title="Change branch"
      disabled={!peers}>
      {#if selectedPeer}
        <div class="global-flex-item">
          <div class="node-id">
            <UserAvatar nodeId={selectedPeer.id} styleWidth="1rem" />
            {selectedPeer.alias || formatNodeId(selectedPeer.id)}
          </div>

          {#if selectedPeer.delegate}
            <Badge size="tiny" variant="delegate">
              <Icon name="badge" />
              <span class="global-hide-on-small-desktop-down">Delegate</span>
            </Badge>
          {/if}
        </div>
      {/if}
      {#if selectedPeer && selectedBranch}
        <span>/</span>
      {/if}
      {#if selectedBranch}
        <Icon name="branch" />
        <span class="txt-overflow">
          {selectedBranch}
        </span>
        {#if onCanonical}
          <Badge title="Canonical branch" variant="foreground-emphasized">
            Canonical
          </Badge>
        {/if}
      {/if}
      <Icon name={expanded ? "chevron-up" : "chevron-down"} />
    </Button>

    <div slot="popover" class="dropdown" let:toggle>
      <TextInput
        showKeyHint={false}
        placeholder="Search"
        bind:value={searchInput} />
      <div class="dropdown-grid">
        <div class="dropdown-header">Branch</div>
        <div class="dropdown-header" style="padding-left: 0;">Head</div>

        {#if searchInput}
          {#each searchResults as result}
            {@const { revision, peer, head } = result.obj}
            <Link
              style={subgridStyle}
              route={{
                ...baseRoute,
                peer: peer?.id,
                revision: peer ? revision : undefined,
              }}
              on:afterNavigate={() => {
                searchInput = "";
                toggle();
              }}>
              <DropdownListItem
                selected={selectedPeer?.id === peer?.id &&
                  selectedBranch === revision}
                style={subgridStyle}>
                <div class="global-flex-item">
                  <Icon name="branch" />
                  <span class="txt-overflow">
                    {#if peer?.id}
                      <span class="global-flex-item">
                        {#if result[0].target}
                          <span>
                            {@html result[0].highlight(...highlightSearchStyle)}
                          </span>
                        {:else if peer.alias}
                          {peer.alias}
                        {:else}
                          {formatNodeId(peer.id)}
                        {/if}
                        {#if peer.delegate}
                          <Badge variant="delegate" round>
                            <Icon name="badge" />
                          </Badge>
                        {/if} /
                        <span class="txt-overflow">
                          {#if result[1].target}
                            <span>
                              {@html result[1].highlight(
                                ...highlightSearchStyle,
                              )}
                            </span>
                          {:else}
                            {revision}
                          {/if}
                        </span>
                      </span>
                    {:else}
                      <div class="global-flex-item">
                        {revision}
                        <Badge
                          title="Canonical branch"
                          variant="foreground-emphasized">
                          Canonical
                        </Badge>
                      </div>
                    {/if}
                  </span>
                </div>
                <div class="txt-id">
                  {formatCommit(head)}
                </div>
              </DropdownListItem>
            </Link>
          {:else}
            <div
              style="padding: 0.5rem 0.375rem;"
              class="subgrid-item txt-body-m-regular"
              style:color="var(--color-text-tertiary)">
              No entries found
            </div>
          {/each}
        {:else}
          <Link
            style={subgridStyle}
            route={{ ...baseRoute, revision: undefined }}
            on:afterNavigate={() => {
              searchInput = "";
              toggle();
            }}>
            <DropdownListItem selected={onCanonical} style={subgridStyle}>
              <div class="global-flex-item">
                <Icon name="branch" />
                {repo.payloads["xyz.radicle.project"].data.defaultBranch}
                <Badge title="Canonical branch" variant="foreground-emphasized">
                  Canonical
                </Badge>
              </div>
              <div class="txt-id">
                {formatCommit(repo.payloads["xyz.radicle.project"].meta.head)}
              </div>
            </DropdownListItem>
          </Link>
          {#each orderBy(peers, ["delegate", o => o.alias?.toLowerCase()], ["desc", "asc"]) as peer}
            <Peer
              {baseRoute}
              revision={selectedBranch}
              peer={{ remote: peer, selected: selectedPeer?.id === peer.id }} />
          {/each}
        {/if}
      </div>
    </div>
  </Popover>
</div>
