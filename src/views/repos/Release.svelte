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

  // The web (http/https) location used as the browser download link,
  // preferring one contributed by a delegate.
  function downloadUrl(
    artifact: Artifact,
    delegates: Set<string>,
  ): string | undefined {
    const web = artifact.locations.filter(l => /^https?:\/\//i.test(l.url));
    return (web.find(l => delegates.has(l.node.id)) ?? web[0])?.url;
  }

  let copiedArtifact: string | undefined;
  // Copy a CLI-only artifact's sole fetch location, with brief feedback keyed
  // by the artifact's CID.
  async function copyLocation(cid: string, url: string): Promise<void> {
    await navigator.clipboard.writeText(url);
    copiedArtifact = cid;
    setTimeout(() => {
      if (copiedArtifact === cid) {
        copiedArtifact = undefined;
      }
    }, 1500);
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
    background-color: var(--color-surface-base);
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
  }
  .filter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border-subtle);
  }
  .filter-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .redacted-toggle-wrap {
    display: flex;
    justify-content: center;
    padding: 1rem;
  }
  .ghost-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    height: var(--button-small-height);
    padding: 0 0.75rem;
    border: none;
    border-radius: var(--border-radius-sm);
    background: transparent;
    color: var(--color-text-secondary);
    font: var(--txt-body-m-semibold);
    cursor: pointer;
  }
  .ghost-btn:hover {
    background-color: var(--color-surface-mid);
  }
  .empty-artifacts {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 4rem 1.25rem;
    color: var(--color-text-tertiary);
    font: var(--txt-body-m-regular);
    text-align: center;
  }
  .empty-artifacts :global(svg) {
    width: 2rem;
    height: 2rem;
  }
  .segmented {
    display: flex;
    align-items: center;
    gap: 0.25rem;
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
    padding: 1.25rem;
    background-color: var(--color-surface-canvas);
    border-bottom: 1px solid var(--color-border-subtle);
  }
  .artifact-name {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    font: var(--txt-body-m-regular);
    word-break: break-word;
  }
  .name {
    font: var(--txt-body-m-regular);
  }
  .cid {
    margin-top: -0.5rem;
    margin-bottom: 0.5rem;
  }
  .provenance {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    color: var(--color-text-tertiary);
    font: var(--txt-body-m-regular);
  }
  .attested {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
  }
  .attestor {
    display: inline-flex;
    align-items: center;
  }
  .metadata {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.75rem;
    font: var(--txt-body-m-regular);
  }
  .meta-item {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }
  .meta-key {
    color: var(--color-text-secondary);
  }
  .meta-value {
    color: var(--color-text-tertiary);
  }
  .artifact-actions {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }
  .size {
    color: var(--color-text-tertiary);
  }
  /* Matches Button variant="gray" size="regular". */
  .download {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    height: var(--button-small-height);
    padding: 0 0.75rem;
    cursor: pointer;
    border: 1px solid transparent;
    border-radius: var(--border-radius-sm);
    background-color: var(--color-surface-mid);
    color: var(--color-text-primary);
    font: var(--txt-body-m-semibold);
    text-decoration: none;
    white-space: nowrap;
    box-sizing: border-box;
  }
  .download:hover {
    background-color: var(--color-surface-strong);
  }
  .download.disabled {
    cursor: not-allowed;
    color: var(--color-text-disabled);
  }
  .download.disabled:hover {
    background-color: var(--color-surface-mid);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font: var(--txt-body-m-regular);
  }
  .divider {
    width: 100%;
    height: 0;
    margin: 0.75rem 0;
    border: none;
    border-top: 1px solid var(--color-border-subtle);
  }
  .field-label {
    color: var(--color-text-tertiary);
    font: var(--txt-body-m-regular);
  }
  .delegate {
    display: inline-flex;
    align-items: center;
    margin-left: -0.25rem;
    color: var(--color-text-tertiary);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .locations-accordion summary {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    width: fit-content;
    list-style: none;
  }
  .locations-accordion summary::-webkit-details-marker {
    display: none;
  }
  .chevron {
    display: inline-flex;
    color: var(--color-text-tertiary);
    transition: transform 0.1s ease;
  }
  .locations-accordion[open] .chevron {
    transform: rotate(90deg);
  }
  .locations {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 0.75rem;
  }
  .location-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
  }
  .location-node {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .url {
    display: block;
    min-width: 0;
    max-width: 100%;
    font: var(--txt-body-m-regular);
  }
  .url :global(.container) {
    display: block;
    max-width: 100%;
  }
  .url :global(.txt-id) {
    display: block !important;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap !important;
  }
  .redaction {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    color: var(--color-feedback-error-text);
  }
  .reason {
    color: var(--color-text-tertiary);
    word-break: break-word;
  }
</style>

<Layout
  {baseUrl}
  {nodeId}
  {nodeAvatarUrl}
  {repo}
  repoId={repo.rid}
  activeTab="releases">
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
          <div class="filter-controls">
            <div class="segmented">
              <Button
                let:hover
                variant={showAllAuthors ? "gray" : "background"}
                on:click={() => (showAllAuthors = true)}>
                <Icon name="avatar-incognito" />
                <div class="title-counter">
                  All
                  <span
                    class="counter"
                    class:selected={showAllAuthors}
                    class:hover={hover && !showAllAuthors}>
                    {allCount}
                  </span>
                </div>
              </Button>
              <Button
                variant={!showAllAuthors ? "gray" : "background"}
                on:click={() => (showAllAuthors = false)}>
                <Icon name="badge" />
                <div class="title-counter">
                  Delegates
                  <span class="counter" class:selected={!showAllAuthors}>
                    {delegateCount}
                  </span>
                </div>
              </Button>
            </div>
          </div>
        </div>

        {#if shownArtifacts.length === 0}
          <div class="empty-artifacts">
            <Icon name="attach" />
            No artifacts
          </div>
        {/if}

        {#each shownArtifacts as artifact (artifact.cid)}
          {@const size = artifactSize(artifact)}
          {@const locations = delegatesFirst(
            locationsByNode(artifact),
            g => g.node.id,
            delegateIds,
          )}
          {@const metadata = otherMetadata(artifact)}
          {@const download = downloadUrl(artifact, delegateIds)}
          {@const locationCount = locations.reduce(
            (sum, g) => sum + g.urls.length,
            0,
          )}
          {@const cliOnly = !download && locationCount > 0}
          {@const soleLocationUrl =
            locationCount === 1 ? locations[0]?.urls[0] : undefined}
          {@const redactedBy = artifact.redactions
            .map(r => r.node.alias ?? utils.truncateId(r.node.id))
            .join(", ")}
          <div class="artifact">
            <div class="artifact-name">
              <span class="name">{artifact.name}</span>
              {#if artifact.redactions.length > 0}
                <Badge
                  size="tiny"
                  variant="negative"
                  title="Redacted by {redactedBy}">
                  <Icon name="warning" />
                  Redacted
                </Badge>
              {/if}
              <div class="artifact-actions">
                {#if size}
                  <span class="size">{size}</span>
                {/if}
                {#if download}
                  <a
                    class="download"
                    href={download}
                    target="_blank"
                    rel="noreferrer"
                    download>
                    <Icon name="download" />
                    Download
                  </a>
                {:else if soleLocationUrl}
                  <button
                    type="button"
                    class="download"
                    title="Copy the CLI fetch location"
                    on:click={() =>
                      copyLocation(artifact.cid, soleLocationUrl)}>
                    <Icon
                      name={copiedArtifact === artifact.cid
                        ? "checkmark"
                        : "copy"} />
                    {copiedArtifact === artifact.cid ? "Copied" : "Copy"}
                  </button>
                {:else if locationCount > 1}
                  <span
                    class="download disabled"
                    title="Served over the radicle-artifact protocol. Fetch it with the rad-artifact CLI.">
                    <Icon name="code" />
                    CLI only
                  </span>
                {:else}
                  <span
                    class="download disabled"
                    title="No download source is currently available for this artifact">
                    Unavailable
                  </span>
                {/if}
              </div>
            </div>

            <div class="cid">
              <Id id={artifact.cid}>{utils.truncateId(artifact.cid)}</Id>
            </div>

            <div class="provenance">
              <NodeId
                {baseUrl}
                nodeId={artifact.author.id}
                alias={artifact.author.alias} />
              {#if delegateIds.has(artifact.author.id)}
                <span class="delegate" title="Delegate">
                  <Icon name="badge" />
                </span>
              {/if}
              {#if artifact.attestations.length > 0}
                <span class="attested">
                  attested by
                  {#each delegatesFirst(artifact.attestations, n => n.id, delegateIds) as node, i (node.id)}
                    <span class="attestor">
                      <NodeId {baseUrl} nodeId={node.id} alias={node.alias} />
                      {#if delegateIds.has(node.id)}
                        <span class="delegate" title="Delegate">
                          <Icon name="badge" />
                        </span>
                      {/if}{#if i < artifact.attestations.length - 1},{/if}
                    </span>
                  {/each}
                </span>
              {/if}
            </div>

            {#if metadata.length > 0}
              <div class="metadata">
                {#each metadata as [key, value] (key)}
                  <span class="meta-item">
                    <span class="meta-key">{key}</span>
                    <span class="meta-value">
                      {typeof value === "string"
                        ? value
                        : JSON.stringify(value)}
                    </span>
                  </span>
                {/each}
              </div>
            {/if}

            {#if locationCount > 1}
              <hr class="divider" />
              <div class="field">
                <details class="locations-accordion" open={cliOnly}>
                  <summary>
                    <span class="field-label">
                      {locationCount} location{locationCount === 1 ? "" : "s"}
                    </span>
                    <span class="chevron"><Icon name="chevron-right" /></span>
                  </summary>
                  <div class="locations">
                    {#each locations as group (group.node.id)}
                      <div class="location-group">
                        <div class="location-node">
                          <NodeId
                            {baseUrl}
                            nodeId={group.node.id}
                            alias={group.node.alias} />
                          {#if delegateIds.has(group.node.id)}
                            <span class="delegate" title="Delegate">
                              <Icon name="badge" />
                            </span>
                          {/if}
                        </div>
                        {#each group.urls as url}
                          <span class="url"><Id id={url}>{url}</Id></span>
                        {/each}
                      </div>
                    {/each}
                  </div>
                </details>
              </div>
            {/if}

            {#if artifact.redactions.length > 0}
              <div class="field">
                {#each delegatesFirst(artifact.redactions, r => r.node.id, delegateIds) as redaction (redaction.node.id)}
                  <div class="redaction">
                    <Icon name="warning" />
                    {#if redaction.node.id !== artifact.author.id}
                      Redacted by
                      <NodeId
                        {baseUrl}
                        nodeId={redaction.node.id}
                        alias={redaction.node.alias} />
                      {#if delegateIds.has(redaction.node.id)}
                        <span class="delegate" title="Delegate">
                          <Icon name="badge" />
                        </span>
                      {/if}
                      {#if redaction.reason}
                        <span class="reason">· {redaction.reason}</span>
                      {/if}
                    {:else if redaction.reason}
                      <span class="reason">{redaction.reason}</span>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}

        {#if redactedCount > 0}
          <div class="redacted-toggle-wrap">
            <button
              type="button"
              class="ghost-btn"
              on:click={() => (showRedacted = !showRedacted)}>
              <Icon name="warning" />
              {showRedacted ? "Hide redacted" : "Show redacted"}
              <span class="counter">{redactedCount}</span>
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
</Layout>
