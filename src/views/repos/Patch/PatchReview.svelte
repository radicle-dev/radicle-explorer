<script lang="ts">
  import type { BaseUrl, Comment, Review, Verdict } from "@http-client";

  import { formatTimeShort } from "@app/views/repos/Patch/timeline";

  import Icon from "@app/components/Icon.svelte";
  import Id from "@app/components/Id.svelte";
  import Markdown from "@app/components/Markdown.svelte";
  import NodeId from "@app/components/NodeId.svelte";
  import PatchComment from "@app/views/repos/Patch/PatchComment.svelte";

  export let baseUrl: BaseUrl;
  export let review: Review;
  export let revisionId: string;
  export let rawPath: string;

  interface CommentThread {
    root: Comment;
    replies: Comment[];
  }

  $: threads = review.comments
    .filter(comment => !comment.replyTo)
    .map<CommentThread>(root => ({
      root,
      replies: review.comments
        .filter(c => c.replyTo === root.id)
        .sort((a, b) => a.timestamp - b.timestamp),
    }));

  function verdictIcon(verdict: Verdict | null | undefined) {
    if (verdict === "accept") return "thumbs-up" as const;
    if (verdict === "reject") return "stop" as const;
    return "comment" as const;
  }
  function verdictClass(verdict: Verdict | null | undefined): string {
    if (verdict === "accept") return "verdict-accept";
    if (verdict === "reject") return "verdict-reject";
    return "verdict-comment";
  }
  function verdictLabel(verdict: Verdict | null | undefined): string {
    if (verdict === "accept") return "accepted revision";
    if (verdict === "reject") return "rejected revision";
    return "reviewed revision";
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
  }
  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    flex-shrink: 0;
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
  .meta-hash {
    color: var(--color-text-quaternary);
  }
  .meta-hash :global(.txt-id) {
    color: inherit;
  }
  .timestamp {
    color: var(--color-text-quaternary);
  }
  .review-summary {
    flex-basis: 100%;
    padding-left: 0.25rem;
    color: var(--color-text-primary);
    word-break: break-word;
  }
  .verdict-accept {
    background-color: var(--color-feedback-success-bg);
    color: var(--color-feedback-success-text);
  }
  .verdict-accept :global(*) {
    color: var(--color-feedback-success-text);
  }
  .verdict-reject {
    background-color: var(--color-feedback-error-bg);
    color: var(--color-feedback-error-text);
  }
  .verdict-reject :global(*) {
    color: var(--color-feedback-error-text);
  }
  .verdict-comment {
    background-color: var(--color-surface-subtle);
  }
  .review-threads {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0.25rem 0 0.25rem 1.5rem;
  }
</style>

<div class="timeline-item {verdictClass(review.verdict)}">
  <span class="icon"><Icon name={verdictIcon(review.verdict)} /></span>
  <div class="wrapper">
    <NodeId {baseUrl} nodeId={review.author.id} alias={review.author.alias} />
    <div class="summary-line">
      <span class="summary-secondary">{verdictLabel(review.verdict)}</span>
    </div>
    <div class="meta">
      <span class="meta-hash"><Id id={revisionId} /></span>
      <span class="timestamp">{formatTimeShort(review.timestamp)}</span>
    </div>
    {#if review.summary}
      <div class="review-summary">
        <Markdown breaks content={review.summary} {rawPath} />
      </div>
    {/if}
  </div>
</div>
{#if threads.length > 0}
  <div class="review-threads">
    {#each threads as thread (thread.root.id)}
      <PatchComment {baseUrl} comment={thread.root} {rawPath} />
      {#each thread.replies as reply (reply.id)}
        <PatchComment {baseUrl} comment={reply} {rawPath} caption="replied" />
      {/each}
    {/each}
  </div>
{/if}
