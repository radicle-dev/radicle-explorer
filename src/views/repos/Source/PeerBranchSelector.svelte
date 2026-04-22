<script lang="ts">
  import type { RepoRoute } from "@app/views/repos/router";
  import type { Repo, PeerRefs } from "@http-client";

  import fuzzysort from "fuzzysort";
  import orderBy from "lodash/orderBy";
  import {
    absoluteTimestamp,
    formatCommit,
    formatNodeId,
    formatTimestamp,
    getBranchesFromRefs,
    getTagsFromRefs,
    gravatarURL,
  } from "@app/lib/utils";

  import Badge from "@app/components/Badge.svelte";
  import Button from "@app/components/Button.svelte";
  import DropdownListItem from "@app/components/DropdownList/DropdownListItem.svelte";
  import HoverPopover from "@app/components/HoverPopover.svelte";
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
  export let peers: PeerRefs[];
  export let repo: Repo;
  export let selectedBranch: string | undefined;

  const subgridStyle =
    "display: grid; grid-template-columns: subgrid; grid-column: span 2;";
  const highlightSearchStyle = [
    '<span style="background: var(--color-feedback-warning-bg); color: var(--color-text-primary);">',
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

  $: canonicalBranchesMap = getBranchesFromRefs(repo.refs?.refs ?? {});
  $: canonicalTagsInfo = Object.fromEntries(
    Object.entries(repo.refs?.tags ?? {}).map(([name, info]) => [
      name.slice("refs/tags/".length),
      info,
    ]),
  );

  $: branchElements = [
    {
      peer: undefined,
      revision: repo.payloads["xyz.radicle.project"].data.defaultBranch,
      head: repo.payloads["xyz.radicle.project"].meta.head,
      type: "branch",
    },
    ...Object.entries(canonicalBranchesMap)
      .filter(
        ([branchName]) =>
          branchName !==
          repo.payloads["xyz.radicle.project"].data.defaultBranch,
      )
      .map(([name, head]) => ({
        peer: undefined,
        revision: name,
        head,
        type: "branch",
      })),
    ...peers.flatMap(peer => {
      const peerBranches = getBranchesFromRefs(peer.refs);
      return Object.entries(peerBranches).map(([name, head]) => ({
        peer: { id: peer.id, alias: peer.alias, delegate: peer.delegate },
        revision: name,
        head,
        type: "branch",
      }));
    }),
  ] as SearchElement[];

  $: tagElements = [
    ...Object.entries(canonicalTagsInfo).map(([name, info]) => ({
      peer: undefined,
      revision: name,
      head: info.commit,
      type: "tag",
    })),
    ...peers.flatMap(peer => {
      const peerTags = getTagsFromRefs(peer.refs);
      return Object.entries(peerTags).map(([name, head]) => ({
        peer: { id: peer.id, alias: peer.alias, delegate: peer.delegate },
        revision: name,
        head,
        type: "tag",
      }));
    }),
  ] as SearchElement[];

  $: searchElements = selectedTab === "branches" ? branchElements : tagElements;
  $: selectedPeer = peers.find(p => p.id === peer);
  $: searchResults = fuzzysort.go(searchInput, searchElements, {
    keys: ["peer.alias", "revision"],
    scoreFn: r =>
      r.score *
      (r.obj.peer?.delegate ? 2 : 1) *
      (r.obj.peer === undefined ? 10 : 1) *
      (r.obj.peer?.alias ? 2 : 1),
  });
  $: canonicalTags = Object.entries(canonicalTagsInfo).sort(
    ([nameA, infoA], [nameB, infoB]) => {
      const tsA = infoA.tagger?.timestamp ?? 0;
      const tsB = infoB.tagger?.timestamp ?? 0;
      if (tsA !== tsB) return tsB - tsA;
      return nameB.localeCompare(nameA);
    },
  );
  $: canonicalBranches = Object.entries(canonicalBranchesMap).filter(
    ([branchName]) =>
      branchName !== repo.payloads["xyz.radicle.project"].data.defaultBranch,
  );
  $: hasTags =
    Object.keys(canonicalTagsInfo).length > 0 ||
    peers.some(p => Object.keys(getTagsFromRefs(p.refs)).length > 0);

  $: selectedTag = (() => {
    if (!selectedBranch) return undefined;

    if (peer) {
      const p = peers.find(x => x.id === peer);
      if (!p) return undefined;
      const peerTags = getTagsFromRefs(p.refs);
      for (const [tagName, oid] of Object.entries(peerTags)) {
        if (
          oid === selectedBranch ||
          encodeURIComponent(tagName) === selectedBranch
        ) {
          return { name: tagName, peer: p };
        }
      }
      return undefined;
    }

    for (const [tagName, info] of Object.entries(canonicalTagsInfo)) {
      if (
        info.commit === selectedBranch ||
        encodeURIComponent(tagName) === selectedBranch
      ) {
        return { name: tagName, peer: undefined };
      }
    }

    return undefined;
  })();

  $: selectedTagName = selectedTag?.name;
  $: selectedTagPeer = selectedTag?.peer;

  let lastSelectedBranch: string | undefined;
  $: {
    if (selectedBranch !== lastSelectedBranch) {
      if (selectedTagName) {
        selectedTab = "tags";
      } else if (!selectedBranch) {
        selectedTab = "branches";
      }
      // eslint-disable-next-line no-useless-assignment
      lastSelectedBranch = selectedBranch;
    }
  }

  $: if (!hasTags && selectedTab === "tags") {
    selectedTab = "branches";
  }

  $: isSelectedBranchCanonical = (() => {
    if (onCanonical) return true;
    if (!selectedBranch || peer) return false;

    const branchNames = Object.keys(canonicalBranchesMap);
    return (
      branchNames.includes(selectedBranch) ||
      branchNames.includes(decodeURIComponent(selectedBranch))
    );
  })();
</script>

<style>
  .dropdown {
    border-radius: var(--border-radius-sm);
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
  .tabs {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .sticky-header {
    position: sticky;
    top: -0.25rem;
    margin: -0.25rem -0.25rem 0;
    padding: 0.25rem;
    background-color: var(--color-surface-canvas);
    z-index: 1;
  }
  .tag-details {
    display: flex;
    flex-direction: column;
    width: 32rem;
    grid-column: span 2;
    color: var(--color-text-secondary);
    min-width: 0;
    font: var(--txt-body-m-regular);
  }
  .tag-tagger {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin-bottom: 1rem;
  }
  .tag-avatar {
    width: 1rem;
    height: 1rem;
  }
  .tag-message {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font: var(--txt-code-small);
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
      title={hasTags ? "Change branch or tag" : "Change branch"}
      disabled={!peers}>
      {@const displayPeer = selectedPeer || selectedTagPeer}
      {#if displayPeer}
        <div class="global-flex-item">
          <div class="node-id">
            <UserAvatar nodeId={displayPeer.id} styleWidth="1rem" />
            {displayPeer.alias || formatNodeId(displayPeer.id)}
          </div>

          {#if displayPeer.delegate}
            <Badge size="tiny" variant="delegate">
              <Icon name="badge" />
              <span class="global-hide-on-small-desktop-down">Delegate</span>
            </Badge>
          {/if}
        </div>
      {/if}
      {#if displayPeer && (selectedBranch || selectedTagName)}
        <span>/</span>
      {/if}
      {#if selectedTagName}
        <Icon name="label" />
        <span class="txt-overflow">
          {selectedTagName}
        </span>
        {#if Object.keys(canonicalTagsInfo).includes(selectedTagName)}
          <Badge title="Canonical tag" variant="foreground-emphasized">
            Canonical
          </Badge>
        {/if}
      {:else if selectedBranch}
        <Icon name="branch" />
        <span class="txt-overflow">
          {selectedBranch}
        </span>
        {#if isSelectedBranchCanonical}
          <Badge title="Canonical branch" variant="foreground-emphasized">
            Canonical
          </Badge>
        {/if}
      {/if}
      <Icon name={expanded ? "chevron-up" : "chevron-down"} />
    </Button>

    <div slot="popover" class="dropdown" let:toggle>
      <div class="sticky-header">
        {#if hasTags}
          <div class="tabs">
            <Button
              variant={selectedTab === "branches" ? "selected" : "background"}
              on:click={() => {
                selectedTab = "branches";
                searchInput = "";
              }}>
              <Icon name="branch" />
              Branches
            </Button>
            <Button
              variant={selectedTab === "tags" ? "selected" : "background"}
              on:click={() => {
                selectedTab = "tags";
                searchInput = "";
              }}>
              <Icon name="label" />
              Tags
            </Button>
            <div class="global-hide-on-mobile-down" style:flex="1">
              <TextInput
                size="small"
                showKeyHint={false}
                placeholder={selectedTab === "branches"
                  ? "Filter branches"
                  : "Filter tags"}
                bind:value={searchInput} />
            </div>
          </div>
        {:else}
          <div style="margin-bottom: 0.5rem;">
            <TextInput
              showKeyHint={false}
              placeholder="Filter branches"
              bind:value={searchInput} />
          </div>
        {/if}
        {#if hasTags}
          <div
            class="global-hide-on-small-desktop-up"
            style="margin-bottom: 0.5rem;">
            <TextInput
              showKeyHint={false}
              placeholder={selectedTab === "branches"
                ? "Filter branches"
                : "Filter tags"}
              bind:value={searchInput} />
          </div>
        {/if}
      </div>
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
                revision:
                  type === "tag" ? encodeURIComponent(revision) : revision,
              }}
              on:afterNavigate={() => {
                searchInput = "";
                toggle();
              }}>
              <DropdownListItem
                selected={type === "tag"
                  ? selectedTagName === revision ||
                    selectedBranch === encodeURIComponent(revision)
                  : selectedPeer?.id === peer?.id &&
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
        {:else if selectedTab === "branches"}
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
          {#each canonicalBranches as [branchName, branchHead]}
            <Link
              style={subgridStyle}
              route={{
                ...baseRoute,
                peer: undefined,
                revision: encodeURIComponent(branchName),
              }}
              on:afterNavigate={() => {
                searchInput = "";
                toggle();
              }}>
              <DropdownListItem
                selected={!peer &&
                  (selectedBranch === branchName ||
                    selectedBranch === encodeURIComponent(branchName))}
                style={subgridStyle}>
                <div class="global-flex-item">
                  <Icon name="branch" />
                  <span class="txt-overflow">{branchName}</span>
                  <Badge
                    title="Canonical branch"
                    variant="foreground-emphasized">
                    Canonical
                  </Badge>
                </div>
                <div class="txt-id">
                  {formatCommit(branchHead)}
                </div>
              </DropdownListItem>
            </Link>
          {/each}
          {#each orderBy(peers, ["delegate", o => o.alias?.toLowerCase()], ["desc", "asc"]) as peer}
            <Peer
              {baseRoute}
              revision={selectedBranch}
              peer={{ remote: peer, selected: selectedPeer?.id === peer.id }} />
          {/each}
        {:else if selectedTab === "tags"}
          {#if canonicalTags.length > 0}
            {#each canonicalTags as [tagName, info]}
              {@const annotated = info.tagger || info.message}
              <Link
                style={subgridStyle}
                route={{
                  ...baseRoute,
                  peer: undefined,
                  revision: encodeURIComponent(tagName),
                }}
                on:afterNavigate={() => {
                  searchInput = "";
                  toggle();
                }}>
                <DropdownListItem
                  selected={!peer &&
                    (selectedBranch === tagName ||
                      selectedBranch === encodeURIComponent(tagName) ||
                      selectedTagName === tagName)}
                  style={subgridStyle}>
                  <div class="global-flex-item">
                    {#if annotated}
                      <HoverPopover>
                        <svelte:fragment slot="toggle">
                          <Icon name="label" />
                        </svelte:fragment>
                        <div slot="popover" class="tag-details">
                          {#if info.tagger}
                            <div
                              class="tag-tagger"
                              title={`${info.tagger.name} <${info.tagger.email}>`}>
                              <img
                                class="tag-avatar"
                                alt="avatar"
                                src={gravatarURL(info.tagger.email)} />
                              {info.tagger.name}
                              tagged
                              <span
                                title={absoluteTimestamp(
                                  info.tagger.timestamp,
                                )}>
                                {formatTimestamp(info.tagger.timestamp)}
                              </span>
                            </div>
                          {/if}
                          {#if info.message}
                            <pre class="tag-message">{info.message}</pre>
                          {/if}
                        </div>
                      </HoverPopover>
                    {:else}
                      <Icon name="label" />
                    {/if}
                    <span class="txt-overflow">{tagName}</span>
                    <Badge
                      title="Canonical tag"
                      variant="foreground-emphasized">
                      Canonical
                    </Badge>
                  </div>
                  <div class="txt-id">
                    {formatCommit(info.commit)}
                  </div>
                </DropdownListItem>
              </Link>
            {/each}
          {/if}
          {#each orderBy(peers, ["delegate", o => o.alias?.toLowerCase()], ["desc", "asc"]).filter(p => Object.keys(getTagsFromRefs(p.refs)).length > 0) as peer}
            <Peer
              {baseRoute}
              revision={selectedBranch}
              type="tags"
              {selectedTagName}
              peer={{
                remote: peer,
                selected: selectedTagPeer?.id === peer.id,
              }} />
          {/each}
        {/if}
      </div>
    </div>
  </Popover>
</div>
