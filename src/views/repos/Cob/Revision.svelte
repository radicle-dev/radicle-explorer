<script lang="ts">
  import type {
    Author,
    BaseUrl,
    Comment,
    DiffResponse,
    PatchState,
    Revision,
    Verdict,
  } from "@http-client";
  import type { Timeline } from "@app/views/repos/Patch.svelte";

  import * as utils from "@app/lib/utils";
  import { HttpdClient } from "@http-client";
  import { cachedGetDiff } from "@app/views/repos/router";
  import { onMount } from "svelte";

  import CobCommitTeaser from "@app/views/repos/Cob/CobCommitTeaser.svelte";
  import CommentComponent from "@app/components/Comment.svelte";
  import DiffStatBadge from "@app/components/DiffStatBadge.svelte";
  import DropdownList from "@app/components/DropdownList.svelte";
  import DropdownListItem from "@app/components/DropdownList/DropdownListItem.svelte";
  import ErrorMessage from "@app/components/ErrorMessage.svelte";
  import ExpandButton from "@app/components/ExpandButton.svelte";
  import IconButton from "@app/components/IconButton.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Link from "@app/components/Link.svelte";
  import Loading from "@app/components/Loading.svelte";
  import Markdown from "@app/components/Markdown.svelte";
  import NodeId from "@app/components/NodeId.svelte";
  import Popover from "@app/components/Popover.svelte";
  import Reactions from "@app/components/Reactions.svelte";
  import Thread from "@app/components/Thread.svelte";
  import Id from "@app/components/Id.svelte";

  export let baseUrl: BaseUrl;
  export let initiallyExpanded: boolean = false;
  export let rawPath: (commit?: string) => string;
  export let patchId: string;
  export let patchState: PatchState;
  export let repoId: string;
  export let revisionBase: string;
  export let revisionId: string;
  export let revisionEdits: Revision["edits"];
  export let revisionOid: string;
  export let revisionTimestamp: number;
  export let revisionReactions: Comment["reactions"];
  export let revisionAuthor: Author;
  export let revisionDescription: string;
  export let timelines: Timeline[];
  export let previousRevBase: string | undefined = undefined;
  export let previousRevId: string | undefined = undefined;
  export let previousRevOid: string | undefined = undefined;
  export let first: boolean;

  let expanded = initiallyExpanded;
  const api = new HttpdClient(baseUrl);
  const lastEdit = revisionEdits.at(-1);

  function formatVerdict(verdict?: Verdict | null) {
    switch (verdict) {
      case "accept":
        return "accepted revision";
      case "reject":
        return "rejected revision";
      default:
        return "reviewed revision";
    }
  }

  function verdictIconColor(verdict?: Verdict | null) {
    switch (verdict) {
      case "accept":
        return "var(--color-foreground-success)";
      case "reject":
        return "var(--color-foreground-red)";
      default:
        return "var(--color-fill-gray)";
    }
  }

  function badgeColor({ status }: PatchState): string | undefined {
    if (status === "draft") {
      return "var(--color-fill-gray)";
    } else if (status === "open") {
      return "var(--color-foreground-success)";
    } else if (status === "archived") {
      return "var(--color-foreground-yellow)";
    } else if (status === "merged") {
      return "var(--color-fill-primary)";
    } else {
      return "var(--color-foreground-success)";
    }
  }

  let response: DiffResponse | undefined = undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let error: any | undefined = undefined;
  let loading: boolean = false;

  $: fromCommit =
    previousRevBase !== revisionBase
      ? revisionBase
      : (previousRevBase ?? revisionBase);
  $: baseMismatch = previousRevBase !== revisionBase;

  onMount(async () => {
    try {
      loading = true;
      response = await cachedGetDiff(
        api.baseUrl,
        repoId,
        fromCommit,
        revisionOid,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      error = err;
    } finally {
      loading = false;
    }
  });
</script>

<style>
  .action {
    border-radius: var(--border-radius-small);
    min-height: 2.5rem;
    display: flex;
    align-items: center;
  }
  .merge {
    border: 1px solid var(--color-border-merged);
    background-color: var(--color-fill-merged);
  }
  .positive-review {
    border: 1px solid var(--color-fill-diff-green);
    background-color: var(--color-fill-diff-green-light);
  }
  .comment-review {
    border: 1px solid var(--color-border-hint);
    background-color: var(--color-fill-float);
  }
  .negative-review {
    border: 1px solid var(--color-fill-diff-red);
    background-color: var(--color-fill-diff-red-light);
  }

  .diff-error {
    margin: 1rem 1.5rem;
  }
  .revision {
    display: flex;
    flex-direction: column;
    border-radius: var(--border-radius-small);
  }
  .revision-box {
    border-radius: var(--border-radius-small);
  }
  .revision-header {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    padding: 0.5rem;
    font-size: var(--font-size-small);
    height: 3rem;
  }
  .revision-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: var(--font-weight-medium);
  }
  .revision-data {
    gap: 0.5rem;
    display: flex;
    align-items: center;
    margin-left: auto;
    color: var(--color-foreground-dim);
  }
  .revision-description {
    margin-left: 2.75rem;
    padding-right: 0.5rem;
    max-width: fit-content;
  }
  .author-metadata {
    color: var(--color-fill-gray);
    font-size: var(--font-size-small);
  }
  .compare-dropdown-item {
    font-weight: var(--font-weight-regular);
  }
  .patch-header {
    background-color: var(--color-fill-float);
    border-bottom: 1px solid var(--color-fill-separator);
    border-top: 1px solid var(--color-fill-separator);
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 2.5rem;
    padding: 0.5rem 0;
    font-size: var(--font-size-small);
    gap: 0.5rem;
  }
  .authorship-header {
    display: inline-flex;
    white-space: nowrap;
    flex-wrap: wrap;
    align-items: center;
    padding: 0 0.5rem;
    min-height: 1.5rem;
    gap: 0.5rem;
    font-size: var(--font-size-small);
  }
  .timestamp {
    font-size: var(--font-size-small);
    color: var(--color-fill-gray);
  }
  .actions {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding-left: 2.5rem;
    gap: 0.5rem;
  }
  .commits {
    position: relative;
    display: flex;
    flex-direction: column;
    font-size: 0.875rem;
    margin-left: 1.25rem;
    gap: 0.5rem;
    padding: 1rem 0.5rem 1rem 1rem;
    border-left: 1px solid var(--color-fill-separator);
  }
  .commit:last-of-type::after {
    content: "";
    position: absolute;
    left: -18.5px;
    top: 14px;
    bottom: -1rem;
    border-left: 4px solid var(--color-background-default);
  }
  .expanded {
    box-shadow: 0 0 0 1px var(--color-border-hint);
  }
  .commit-dot {
    border-radius: var(--border-radius-round);
    width: 4px;
    height: 4px;
    position: absolute;
    top: 0.625rem;
    left: -18.5px;
    background-color: var(--color-fill-separator);
  }
  .connector {
    width: 1px;
    height: 1.5rem;
    margin-left: 1.25rem;
    background-color: var(--color-fill-separator);
  }
  @media (max-width: 719.98px) {
    .revision-box {
      border-radius: 0;
    }
    .action {
      border-radius: 0;
    }
  }
</style>

<div class="revision" style:margin-bottom={expanded ? "2rem" : "0.5rem"}>
  <div class="revision-box" class:expanded>
    <div class="revision-header">
      <div class="revision-name">
        <ExpandButton {expanded} on:toggle={() => (expanded = !expanded)} />
        <span>
          Revision
          <Id id={revisionId} />
        </span>
      </div>
      <div class="revision-data">
        <span
          class="global-hide-on-mobile-down"
          title={utils.absoluteTimestamp(revisionTimestamp)}>
          {utils.formatTimestamp(revisionTimestamp)}
        </span>
        {#if loading}
          <Loading small />
        {/if}
        {#if response?.diff.stats}
          <Link
            title="Compare {utils.formatCommit(
              fromCommit,
            )}..{utils.formatCommit(revisionOid)}"
            route={{
              resource: "repo.patch",
              repo: repoId,
              node: baseUrl,
              patch: patchId,
              view: { name: "diff", fromCommit, toCommit: revisionOid },
            }}>
            {@const { insertions, deletions } = response.diff.stats}
            <DiffStatBadge hoverable {insertions} {deletions} />
          </Link>
        {/if}
        <Popover
          popoverPadding="0"
          popoverPositionTop={expanded ? "3rem" : "2.5rem"}
          popoverPositionRight="0"
          popoverBorderRadius="var(--border-radius-small)">
          <IconButton
            slot="toggle"
            let:toggle
            on:click={toggle}
            title="toggle-context-menu">
            <Icon name="more" />
          </IconButton>
          <DropdownList
            slot="popover"
            items={previousRevOid && previousRevId
              ? [revisionBase, previousRevOid]
              : [revisionBase]}>
            <Link
              let:item
              disabled={item !== revisionBase && baseMismatch}
              slot="item"
              title="Compare {utils.formatCommit(item)}..{utils.formatCommit(
                revisionOid,
              )}"
              route={{
                resource: "repo.patch",
                repo: repoId,
                node: baseUrl,
                patch: patchId,
                view: {
                  name: "diff",
                  fromCommit: item,
                  toCommit: revisionOid,
                },
              }}>
              {#if item === revisionBase}
                <DropdownListItem selected={false}>
                  <span class="compare-dropdown-item">
                    Compare to base:
                    <span
                      style:color="var(--color-fill-gray)"
                      style:font-weight="var(--font-weight-bold)"
                      style:font-family="var(--font-family-monospace)">
                      {utils.formatObjectId(revisionBase)}
                    </span>
                  </span>
                </DropdownListItem>
              {:else if previousRevId}
                <DropdownListItem
                  selected={false}
                  disabled={baseMismatch}
                  title={baseMismatch
                    ? "Previous revision has different base"
                    : `${utils.formatCommit(item)}..${utils.formatCommit(
                        revisionOid,
                      )}`}>
                  <span class="compare-dropdown-item">
                    Compare to previous revision: <span
                      style:color="var(--color-fill-secondary)"
                      style:font-weight="var(--font-weight-bold)"
                      style:font-family="var(--font-family-monospace)">
                      {utils.formatObjectId(previousRevId)}
                    </span>
                  </span>
                </DropdownListItem>
              {/if}
            </Link>
          </DropdownList>
        </Popover>
      </div>
    </div>
    {#if expanded}
      <div>
        <div class="patch-header">
          <div class="authorship-header">
            <div
              style:color={badgeColor(patchState)}
              style:padding="0 0.375rem">
              <Icon name="patch" />
            </div>
            <NodeId
              {baseUrl}
              nodeId={revisionAuthor.id}
              alias={revisionAuthor.alias} />
            {#if patchId === revisionId}
              opened this patch on base
              <Id id={revisionBase} style="commit" />
            {:else}
              updated to
              <Id id={revisionId} />
              {#if previousRevBase && previousRevBase !== revisionBase}
                on base
                <Id id={revisionBase} style="commit" />
              {/if}
            {/if}
            <span
              class="timestamp"
              title={utils.absoluteTimestamp(revisionTimestamp)}>
              {utils.formatTimestamp(revisionTimestamp)}
            </span>
            {#if revisionEdits.length > 1 && lastEdit}
              <div
                class="author-metadata"
                title={utils.formatEditedCaption(
                  lastEdit.author,
                  lastEdit.timestamp,
                )}>
                • edited
              </div>
            {/if}
          </div>
          {#if revisionDescription && !first}
            <div class="revision-description txt-small">
              <Markdown
                breaks
                rawPath={rawPath(revisionBase)}
                content={revisionDescription} />
            </div>
          {/if}
          {#if revisionReactions && revisionReactions.length > 0}
            <div class="actions">
              <Reactions reactions={revisionReactions} />
            </div>
          {/if}
        </div>
        {#if loading}
          <div style:height="3.5rem">
            <Loading small />
          </div>
        {/if}
        {#if response?.commits}
          <div class="commits">
            {#each response.commits.toReversed() as commit}
              <div class="commit" style:position="relative">
                <div class="commit-dot"></div>
                <CobCommitTeaser {commit} {baseUrl} {repoId} />
              </div>
            {/each}
          </div>
        {/if}
      </div>
      {#if error}
        <div
          class="diff-error txt-monospace txt-small"
          style:border-radius="var(--border-radius-small)">
          <ErrorMessage
            title="Failed to load diff for this revision"
            description="Make sure you are able to connect to the seed <code>${utils.baseUrlToString(
              api.baseUrl,
            )}</code>"
            {error} />
        </div>
      {/if}
    {/if}
  </div>
  {#if expanded}
    {#if timelines.length > 0}
      {#each timelines as element}
        {#if element.type === "thread"}
          <div class="connector"></div>
          <Thread
            {baseUrl}
            thread={element.inner}
            rawPath={rawPath(revisionBase)} />
        {:else if element.type === "merge"}
          <div class="connector"></div>
          <div class="action merge">
            <div class="authorship-header">
              <div style:color="var(--color-fill-primary)">
                <Icon name="patch" />
              </div>

              <NodeId
                {baseUrl}
                nodeId={element.inner.author.id}
                alias={element.inner.author.alias}>
              </NodeId>

              merged revision
              <Id id={element.inner.revision} />
              at commit
              <Id id={element.inner.commit} style="commit" />
              <span
                class="timestamp"
                title={utils.absoluteTimestamp(revisionTimestamp)}>
                {utils.formatTimestamp(revisionTimestamp)}
              </span>
            </div>
          </div>
        {:else if element.type === "review"}
          {@const [author, review] = element.inner}
          <div class="connector"></div>
          <div
            class="action"
            class:comment-review={review.verdict === null}
            class:positive-review={review.verdict === "accept"}
            class:negative-review={review.verdict === "reject"}>
            <CommentComponent
              {baseUrl}
              id={review.id}
              rawPath={rawPath(revisionBase)}
              authorId={author}
              authorAlias={review.author.alias}
              timestamp={review.timestamp}
              body={review.summary ?? ""}>
              <div slot="caption">
                {formatVerdict(review.verdict)}
                <Id id={revisionId} />
              </div>
              <div slot="icon" style:color={verdictIconColor(review.verdict)}>
                {#if review.verdict === "accept"}
                  <Icon name="checkmark" />
                {:else if review.verdict === "reject"}
                  <Icon name="cross" />
                {:else}
                  <Icon name="chat" />
                {/if}
              </div>
            </CommentComponent>
          </div>
          {#if review.threads.length > 0}
            {#each review.threads as thread}
              <div class="connector"></div>
              <Thread {baseUrl} {thread} rawPath={rawPath(revisionBase)} />
            {/each}
          {/if}
        {/if}
      {/each}
    {/if}
    <slot />
  {/if}
</div>
