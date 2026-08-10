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
  export let allAuthors: boolean;
  export let nodeId: string;
  export let nodeAvatarUrl: string | undefined;

  const SIZE_KEY = "sizeBytes";

  $: title = release.title || release.tagName || release.id;

  // An artifact redacted by its own author or a delegate is hidden by default.
  let showRedacted = false;

  $: delegateIds = new Set(repo.delegates.map(d => d.id));

  // Whether the artifact was redacted by a trusted party (its author or a
  // delegate), mirroring the backend's default-hidden rule.
  function redactedByTrusted(artifact: Artifact, delegates: Set<string>) {
    return artifact.redactions.some(
      r => r.user.id === artifact.author.id || delegates.has(r.user.id),
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
  // Artifacts are scoped to delegate authors by default; the endpoint returns
  // all of them, so filtering happens client-side.
  $: authorArtifacts = allAuthors ? release.artifacts : delegateArtifacts;
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
      { user: Artifact["locations"][number]["user"]; urls: string[] }
    > = {};
    for (const { user, url } of artifact.locations) {
      if (!groups[user.id]) {
        groups[user.id] = { user, urls: [] };
        order.push(user.id);
      }
      groups[user.id].urls.push(url);
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

  // Whether the browser can fetch the location itself, as opposed to it being
  // served over the radicle-artifact protocol.
  function isWebUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
  }

  // The web location used as the browser download link, preferring one
  // contributed by a delegate.
  function webDownloadUrl(
    artifact: Artifact,
    delegates: Set<string>,
  ): string | undefined {
    const web = artifact.locations.filter(l => isWebUrl(l.url));
    return (web.find(l => delegates.has(l.user.id)) ?? web[0])?.url;
  }

  // Brief copy feedback, keyed by the artifact's CID.
  let copiedArtifact: string | undefined;
  let failedArtifact: string | undefined;

  // Copy the CLI command that downloads a CLI-only artifact. The clipboard
  // is unavailable over plain http and when the user denies permission, so
  // report a failure rather than leaving the button silent.
  async function copyDownloadCommand(cid: string): Promise<void> {
    try {
      await utils.toClipboard(
        `rad-artifact --repository ${repo.rid} download --cid ${cid}`,
      );
      copiedArtifact = cid;
    } catch {
      failedArtifact = cid;
    }
    setTimeout(() => {
      if (copiedArtifact === cid) {
        copiedArtifact = undefined;
      }
      if (failedArtifact === cid) {
        failedArtifact = undefined;
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
  .redacted-toggle-wrap {
    display: flex;
    justify-content: center;
    padding: 1rem;
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
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font: var(--txt-body-m-regular);
  }
  .divider {
    width: 100%;
    height: 0;
    margin: 0.5rem 0;
    border: none;
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
  .location-url {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }
  .open-url {
    display: inline-flex;
    flex-shrink: 0;
    color: var(--color-text-tertiary);
  }
  .open-url:hover {
    color: var(--color-text-primary);
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
          <div class="segmented">
            <Link
              route={{
                resource: "repo.release",
                repo: repo.rid,
                node: baseUrl,
                release: release.id,
                allAuthors: true,
              }}>
              <Button let:hover variant={allAuthors ? "gray" : "background"}>
                <Icon name="avatar-incognito" />
                <div class="title-counter">
                  All
                  <span
                    class="counter"
                    class:selected={allAuthors}
                    class:hover={hover && !allAuthors}>
                    {allCount}
                  </span>
                </div>
              </Button>
            </Link>
            <Link
              route={{
                resource: "repo.release",
                repo: repo.rid,
                node: baseUrl,
                release: release.id,
              }}>
              <Button let:hover variant={!allAuthors ? "gray" : "background"}>
                <Icon name="badge" />
                <div class="title-counter">
                  Delegates
                  <span
                    class="counter"
                    class:selected={!allAuthors}
                    class:hover={hover && allAuthors}>
                    {delegateCount}
                  </span>
                </div>
              </Button>
            </Link>
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
            g => g.user.id,
            delegateIds,
          )}
          {@const metadata = otherMetadata(artifact)}
          {@const webDownload = webDownloadUrl(artifact, delegateIds)}
          {@const locationCount = artifact.locations.length}
          {@const cliOnly = !webDownload && locationCount > 0}
          {@const redactedBy = artifact.redactions
            .map(r => r.user.alias ?? utils.truncateId(r.user.id))
            .join(", ")}
          <!-- Only reasons are listed; the badge already names every redactor. -->
          {@const redactions = delegatesFirst(
            artifact.redactions.filter(r => r.reason),
            r => r.user.id,
            delegateIds,
          )}
          <div class="artifact">
            <div class="artifact-name">
              <span>{artifact.name}</span>
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
                {#if webDownload}
                  <a
                    href={webDownload}
                    target="_blank"
                    rel="noreferrer"
                    download>
                    <Button variant="gray">
                      <Icon name="download" />
                      Download
                    </Button>
                  </a>
                {:else if cliOnly}
                  <Button
                    variant="gray"
                    title="Served over the radicle-artifact protocol. Copy the rad-artifact download command."
                    on:click={() => copyDownloadCommand(artifact.cid)}>
                    {#if copiedArtifact === artifact.cid}
                      <Icon name="checkmark" />
                      Copied
                    {:else if failedArtifact === artifact.cid}
                      <Icon name="warning" />
                      Copy failed
                    {:else}
                      <Icon name="copy" />
                      Copy CLI command
                    {/if}
                  </Button>
                {:else}
                  <Button
                    variant="gray"
                    disabled
                    title="No download source is currently available for this artifact">
                    Unavailable
                  </Button>
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

            {#if locationCount > 0}
              <hr class="divider" />
              <details class="locations-accordion" open={cliOnly}>
                <summary>
                  <span class="field-label">
                    {locationCount} location{locationCount === 1 ? "" : "s"}
                  </span>
                  <span class="chevron"><Icon name="chevron-right" /></span>
                </summary>
                <div class="locations">
                  {#each locations as group (group.user.id)}
                    <div class="location-group">
                      <div class="location-node">
                        <NodeId
                          {baseUrl}
                          nodeId={group.user.id}
                          alias={group.user.alias} />
                        {#if delegateIds.has(group.user.id)}
                          <span class="delegate" title="Delegate">
                            <Icon name="badge" />
                          </span>
                        {/if}
                      </div>
                      {#each group.urls as url}
                        <div class="location-url">
                          <Id id={url} truncate>{url}</Id>
                          {#if isWebUrl(url)}
                            <a
                              class="open-url"
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              title="Open in a new tab">
                              <Icon name="open-external" />
                            </a>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {/each}
                </div>
              </details>
            {/if}

            {#if redactions.length > 0}
              <div class="field">
                {#each redactions as redaction (redaction.user.id)}
                  <div class="redaction">
                    <Icon name="warning" />
                    {#if redaction.user.id !== artifact.author.id}
                      Redacted by
                      <NodeId
                        {baseUrl}
                        nodeId={redaction.user.id}
                        alias={redaction.user.alias} />
                      {#if delegateIds.has(redaction.user.id)}
                        <span class="delegate" title="Delegate">
                          <Icon name="badge" />
                        </span>
                      {/if}
                      <span class="reason">· {redaction.reason}</span>
                    {:else}
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
            <Button
              variant="background"
              on:click={() => (showRedacted = !showRedacted)}>
              <Icon name="warning" />
              {showRedacted ? "Hide redacted" : "Show redacted"}
              <span class="counter">{redactedCount}</span>
            </Button>
          </div>
        {/if}
      </div>
    </div>
  </div>
</Layout>
