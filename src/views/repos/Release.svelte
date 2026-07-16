<script lang="ts">
  import type { Artifact, BaseUrl, Release, Repo } from "@http-client";

  import * as utils from "@app/lib/utils";

  import Badge from "@app/components/Badge.svelte";
  import Button from "@app/components/Button.svelte";
  import CobHeader from "@app/views/repos/Cob/CobHeader.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Id from "@app/components/Id.svelte";
  import InlineTitle from "@app/views/repos/components/InlineTitle.svelte";
  import Layout from "./Layout.svelte";
  import Link from "@app/components/Link.svelte";
  import NodeId from "@app/components/NodeId.svelte";
  import Separator from "./Separator.svelte";

  export let baseUrl: BaseUrl;
  export let release: Release;
  export let repo: Repo;
  export let nodeId: string;
  export let nodeAvatarUrl: string | undefined;

  const SIZE_KEY = "sizeBytes";

  $: title = release.title || release.tagName || release.id;

  // Scope artifacts to delegate authors by default; the endpoint returns all
  // of them, so filtering happens client-side.
  let showAllAuthors = false;
  // An artifact redacted by its own author or a delegate is hidden by default.
  let showRedacted = false;

  $: delegateIds = new Set(repo.delegates.map(d => d.id));

  // Whether the artifact was redacted by a trusted party (its author or a
  // delegate), mirroring the backend's default-hidden rule.
  function redactedByTrusted(artifact: Artifact, delegates: Set<string>) {
    return artifact.redactions.some(
      r => r.node.id === artifact.author.id || delegates.has(r.node.id),
    );
  }

  // Artifacts visible under the given redaction toggle.
  function visible(
    list: Artifact[],
    show: boolean,
    delegates: Set<string>,
  ): Artifact[] {
    return show ? list : list.filter(a => !redactedByTrusted(a, delegates));
  }

  $: delegateArtifacts = release.artifacts.filter(a =>
    delegateIds.has(a.author.id),
  );
  $: authorArtifacts = showAllAuthors ? release.artifacts : delegateArtifacts;
  $: shownArtifacts = visible(authorArtifacts, showRedacted, delegateIds);

  // Segment counts reflect what each choice would actually show; the redacted
  // count is the hidden set within the current author scope.
  $: delegateCount = visible(
    delegateArtifacts,
    showRedacted,
    delegateIds,
  ).length;
  $: allCount = visible(release.artifacts, showRedacted, delegateIds).length;
  $: redactedCount = authorArtifacts.filter(a =>
    redactedByTrusted(a, delegateIds),
  ).length;

  // Format a byte count as a human-readable size (mirrors the CLI display).
  function formatBytes(bytes: number): string {
    const units = ["B", "KiB", "MiB", "GiB", "TiB"];
    let value = bytes;
    let i = 0;
    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i += 1;
    }
    return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`;
  }

  function artifactSize(artifact: Artifact): string | undefined {
    const size = artifact.metadata[SIZE_KEY];
    return typeof size === "number" ? formatBytes(size) : undefined;
  }

  // Group an artifact's locations by the contributing node, preserving order.
  function locationsByNode(artifact: Artifact) {
    const order: string[] = [];
    const groups: Record<
      string,
      { node: Artifact["locations"][number]["node"]; urls: string[] }
    > = {};
    for (const { node, url } of artifact.locations) {
      if (!groups[node.id]) {
        groups[node.id] = { node, urls: [] };
        order.push(node.id);
      }
      groups[node.id].urls.push(url);
    }
    return order.map(id => groups[id]);
  }

  // Order a node-keyed list so delegates come first. The backend returns
  // these sorted by DID (arbitrary to a reader); sort is stable, so the
  // original order is preserved within each group.
  function delegatesFirst<T>(
    items: T[],
    id: (item: T) => string,
    delegates: Set<string>,
  ): T[] {
    return [...items].sort(
      (a, b) => Number(delegates.has(id(b))) - Number(delegates.has(id(a))),
    );
  }

  // Metadata entries other than the size hint, shown as raw key/value pairs.
  function otherMetadata(artifact: Artifact): [string, unknown][] {
    return Object.entries(artifact.metadata).filter(
      ([key]) => key !== SIZE_KEY,
    );
  }
</script>

<style>
  .release {
    display: flex;
    flex: 1;
    min-height: 100%;
  }
  .main {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    background-color: var(--color-surface-subtle);
  }
  .title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font: var(--txt-heading-l);
    word-break: break-word;
  }
  .artifacts {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  .filter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  /* Mutually exclusive author scope, kept as one tight group. */
  .segmented {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  /* Independent redaction toggle, pushed away from the author segments. */
  .redacted-toggle {
    margin-left: auto;
  }
  .title-counter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
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
  .artifact {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    background-color: var(--color-surface-canvas);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--border-radius-sm);
  }
  .artifact-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font: var(--txt-body-m-bold);
    word-break: break-word;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font: var(--txt-body-m-regular);
  }
  .field-label {
    color: var(--color-text-tertiary);
    font: var(--txt-body-s-regular);
  }
  /* Break the full CID so it wraps within its container. */
  .cid :global(.txt-id) {
    word-break: break-all;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .locations {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .location-group {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .url {
    word-break: break-all;
    font: var(--txt-body-m-regular);
  }
  .redaction {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    color: var(--color-feedback-warning-text);
  }
  .reason {
    color: var(--color-text-tertiary);
    word-break: break-word;
  }
  .empty {
    color: var(--color-text-tertiary);
  }
</style>

<Layout {baseUrl} {nodeId} {nodeAvatarUrl} {repo} activeTab="releases">
  <svelte:fragment slot="breadcrumb">
    <Separator />
    <Link
      route={{
        resource: "repo.releases",
        repo: repo.rid,
        node: baseUrl,
      }}>
      Releases
    </Link>
    <Separator />
    <span class="txt-id">
      <div class="global-hide-on-small-desktop-down">{release.id}</div>
      <div class="global-hide-on-medium-desktop-up">
        {utils.formatObjectId(release.id)}
      </div>
    </span>
  </svelte:fragment>

  <div class="release">
    <div class="main">
      <CobHeader>
        <svelte:fragment slot="title">
          <div class="title">
            <Icon name="parcel" />
            <InlineTitle fontSize="heading-l" content={title} />
          </div>
        </svelte:fragment>
        <svelte:fragment slot="state">
          {#if release.tagName}
            <Badge size="tiny" variant="neutral">{release.tagName}</Badge>
          {/if}
          <span class="row">
            commit
            <Link
              route={{
                resource: "repo.commit",
                repo: repo.rid,
                node: baseUrl,
                commit: release.oid,
              }}>
              <Id id={release.oid} />
            </Link>
          </span>
          <NodeId
            {baseUrl}
            nodeId={release.creator.id}
            alias={release.creator.alias} />
          released
          <Id id={release.id} />
          <span title={utils.absoluteTimestamp(release.createdAt)}>
            {utils.formatTimestamp(release.createdAt)}
          </span>
        </svelte:fragment>
      </CobHeader>

      <div class="artifacts">
        <div class="filter">
          <div class="segmented">
            <Button
              variant={!showAllAuthors ? "gray" : "background"}
              on:click={() => (showAllAuthors = false)}>
              <Icon name="binary" />
              <div class="title-counter">
                Delegates
                <span class="counter" class:selected={!showAllAuthors}>
                  {delegateCount}
                </span>
              </div>
            </Button>
            <Button
              let:hover
              variant={showAllAuthors ? "gray" : "background"}
              on:click={() => (showAllAuthors = true)}>
              <Icon name="binary" />
              <div class="title-counter">
                All authors
                <span
                  class="counter"
                  class:selected={showAllAuthors}
                  class:hover={hover && !showAllAuthors}>
                  {allCount}
                </span>
              </div>
            </Button>
          </div>
          {#if redactedCount > 0}
            <div class="redacted-toggle">
              <Button
                variant={showRedacted ? "gray" : "outline"}
                on:click={() => (showRedacted = !showRedacted)}>
                <Icon name={showRedacted ? "eye" : "eye-slash"} />
                {showRedacted ? "Hide redacted" : "Show redacted"}
                ({redactedCount})
              </Button>
            </div>
          {/if}
        </div>

        {#if shownArtifacts.length === 0}
          <span class="empty">No artifacts</span>
        {/if}

        {#each shownArtifacts as artifact (artifact.cid)}
          {@const size = artifactSize(artifact)}
          {@const locations = delegatesFirst(
            locationsByNode(artifact),
            g => g.node.id,
            delegateIds,
          )}
          {@const metadata = otherMetadata(artifact)}
          <div class="artifact">
            <div class="artifact-name">
              <Icon name="binary" />
              <span>{artifact.name}</span>
              {#if size}
                <Badge size="tiny" variant="neutral">{size}</Badge>
              {/if}
              {#if artifact.attestations.length > 0}
                <Badge size="tiny" variant="positive">
                  <Icon name="checkmark" />
                  {artifact.attestations.length}
                </Badge>
              {/if}
              {#if artifact.redactions.length > 0}
                <Badge size="tiny" variant="negative">
                  <Icon name="warning" />
                  {artifact.redactions.length}
                </Badge>
              {/if}
            </div>

            <div class="field cid">
              <span class="field-label">CID</span>
              <Id id={artifact.cid} shorten={false} />
            </div>

            <div class="field">
              <span class="field-label">Added by</span>
              <div class="row">
                <NodeId
                  {baseUrl}
                  nodeId={artifact.author.id}
                  alias={artifact.author.alias} />
                {#if delegateIds.has(artifact.author.id)}
                  <Badge size="tiny" variant="delegate" round title="Delegate">
                    <Icon name="badge" />
                  </Badge>
                {/if}
              </div>
            </div>

            <div class="field">
              <span class="field-label">Locations</span>
              {#if locations.length === 0}
                <span class="empty">No locations</span>
              {:else}
                <div class="locations">
                  {#each locations as group (group.node.id)}
                    <div class="location-group">
                      <NodeId
                        {baseUrl}
                        nodeId={group.node.id}
                        alias={group.node.alias} />
                      {#if delegateIds.has(group.node.id)}
                        <Badge
                          size="tiny"
                          variant="delegate"
                          round
                          title="Delegate">
                          <Icon name="badge" />
                        </Badge>
                      {/if}
                      {#each group.urls as url}
                        <span class="url">{url}</span>
                      {/each}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>

            {#if artifact.attestations.length > 0}
              <div class="field">
                <span class="field-label">Attestations</span>
                {#each delegatesFirst(artifact.attestations, n => n.id, delegateIds) as node (node.id)}
                  <div class="row">
                    <Icon name="checkmark" />
                    <NodeId {baseUrl} nodeId={node.id} alias={node.alias} />
                    {#if delegateIds.has(node.id)}
                      <Badge
                        size="tiny"
                        variant="delegate"
                        round
                        title="Delegate">
                        <Icon name="badge" />
                      </Badge>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}

            {#if artifact.redactions.length > 0}
              <div class="field">
                <span class="field-label">Redactions</span>
                {#each delegatesFirst(artifact.redactions, r => r.node.id, delegateIds) as redaction (redaction.node.id)}
                  <div class="redaction">
                    <div class="row">
                      <Icon name="warning" />
                      <NodeId
                        {baseUrl}
                        nodeId={redaction.node.id}
                        alias={redaction.node.alias} />
                      {#if delegateIds.has(redaction.node.id)}
                        <Badge
                          size="tiny"
                          variant="delegate"
                          round
                          title="Delegate">
                          <Icon name="badge" />
                        </Badge>
                      {/if}
                    </div>
                    {#if redaction.reason}
                      <span class="reason">{redaction.reason}</span>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}

            {#if metadata.length > 0}
              <div class="field">
                <span class="field-label">Metadata</span>
                {#each metadata as [key, value] (key)}
                  <div class="row">
                    <span class="field-label">{key}</span>
                    <span>
                      {typeof value === "string"
                        ? value
                        : JSON.stringify(value)}
                    </span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
</Layout>
