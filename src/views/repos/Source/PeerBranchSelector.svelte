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
  import Radio from "@app/components/Radio.svelte";
  import TextInput from "@app/components/TextInput.svelte";
  import Avatar from "@app/components/Avatar.svelte";

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
    '<span style="background: var(--color-fill-yellow-iconic); color: var(--color-foreground-black);">',
    "</span>",
  ];
  let searchInput = "";
  let selectedTab: "branches" | "tags" = "branches";

  type SearchElement = {
    peer?: { id: string; alias?: string; delegate: boolean };
    revision: string;
    head: string;
    type: "branch" | "tag";
  };

  const allElements: SearchElement[] = [
    {
      peer: undefined,
      revision: repo.payloads["xyz.radicle.project"].data.defaultBranch,
      head: repo.payloads["xyz.radicle.project"].meta.head,
      type: "branch",
    },
    ...peers.flatMap(peer =>
      Object.entries(peer.heads).map(([name, head]) => ({
        peer: { id: peer.id, alias: peer.alias, delegate: peer.delegate },
        revision: name,
        head,
        type: "branch" as const,
      })),
    ),
    ...(repo.canonicalTags
      ? Object.entries(repo.canonicalTags).map(([name, head]) => ({
          peer: undefined,
          revision: name,
          head,
          type: "tag" as const,
        }))
      : []),
    ...peers.flatMap(peer =>
      peer.tags
        ? Object.entries(peer.tags).map(([name, head]) => ({
            peer: { id: peer.id, alias: peer.alias, delegate: peer.delegate },
            revision: name,
            head,
            type: "tag" as const,
          }))
        : [],
    ),
  ];

  $: searchElements = allElements.filter(
    el => el.type === (selectedTab.slice(0, -1) as "branch" | "tag"),
  );
  $: selectedPeer = peers.find(p => p.id === peer);
  $: searchResults = fuzzysort.go(searchInput, searchElements, {
    keys: ["peer.alias", "revision"],
    scoreFn: r =>
      r.score *
      (r.obj.peer?.delegate ? 2 : 1) *
      (r.obj.peer === undefined ? 10 : 1) *
      (r.obj.peer?.alias ? 2 : 1),
  });
  $: canonicalTags = repo.canonicalTags
    ? Object.entries(repo.canonicalTags)
    : [];
  $: hasTags =
    (repo.canonicalTags && Object.keys(repo.canonicalTags).length > 0) ||
    peers.some(p => p.tags && Object.keys(p.tags).length > 0);

  // Reset to branches tab if tags disappear
  $: if (!hasTags && selectedTab === "tags") {
    selectedTab = "branches";
  }
</script>

<style>
  .dropdown {
    border-radius: var(--border-radius-small);
    width: 40rem;
    max-height: 60vh;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0.25rem;
    background-color: var(--color-background-default);
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
    font-size: var(--font-size-tiny);
    padding: 0.5rem;
    color: var(--color-foreground-dim);
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
    font-family: var(--font-family-monospace);
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-small);
  }
  .tabs {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
    box-shadow: inset 0 -1px 0 var(--color-border-hint);
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
    popoverBorderRadius="var(--border-radius-small)">
    <Button
      slot="toggle"
      let:expanded
      let:toggle
      styleBorderRadius="var(--border-radius-tiny) 0 0 var(--border-radius-tiny)"
      styleWidth="100%"
      on:click={toggle}
      title="Change branch"
      disabled={!peers}>
      {#if selectedPeer}
        <div class="global-flex-item">
          <div class="node-id">
            <Avatar nodeId={selectedPeer.id} variant="small" />
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
      {#if hasTags}
        <div class="tabs">
          <Radio styleGap="0.375rem">
            <Button
              size="large"
              variant={selectedTab === "branches" ? "tab-active" : "tab"}
              on:click={() => {
                selectedTab = "branches";
                searchInput = "";
              }}>
              <Icon name="branch" />
              Branches
            </Button>
            <Button
              size="large"
              variant={selectedTab === "tags" ? "tab-active" : "tab"}
              on:click={() => {
                selectedTab = "tags";
                searchInput = "";
              }}>
              <Icon name="label" />
              Tags
            </Button>
          </Radio>
        </div>
      {/if}
      <TextInput
        showKeyHint={false}
        placeholder="Search"
        bind:value={searchInput} />
      <div class="dropdown-grid">
        <div class="dropdown-header">
          {selectedTab === "branches" ? "Branch" : "Tag"}
        </div>
        <div class="dropdown-header" style="padding-left: 0;">Head</div>

        {#if searchInput}
          {#each searchResults as result}
            {@const { revision, peer, head, type } = result.obj}
            <Link
              style={subgridStyle}
              route={{
                ...baseRoute,
                peer: type === "branch" ? peer?.id : undefined,
                revision,
              }}
              on:afterNavigate={() => {
                searchInput = "";
                toggle();
              }}>
              <DropdownListItem
                selected={selectedPeer?.id === peer?.id &&
                  selectedBranch === revision}
                style={`${subgridStyle} gap: inherit;`}>
                <div class="global-flex-item">
                  <Icon name={type === "tag" ? "label" : "branch"} />
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
                          title={type === "tag"
                            ? "Canonical tag"
                            : "Canonical branch"}
                          variant="foreground-emphasized">
                          Canonical
                        </Badge>
                      </div>
                    {/if}
                  </span>
                </div>
                <div
                  class="txt-monospace"
                  style="color: var(--color-foreground-dim);">
                  {formatCommit(head)}
                </div>
              </DropdownListItem>
            </Link>
          {:else}
            <div
              style="gap: inherit; padding: 0.5rem 0.375rem;"
              class="subgrid-item txt-missing txt-small">
              No entries found
            </div>
          {/each}
        {:else if selectedTab === "branches"}
          <Link
            style={subgridStyle}
            route={{ ...baseRoute, revision: undefined }}
            on:afterNavigate={() => {
              searchInput = "";
              toggle();
            }}>
            <DropdownListItem
              selected={onCanonical}
              style={`${subgridStyle} gap: inherit;`}>
              <div class="global-flex-item">
                <Icon name="branch" />
                {repo.payloads["xyz.radicle.project"].data.defaultBranch}
                <Badge title="Canonical branch" variant="foreground-emphasized">
                  Canonical
                </Badge>
              </div>
              <div
                class="txt-monospace"
                style="color: var(--color-foreground-dim);">
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
        {:else if selectedTab === "tags"}
          {#if canonicalTags.length > 0}
            {#each canonicalTags as [tagName, tagHead]}
              <Link
                style={subgridStyle}
                route={{
                  ...baseRoute,
                  peer: undefined,
                  revision: tagName,
                }}
                on:afterNavigate={() => {
                  searchInput = "";
                  toggle();
                }}>
                <DropdownListItem
                  selected={!peer && selectedBranch === tagName}
                  style={`${subgridStyle} gap: inherit;`}>
                  <div class="global-flex-item">
                    <Icon name="label" />
                    <span class="txt-overflow">{tagName}</span>
                    <Badge
                      title="Canonical tag"
                      variant="foreground-emphasized">
                      Canonical
                    </Badge>
                  </div>
                  <div
                    class="txt-monospace"
                    style="color: var(--color-foreground-dim);">
                    {formatCommit(tagHead)}
                  </div>
                </DropdownListItem>
              </Link>
            {/each}
          {/if}
          {#each orderBy(peers, ["delegate", o => o.alias?.toLowerCase()], ["desc", "asc"]).filter(p => p.tags && Object.keys(p.tags).length > 0) as peer}
            <Peer
              {baseRoute}
              revision={selectedBranch}
              type="tags"
              peer={{ remote: peer, selected: selectedPeer?.id === peer.id }} />
          {/each}
        {/if}
      </div>
    </div>
  </Popover>
</div>
