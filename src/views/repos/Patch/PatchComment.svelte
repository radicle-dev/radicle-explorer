<script lang="ts">
  import type { BaseUrl, Comment } from "@http-client";

  import * as utils from "@app/lib/utils";
  import { formatTimeShort } from "@app/views/repos/Patch/timeline";

  import Markdown from "@app/components/Markdown.svelte";
  import NodeId from "@app/components/NodeId.svelte";
  import PatchReactions from "@app/views/repos/Patch/PatchReactions.svelte";

  export let baseUrl: BaseUrl;
  export let comment: Comment;
  export let rawPath: string;
  export let caption: string = "commented";

  type Side = "left" | "right";
  type SelectionRange = {
    start: { side: Side; lineNumber: number };
    end?: { side: Side; lineNumber: number };
  };

  function rangeFromLocation(
    location: Comment["location"] | null | undefined,
  ): SelectionRange | undefined {
    if (location?.old?.type === "lines") {
      return { start: { side: "left", lineNumber: location.old.range.start } };
    } else if (location?.new?.type === "lines") {
      return { start: { side: "right", lineNumber: location.new.range.start } };
    }
  }

  $: lastEdit = comment.edits.length > 1 ? comment.edits.at(-1) : undefined;
  $: selectionRange = rangeFromLocation(comment.location);
</script>

<style>
  .card {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem 0;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--border-radius-sm);
    background-color: var(--color-surface-canvas);
  }
  .header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    min-height: 1.5rem;
    padding: 0 0.75rem;
    white-space: nowrap;
    font: var(--txt-body-m-regular);
  }
  .caption {
    color: var(--color-text-tertiary);
  }
  .code-location {
    font: var(--txt-code-small);
    background-color: var(--color-surface-mid);
    border-radius: var(--border-radius-sm);
    padding: 0.125rem 0.25rem;
  }
  .timestamp,
  .edited {
    color: var(--color-text-quaternary);
  }
  .body {
    padding: 0 0.75rem;
    word-wrap: break-word;
    font: var(--txt-body-m-regular);
  }
  .reactions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 0.75rem;
  }
</style>

<div class="card">
  <div class="header">
    <NodeId {baseUrl} nodeId={comment.author.id} alias={comment.author.alias} />
    <span class="caption">{caption}</span>
    {#if comment.location && selectionRange}
      <span class="caption">on</span>
      <span class="code-location">
        {comment.location.path.split("/").length > 1
          ? "…/"
          : ""}{comment.location.path.split("/").slice(-1)}:{selectionRange
          .start.side === "left"
          ? "L"
          : "R"}{selectionRange.start.lineNumber}
      </span>
    {/if}
    <span class="timestamp" title={utils.absoluteTimestamp(comment.timestamp)}>
      {formatTimeShort(comment.timestamp)}
    </span>
    {#if lastEdit}
      <span
        class="edited"
        title={utils.formatEditedCaption(lastEdit.author, lastEdit.timestamp)}>
        • edited
      </span>
    {/if}
  </div>
  {#if comment.body}
    <div class="body">
      <Markdown breaks {rawPath} content={comment.body} />
    </div>
  {/if}
  {#if comment.reactions.length > 0}
    <div class="reactions">
      <PatchReactions reactions={comment.reactions} />
    </div>
  {/if}
</div>
