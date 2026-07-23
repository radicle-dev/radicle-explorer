<script lang="ts">
  import type {
    BaseUrl,
    CommitHeader,
    Patch,
    Repo,
    Revision,
  } from "@http-client";
  import type { ComponentProps } from "svelte";

  import { cachedGetDiff } from "@app/views/repos/router";
  import { formatTimeShort } from "@app/views/repos/Patch/timeline";

  import FileDiff from "@app/views/repos/Changeset/FileDiff.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Id from "@app/components/Id.svelte";
  import Link from "@app/components/Link.svelte";
  import Markdown from "@app/components/Markdown.svelte";
  import NodeId from "@app/components/NodeId.svelte";
  import PatchCommit from "@app/views/repos/Patch/PatchCommit.svelte";
  import PatchReactions from "@app/views/repos/Patch/PatchReactions.svelte";
  import PatchReview from "@app/views/repos/Patch/PatchReview.svelte";

  export let baseUrl: BaseUrl;
  export let repo: Repo;
  export let patch: Patch;
  export let revision: Revision;
  export let isFirst: boolean;
  export let isLatest: boolean;
  export let expanded: boolean;
  export let onToggle: () => void;
  export let rawPath: (commit?: string) => string;
  export let hideAuthor: boolean = false;
  // Commit ids that are new to this revision (not present in earlier
  // revisions). When provided, only these commits are listed. Undefined while
  // the cross-revision dedup is still computing, in which case all are shown.
  export let novelCommitIds: string[] | undefined = undefined;

  const pluralize = (word: string, count: number): string =>
    count === 1 ? word : `${word}s`;

  function filterNovel(
    commits: CommitHeader[],
    ids: string[] | undefined,
  ): CommitHeader[] {
    if (!ids) return commits;
    return commits.filter(commit => ids.includes(commit.id));
  }

  const COMMIT_THRESHOLD = 5;
  const COMMITS_VISIBLE = 3;
  let expandedCommitGroups: Record<string, boolean> = {};
  function expandCommitGroup(key: string) {
    expandedCommitGroups = { ...expandedCommitGroups, [key]: true };
  }

  // Group consecutive commits by the same author, like the desktop timeline.
  function groupCommitsByAuthor(commits: CommitHeader[]): CommitHeader[][] {
    const groups: CommitHeader[][] = [];
    for (const commit of commits) {
      const last = groups[groups.length - 1];
      if (
        last &&
        last[0].author.name === commit.author.name &&
        last[0].author.email === commit.author.email
      ) {
        last.push(commit);
      } else {
        groups.push([commit]);
      }
    }
    return groups;
  }

  $: subject = (() => {
    const line = revision.description.split("\n")[0]?.trim();
    return line ? line : undefined;
  })();
  // The first revision's body is the patch cover letter, already shown in the
  // description panel above, so it is not repeated in the revision card.
  $: body = (() => {
    if (isFirst) return undefined;
    const rest = revision.description.split("\n").slice(1).join("\n").trim();
    return rest ? rest : undefined;
  })();
  const verb = "created revision";
  const leadIcon: ComponentProps<Icon>["name"] = "revision";

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    }
  }
</script>

<style>
  .timeline-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    padding: 0.375rem 0.5rem;
    border-radius: var(--border-radius-sm);
    min-height: 2.5rem;
    font: var(--txt-body-m-regular);
    cursor: pointer;
    color: var(--color-text-primary);
  }
  .timeline-item:hover,
  .timeline-item:focus-visible {
    background-color: var(--color-surface-subtle);
  }
  .revision-card > .timeline-item.card-header {
    border-radius: 0;
    border-bottom: 1px solid var(--color-border-subtle);
  }
  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    flex-shrink: 0;
    background-color: var(--color-surface-canvas);
    position: relative;
    z-index: 1;
  }
  .timeline-item:hover .icon,
  .timeline-item:focus-visible .icon {
    background-color: var(--color-surface-subtle);
  }
  .icon-stack {
    display: grid;
    width: 1rem;
    place-items: center;
  }
  .icon-default,
  .icon-hover {
    grid-area: 1 / 1;
    transition:
      opacity 150ms ease,
      transform 150ms ease;
  }
  .icon-hover {
    opacity: 0;
    transform: rotate(-90deg);
  }
  .timeline-item:hover .icon-default,
  .timeline-item:focus-visible .icon-default {
    opacity: 0;
    transform: rotate(90deg);
  }
  .timeline-item:hover .icon-hover,
  .timeline-item:focus-visible .icon-hover {
    opacity: 1;
    transform: rotate(0);
  }
  .wrapper {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
    flex: 1 1 0;
  }
  .summary-line {
    display: flex;
    align-items: center;
    flex: 1 1 0;
    min-width: 0;
    gap: 0.375rem;
  }
  .summary-secondary {
    color: var(--color-text-tertiary);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .summary-content {
    color: var(--color-text-primary);
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font: var(--txt-body-m-medium);
  }
  .latest-chip {
    flex-shrink: 0;
    padding: 0 0.375rem;
    border-radius: var(--border-radius-sm);
    background-color: var(--color-surface-brand-secondary);
    color: var(--color-text-on-brand);
    font: var(--txt-body-s-medium);
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }
  .meta-hash {
    color: var(--color-text-quaternary);
  }
  .meta-hash :global(.txt-id) {
    color: inherit;
  }
  .timestamp {
    color: var(--color-text-quaternary);
  }

  .revision-card {
    position: relative;
    z-index: 1;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--border-radius-md);
    background-color: var(--color-surface-canvas);
    overflow: hidden;
    margin: 0.25rem 0;
  }
  .revision-reviews {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    margin-left: 1.5rem;
  }
  .card-body {
    display: flex;
    flex-direction: column;
  }
  .card-body-description {
    padding: 1rem;
    font: var(--txt-body-m-regular);
    word-break: break-word;
  }
  .card-reactions {
    padding: 0 1rem 1rem 1rem;
  }
  .card-divider {
    height: 1px;
    background-color: var(--color-border-subtle);
  }
  .commits {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    background-color: var(--color-surface-base);
  }
  .commit-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .commit-group-author {
    padding-left: 0.5rem;
    color: var(--color-text-tertiary);
    font: var(--txt-body-m-regular);
  }
  .show-more-commits {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    align-self: flex-start;
    padding: 0.25rem 0.5rem;
    border: 0;
    border-radius: var(--border-radius-sm);
    background: none;
    color: var(--color-text-tertiary);
    font: var(--txt-body-m-regular);
    cursor: pointer;
  }
  .show-more-commits:hover,
  .show-more-commits:focus-visible {
    background-color: var(--color-surface-subtle);
    color: var(--color-text-primary);
  }
  .diff-tease {
    padding: 1rem;
    background-color: var(--color-surface-base);
  }
  .diff-stats {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem;
    margin-bottom: 0.5rem;
    color: var(--color-text-secondary);
    font: var(--txt-body-m-regular);
  }
  .diff-stats .insertions {
    color: var(--color-feedback-success-text);
  }
  .diff-stats .deletions {
    color: var(--color-feedback-error-text);
  }
  .diff-loading {
    padding: 1rem;
    color: var(--color-text-tertiary);
    font: var(--txt-body-m-regular);
    background-color: var(--color-surface-base);
  }
  .file-fan {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }
  .file-fan::after {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 6rem;
    background: linear-gradient(
      to left,
      var(--color-surface-base),
      transparent
    );
    pointer-events: none;
    z-index: 6;
  }
  .file-fan-stack {
    --fan-overlap: 20%;
    display: flex;
    align-items: flex-start;
    overflow: hidden;
    height: 10rem;
    padding: 0.5rem 0 0;
  }
  .file-fan-card {
    position: relative;
    flex: 0 0
      calc(
        (100% + (var(--card-count, 5) - 1) * var(--fan-overlap, 20%)) /
          var(--card-count, 5)
      );
    max-width: calc(
      (100% + (var(--card-count, 5) - 1) * var(--fan-overlap, 20%)) /
        var(--card-count, 5)
    );
    height: 100%;
    margin-left: calc(var(--fan-overlap, 20%) * -1);
    background-color: var(--color-surface-canvas);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
    overflow: hidden;
  }
  .file-fan-card.first {
    margin-left: 0;
  }
  .file-fan-card-inner {
    height: 100%;
    overflow: hidden;
  }
  .file-fan-footer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    padding: 0 0 2rem;
    height: 7rem;
    z-index: 10;
    pointer-events: none;
  }
  .file-fan-fade {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      var(--color-surface-base) 100%
    );
    pointer-events: none;
  }
  .diff-tease-button {
    pointer-events: auto;
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--border-radius-sm);
    background-color: var(--color-surface-canvas);
    color: var(--color-text-primary);
    cursor: pointer;
    box-shadow: var(--elevation-low);
    font: var(--txt-body-m-medium);
    text-decoration: none;
  }
  .diff-tease-button:hover,
  .diff-tease-button:focus-visible {
    background-color: var(--color-surface-subtle);
  }
</style>

<div class:revision-card={expanded}>
  <div
    class="timeline-item"
    class:card-header={expanded}
    role="button"
    tabindex="0"
    on:click={onToggle}
    on:keydown={handleKeydown}>
    <div class="icon">
      <span class="icon-stack">
        <span class="icon-default">
          <Icon name={leadIcon} />
        </span>
        <span class="icon-hover">
          <Icon name={expanded ? "collapse-vertical" : "expand-vertical"} />
        </span>
      </span>
    </div>
    <div class="wrapper">
      {#if !hideAuthor}
        <NodeId
          {baseUrl}
          nodeId={revision.author.id}
          alias={revision.author.alias} />
      {/if}
      <div class="summary-line">
        <span class="summary-secondary">{verb}</span>
        {#if subject}<span class="summary-content">{subject}</span>{/if}
        {#if isLatest && patch.revisions.length > 1}
          <span class="latest-chip">latest</span>
        {/if}
      </div>
      <div class="meta">
        {#if !isFirst}
          <span class="meta-hash"><Id id={revision.id} /></span>
        {/if}
        <span
          class="timestamp"
          title={new Date(revision.timestamp * 1000).toString()}>
          {formatTimeShort(revision.timestamp)}
        </span>
      </div>
    </div>
  </div>
  {#if expanded}
    <div class="card-body">
      {#if body}
        <div class="card-body-description">
          <Markdown breaks content={body} rawPath={rawPath(revision.base)} />
        </div>
      {/if}
      {#if revision.reactions.length > 0}
        <div class="card-reactions">
          <PatchReactions reactions={revision.reactions} />
        </div>
      {/if}
      {#if body || revision.reactions.length > 0}
        <div class="card-divider"></div>
      {/if}
      {#await cachedGetDiff(baseUrl, repo.rid, revision.base, revision.oid)}
        <div class="diff-loading">Loading changes…</div>
      {:then response}
        {@const commitList = filterNovel(response.commits, novelCommitIds)}
        {#if commitList.length > 0}
          <div class="commits">
            {#each groupCommitsByAuthor(commitList.toReversed()) as group (group[0].id)}
              {#if group.length > 1}
                {@const groupExpanded = expandedCommitGroups[group[0].id]}
                {@const collapsed =
                  !groupExpanded && group.length > COMMIT_THRESHOLD}
                {@const shown = collapsed
                  ? group.slice(0, COMMITS_VISIBLE)
                  : group}
                <div class="commit-group">
                  <div class="commit-group-author">
                    {group[0].author.name} &lt;{group[0].author.email}&gt; added
                    {group.length} commits
                  </div>
                  {#each shown as commit (commit.id)}
                    <PatchCommit {commit} hideAuthor />
                  {/each}
                  {#if collapsed}
                    <button
                      type="button"
                      class="show-more-commits"
                      on:click={() => expandCommitGroup(group[0].id)}>
                      <Icon name="commit" />
                      Show {group.length - COMMITS_VISIBLE} more commits
                    </button>
                  {/if}
                </div>
              {:else}
                <PatchCommit commit={group[0]} />
              {/if}
            {/each}
          </div>
        {/if}
        {#if revision.base !== revision.oid}
          {@const files = response.diff.files
            .filter(f => "diff" in f)
            .slice(0, 5)}
          <div class="card-divider"></div>
          <div class="diff-tease">
            <div class="diff-stats">
              <Icon name="diff" />
              <span>
                {response.diff.stats.filesChanged}
                {pluralize("file", response.diff.stats.filesChanged)} modified with
              </span>
              <span class="insertions">
                {response.diff.stats.insertions}
                {pluralize("insertion", response.diff.stats.insertions)}
              </span>
              <span>and</span>
              <span class="deletions">
                {response.diff.stats.deletions}
                {pluralize("deletion", response.diff.stats.deletions)}
              </span>
            </div>
            <div class="file-fan">
              <div class="file-fan-stack" style:--card-count={files.length}>
                {#each files as file, i (i)}
                  {#if "diff" in file}
                    {@const path = "path" in file ? file.path : file.newPath}
                    <div class="file-fan-card" class:first={i === 0}>
                      <div class="file-fan-card-inner">
                        <FileDiff
                          repoId={repo.rid}
                          {baseUrl}
                          revision={revision.oid}
                          expanded
                          filePath={path}
                          oldFilePath={"oldPath" in file
                            ? file.oldPath
                            : undefined}
                          fileDiff={file.diff}
                          headerBadgeCaption={file.status}
                          visible />
                      </div>
                    </div>
                  {/if}
                {/each}
              </div>
              <div class="file-fan-footer">
                <div class="file-fan-fade"></div>
                <Link
                  route={{
                    resource: "repo.patch",
                    repo: repo.rid,
                    node: baseUrl,
                    patch: patch.id,
                    view: { name: "changes", revision: revision.id },
                  }}>
                  <span class="diff-tease-button">
                    View all revision changes
                    <Icon name="arrow-right" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        {/if}
      {:catch error}
        <div class="diff-loading">
          Failed to load changes: {error?.message ?? error}
        </div>
      {/await}
    </div>
  {/if}
</div>
{#if revision.reviews.length > 0}
  <div class="revision-reviews">
    {#each revision.reviews as review (review.id)}
      <PatchReview
        {baseUrl}
        {review}
        revisionId={revision.id}
        rawPath={rawPath(revision.base)} />
    {/each}
  </div>
{/if}
