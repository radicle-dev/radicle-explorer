<script lang="ts">
  import type {
    Author,
    BaseUrl,
    Comment,
    Patch,
    Repo,
    Revision,
  } from "@http-client";

  import type { ComponentProps } from "svelte";

  import { onMount } from "svelte";
  import { HttpdClient } from "@http-client";

  import { cachedGetDiff } from "@app/views/repos/router";
  import Icon from "@app/components/Icon.svelte";
  import Id from "@app/components/Id.svelte";
  import NodeId from "@app/components/NodeId.svelte";
  import PatchComment from "@app/views/repos/Patch/PatchComment.svelte";
  import PatchRevisionRow from "@app/views/repos/Patch/PatchRevisionRow.svelte";
  import { formatTimeShort } from "@app/views/repos/Patch/timeline";

  export let baseUrl: BaseUrl;
  export let repo: Repo;
  export let patch: Patch;
  export let rawPath: (commit?: string) => string;

  // Per-revision list of commit ids that are new to that revision (not seen in
  // any earlier revision), mirroring the desktop "show only new commits"
  // behaviour. Computed by walking revisions oldest-first.
  let novelByRevision: Record<string, string[]> = {};
  async function computeNovelCommits(p: Patch, url: BaseUrl, rid: string) {
    const sorted = [...p.revisions].sort((a, b) => a.timestamp - b.timestamp);
    const seen: Record<string, true> = {};
    const result: Record<string, string[]> = {};
    for (const rev of sorted) {
      try {
        const diff = await cachedGetDiff(url, rid, rev.base, rev.oid);
        const novel: string[] = [];
        for (const commit of diff.commits) {
          if (!seen[commit.id]) novel.push(commit.id);
        }
        for (const commit of diff.commits) seen[commit.id] = true;
        result[rev.id] = novel;
      } catch {
        // Leave this revision undefined so it falls back to showing all.
      }
    }
    novelByRevision = result;
  }
  $: void computeNovelCommits(patch, baseUrl, repo.rid);

  interface CommentThread {
    root: Comment;
    replies: Comment[];
  }
  type RevisionEvent = {
    kind: "revision";
    timestamp: number;
    revision: Revision;
    isFirst: boolean;
    isLatest: boolean;
  };
  type MergeEvent = {
    kind: "merge";
    timestamp: number;
    author: Author;
    revision: string;
    commit: string;
  };
  type CommentEvent = {
    kind: "comment";
    timestamp: number;
    thread: CommentThread;
    revisionBase: string;
  };
  interface LifecycleEvent {
    kind: "lifecycle";
    timestamp: number;
    author: Author;
    status: string;
    previousStatus: string;
  }
  // A synthesized marker for the patch being opened. The first revision itself
  // still appears (and folds) in the stream, matching the desktop timeline.
  interface OpenedEvent {
    kind: "opened";
    timestamp: number;
    author: Author;
  }
  type ActivityEvent =
    RevisionEvent | MergeEvent | CommentEvent | LifecycleEvent | OpenedEvent;

  type Entry =
    | { type: "revision"; revision: Revision }
    | { type: "fold"; key: string; revisions: Revision[] }
    | {
        type: "merge";
        author: Author;
        revision: string;
        commit: string;
        timestamp: number;
      }
    | { type: "comment"; thread: CommentThread; revisionBase: string }
    | {
        type: "lifecycle";
        author: Author;
        status: string;
        previousStatus: string;
        timestamp: number;
      }
    | { type: "opened"; author: Author; timestamp: number };

  // Patch lifecycle transitions + whether the patch was opened as a draft,
  // fetched from the (optional) activity endpoint. Older nodes lack it, so this
  // stays empty and the timeline simply omits lifecycle rows.
  let lifecycleEvents: LifecycleEvent[] = [];
  let openedAsDraft = false;
  onMount(async () => {
    try {
      const api = new HttpdClient(baseUrl);
      const activity = await api.repo.getPatchActivity(repo.rid, patch.id);
      const ops = [...activity].sort((a, b) => a.timestamp - b.timestamp);
      // The patch was opened as a draft when its first lifecycle change is a
      // draft happening right at creation (first or second op), as opposed to
      // being converted to a draft later. That op is folded into the "opened a
      // draft patch" row rather than shown as a standalone transition.
      const firstLifecycleIdx = ops.findIndex(op =>
        op.actions.some(a => a.type === "lifecycle"),
      );
      let openingDraftOpId: string | undefined;
      if (firstLifecycleIdx !== -1 && firstLifecycleIdx <= 1) {
        const op = ops[firstLifecycleIdx];
        const lifecycle = op.actions.find(a => a.type === "lifecycle");
        if (lifecycle?.state?.status === "draft") {
          openingDraftOpId = op.id;
        }
      }
      openedAsDraft = openingDraftOpId !== undefined;

      let previousStatus = "open";
      const events: LifecycleEvent[] = [];
      for (const op of ops) {
        for (const action of op.actions) {
          if (action.type !== "lifecycle" || !action.state) continue;
          const status = action.state.status;
          if (op.id === openingDraftOpId) {
            previousStatus = status;
            continue;
          }
          events.push({
            kind: "lifecycle",
            timestamp: op.timestamp,
            author: op.author,
            status,
            previousStatus,
          });
          previousStatus = status;
        }
      }
      lifecycleEvents = events;
    } catch {
      // Activity endpoint unavailable (older node); leave lifecycle rows out.
    }
  });

  interface RenderItem {
    entry: Entry;
    hideAuthor: boolean;
    runHeaderAuthor: Author | undefined;
  }

  $: sortedRevisions = [...patch.revisions].sort(
    (a, b) => a.timestamp - b.timestamp,
  );
  $: firstRevisionId = sortedRevisions[0]?.id;
  $: latestRevisionId = patch.revisions[patch.revisions.length - 1].id;
  $: defaultBranch =
    repo.payloads["xyz.radicle.project"].data.defaultBranch ?? "main";

  let expandedRevisions: Record<string, boolean> = {};
  let expandedFolds: Record<string, boolean> = {};
  function isRevisionExpanded(id: string): boolean {
    return id in expandedRevisions
      ? expandedRevisions[id]
      : id === latestRevisionId;
  }
  function toggleRevision(id: string) {
    expandedRevisions = { ...expandedRevisions, [id]: !isRevisionExpanded(id) };
  }
  function toggleFold(key: string) {
    expandedFolds = { ...expandedFolds, [key]: !expandedFolds[key] };
  }

  function threadsFrom(comments: Comment[]): CommentThread[] {
    return comments
      .filter(comment => !comment.replyTo)
      .map(root => ({
        root,
        replies: comments
          .filter(c => c.replyTo === root.id)
          .sort((a, b) => a.timestamp - b.timestamp),
      }));
  }

  function buildEvents(
    patch: Patch,
    lifecycle: LifecycleEvent[],
  ): ActivityEvent[] {
    const events: ActivityEvent[] = [...lifecycle];
    const first = [...patch.revisions].sort(
      (a, b) => a.timestamp - b.timestamp,
    )[0];
    if (first) {
      events.push({
        kind: "opened",
        timestamp: first.timestamp,
        author: first.author,
      });
    }
    patch.revisions.forEach((revision, index) => {
      events.push({
        kind: "revision",
        timestamp: revision.timestamp,
        revision,
        isFirst: index === 0,
        isLatest: index === patch.revisions.length - 1,
      });
      for (const thread of threadsFrom(revision.discussions)) {
        events.push({
          kind: "comment",
          timestamp: thread.root.timestamp,
          thread,
          revisionBase: revision.base,
        });
      }
    });
    for (const merge of patch.merges) {
      events.push({
        kind: "merge",
        timestamp: merge.timestamp,
        author: merge.author,
        revision: merge.revision,
        commit: merge.commit,
      });
    }
    return events.sort((a, b) => a.timestamp - b.timestamp);
  }

  function buildEntries(events: ActivityEvent[]): Entry[] {
    const entries: Entry[] = [];
    let run: Revision[] = [];
    const flush = () => {
      if (run.length === 0) return;
      if (run.length === 1) {
        entries.push({ type: "revision", revision: run[0] });
      } else {
        entries.push({ type: "fold", key: run[0].id, revisions: [...run] });
      }
      run = [];
    };
    for (const event of events) {
      // Every revision (including the first and latest) folds into runs; the
      // "opened" marker is a separate synthesized event.
      if (event.kind === "revision") {
        run.push(event.revision);
        continue;
      }
      flush();
      if (event.kind === "opened") {
        entries.push({
          type: "opened",
          author: event.author,
          timestamp: event.timestamp,
        });
      } else if (event.kind === "merge") {
        entries.push({
          type: "merge",
          author: event.author,
          revision: event.revision,
          commit: event.commit,
          timestamp: event.timestamp,
        });
      } else if (event.kind === "lifecycle") {
        entries.push({
          type: "lifecycle",
          author: event.author,
          status: event.status,
          previousStatus: event.previousStatus,
          timestamp: event.timestamp,
        });
      } else {
        entries.push({
          type: "comment",
          thread: event.thread,
          revisionBase: event.revisionBase,
        });
      }
    }
    flush();
    return entries;
  }

  // Author of a "groupable" entry (revision/fold/merge). Reviews and comments
  // are standalone and never grouped.
  function entryAuthor(entry: Entry): Author | undefined {
    if (entry.type === "revision") return entry.revision.author;
    if (entry.type === "fold") return entry.revisions[0]?.author;
    if (entry.type === "merge") return entry.author;
    if (entry.type === "lifecycle") return entry.author;
    if (entry.type === "opened") return entry.author;
    return undefined;
  }

  // Group runs of consecutive same-author groupable entries under a single
  // author header; the rows below then hide their per-row author.
  function buildRenderItems(entries: Entry[]): RenderItem[] {
    const items: RenderItem[] = entries.map(entry => ({
      entry,
      hideAuthor: false,
      runHeaderAuthor: undefined,
    }));
    let i = 0;
    while (i < items.length) {
      const author = entryAuthor(items[i].entry);
      if (!author) {
        i += 1;
        continue;
      }
      let j = i;
      while (j + 1 < items.length) {
        const next = entryAuthor(items[j + 1].entry);
        if (next && next.id === author.id) {
          j += 1;
        } else {
          break;
        }
      }
      if (j > i) {
        items[i].runHeaderAuthor = author;
        for (let k = i; k <= j; k += 1) items[k].hideAuthor = true;
      }
      i = j + 1;
    }
    return items;
  }

  $: renderItems = buildRenderItems(
    buildEntries(buildEvents(patch, lifecycleEvents)),
  );

  function lifecycleIcon(status: string): ComponentProps<Icon>["name"] {
    if (status === "archived") return "patch-archived";
    if (status === "draft") return "patch-draft";
    return "patch";
  }
  function lifecycleColor(status: string): string {
    if (status === "archived") return "var(--color-text-archived)";
    if (status === "draft") return "var(--color-text-tertiary)";
    return "var(--color-text-open)";
  }
  function lifecycleLabel(status: string, previousStatus: string): string {
    if (status === "archived") return "archived patch";
    if (status === "draft") return "converted patch to draft";
    if (previousStatus === "draft") return "marked patch ready to review";
    return "reopened patch";
  }
</script>

<style>
  .activity-stream {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }
  /* Vertical timeline rail behind the row icons. */
  .activity-stream::before {
    content: "";
    position: absolute;
    top: 1.25rem;
    bottom: 1.25rem;
    left: 1rem;
    width: 1px;
    background-color: var(--color-border-subtle);
    pointer-events: none;
  }

  .run-header {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.5rem;
    min-height: 2.5rem;
  }
  .run-header :global(img) {
    background-color: var(--color-surface-canvas);
  }

  .timeline-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    padding: 0.375rem 0.5rem;
    border-radius: var(--border-radius-sm);
    min-height: 2.5rem;
    font: var(--txt-body-m-regular);
  }
  button.timeline-item {
    width: 100%;
    border: 0;
    background: none;
    text-align: left;
    cursor: pointer;
    color: var(--color-text-primary);
  }
  button.timeline-item:hover,
  button.timeline-item:focus-visible {
    background-color: var(--color-surface-subtle);
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
  button.timeline-item:hover .icon,
  button.timeline-item:focus-visible .icon {
    background-color: var(--color-surface-subtle);
  }
  .merge-badge .icon {
    background-color: transparent;
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
  .meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }
  .timestamp {
    color: var(--color-text-quaternary);
  }
  .merge-badge {
    background-color: var(--color-surface-merged);
    color: var(--color-text-merged);
  }
  .merge-badge :global(*) {
    color: inherit;
  }

  .comment-thread {
    padding: 0.125rem 0;
  }
  .replies {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0.5rem 0 0 1.5rem;
  }

  .merge-card {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 1fr 1px 1fr;
    align-items: stretch;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--border-radius-md);
    background-color: var(--color-surface-canvas);
    margin-top: 0.75rem;
    overflow: hidden;
  }
  .merge-card::before {
    content: "";
    grid-column: 2;
    background-color: var(--color-border-subtle);
  }
  .merge-card-left,
  .merge-card-right {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.25rem;
    min-width: 0;
  }
  .merge-card-left {
    grid-column: 1;
  }
  .merge-card-right {
    grid-column: 3;
    gap: 0.375rem;
  }
  .merge-card-header {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .merge-card-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: var(--border-radius-sm);
    color: var(--color-text-on-brand);
    background-color: var(--color-surface-brand-secondary);
    flex-shrink: 0;
  }
  .merge-card-title {
    color: var(--color-text-primary);
    font: var(--txt-body-m-medium);
  }
  .merge-card-body {
    color: var(--color-text-secondary);
    font: var(--txt-body-m-regular);
  }
  .merge-card-cli-label {
    color: var(--color-text-tertiary);
    font: var(--txt-body-m-regular);
  }
  .merge-card-cli-code {
    margin: 0;
    padding: 0.75rem 0.875rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--border-radius-sm);
    background-color: var(--color-surface-subtle);
    color: var(--color-text-primary);
    font: var(--txt-code-small);
    white-space: pre-wrap;
    overflow-x: auto;
  }
  @media (max-width: 719.98px) {
    .merge-card {
      grid-template-columns: 1fr;
    }
    .merge-card::before {
      display: none;
    }
    .merge-card-left,
    .merge-card-right {
      grid-column: 1;
    }
  }
</style>

<div class="activity-stream">
  {#each renderItems as item}
    {#if item.runHeaderAuthor}
      <div class="run-header">
        <NodeId
          {baseUrl}
          nodeId={item.runHeaderAuthor.id}
          alias={item.runHeaderAuthor.alias} />
      </div>
    {/if}

    {#if item.entry.type === "fold"}
      {@const fold = item.entry}
      {@const open = expandedFolds[fold.key]}
      <button
        type="button"
        class="timeline-item"
        on:click={() => toggleFold(fold.key)}>
        <span class="icon">
          <Icon name={open ? "collapse-vertical" : "revision"} />
        </span>
        <div class="wrapper">
          <span class="summary-secondary">
            {open ? "collapse" : "created"}
            {fold.revisions.length} revisions
          </span>
        </div>
      </button>
      {#if open}
        {#each fold.revisions as revision (revision.id)}
          <PatchRevisionRow
            {baseUrl}
            {repo}
            {patch}
            {rawPath}
            {revision}
            isFirst={revision.id === firstRevisionId}
            isLatest={revision.id === latestRevisionId}
            hideAuthor={item.hideAuthor}
            novelCommitIds={novelByRevision[revision.id]}
            expanded={isRevisionExpanded(revision.id)}
            onToggle={() => toggleRevision(revision.id)} />
        {/each}
      {/if}
    {:else if item.entry.type === "opened"}
      {@const opened = item.entry}
      <div class="timeline-item">
        <span
          class="icon"
          style:color={lifecycleColor(openedAsDraft ? "draft" : "open")}>
          <Icon name={openedAsDraft ? "patch-draft" : "patch"} />
        </span>
        <div class="wrapper">
          {#if !item.hideAuthor}
            <NodeId
              {baseUrl}
              nodeId={opened.author.id}
              alias={opened.author.alias} />
          {/if}
          <div class="summary-line">
            <span class="summary-secondary">
              {openedAsDraft ? "opened a draft patch" : "opened patch"}
            </span>
          </div>
          <div class="meta">
            <span
              class="timestamp"
              title={new Date(opened.timestamp * 1000).toString()}>
              {formatTimeShort(opened.timestamp)}
            </span>
          </div>
        </div>
      </div>
    {:else if item.entry.type === "revision"}
      {@const rev = item.entry.revision}
      <PatchRevisionRow
        {baseUrl}
        {repo}
        {patch}
        {rawPath}
        revision={rev}
        isFirst={rev.id === firstRevisionId}
        isLatest={rev.id === latestRevisionId}
        hideAuthor={item.hideAuthor}
        novelCommitIds={novelByRevision[rev.id]}
        expanded={isRevisionExpanded(rev.id)}
        onToggle={() => toggleRevision(rev.id)} />
    {:else if item.entry.type === "merge"}
      {@const merge = item.entry}
      <div class="timeline-item merge-badge">
        <span class="icon"><Icon name="patch-merged" /></span>
        <div class="wrapper">
          {#if !item.hideAuthor}
            <NodeId
              {baseUrl}
              nodeId={merge.author.id}
              alias={merge.author.alias} />
          {/if}
          <div class="summary-line">
            <span class="summary-secondary">merged</span>
            <Id id={merge.revision} />
            <span class="summary-secondary">at</span>
            <Id id={merge.commit} />
          </div>
          <div class="meta">
            <span
              class="timestamp"
              title={new Date(merge.timestamp * 1000).toString()}>
              {formatTimeShort(merge.timestamp)}
            </span>
          </div>
        </div>
      </div>
    {:else if item.entry.type === "lifecycle"}
      {@const lc = item.entry}
      <div class="timeline-item">
        <span class="icon" style:color={lifecycleColor(lc.status)}>
          <Icon name={lifecycleIcon(lc.status)} />
        </span>
        <div class="wrapper">
          {#if !item.hideAuthor}
            <NodeId {baseUrl} nodeId={lc.author.id} alias={lc.author.alias} />
          {/if}
          <div class="summary-line">
            <span class="summary-secondary">
              {lifecycleLabel(lc.status, lc.previousStatus)}
            </span>
          </div>
          <div class="meta">
            <span
              class="timestamp"
              title={new Date(lc.timestamp * 1000).toString()}>
              {formatTimeShort(lc.timestamp)}
            </span>
          </div>
        </div>
      </div>
    {:else if item.entry.type === "comment"}
      {@const commentEntry = item.entry}
      <div class="comment-thread">
        <PatchComment
          {baseUrl}
          comment={commentEntry.thread.root}
          rawPath={rawPath(commentEntry.revisionBase)} />
        {#if commentEntry.thread.replies.length > 0}
          <div class="replies">
            {#each commentEntry.thread.replies as reply (reply.id)}
              <PatchComment
                {baseUrl}
                comment={reply}
                rawPath={rawPath(commentEntry.revisionBase)}
                caption="replied" />
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/each}

  {#if patch.state.status === "open"}
    <div class="merge-card">
      <div class="merge-card-left">
        <div class="merge-card-header">
          <div class="merge-card-icon"><Icon name="patch-merged" /></div>
          <div>
            <div class="merge-card-title">Ready to merge</div>
            <div class="merge-card-body">
              Merge the latest revision into <b>{defaultBranch}</b>
              .
            </div>
          </div>
        </div>
      </div>
      <div class="merge-card-right">
        <div class="merge-card-cli-label">Merge from the command line:</div>
        <pre class="merge-card-cli-code">$ rad patch checkout {patch.id.slice(
            0,
            7,
          )}
$ git checkout {defaultBranch}
$ git merge --no-ff patch/{patch.id.slice(0, 7)}
$ git push rad {defaultBranch}</pre>
      </div>
    </div>
  {/if}
</div>
