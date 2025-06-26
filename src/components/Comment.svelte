<script lang="ts">
  import type { BaseUrl, Comment } from "@http-client";

  import * as utils from "@app/lib/utils";

  type Side = "left" | "right";
  type SelectionAnchor = { side: Side; lineNumber: number };
  type SelectionRange = { start: SelectionAnchor; end?: SelectionAnchor };

  import Id from "@app/components/Id.svelte";
  import Markdown from "@app/components/Markdown.svelte";
  import NodeId from "@app/components/NodeId.svelte";
  import Reactions from "@app/components/Reactions.svelte";

  export let id: string;
  export let authorId: string;
  export let authorAlias: string | undefined = undefined;
  export let baseUrl: BaseUrl;
  export let body: string;
  export let reactions: Comment["reactions"] | undefined = undefined;
  export let location: Comment["location"] | undefined = undefined;
  export let caption = "commented";
  export let rawPath: string;
  export let timestamp: number;
  export let isReply: boolean = false;
  export let isLastReply: boolean = false;
  export let lastEdit: Comment["edits"][0] | undefined = undefined;

  function rangeAnchorsFromCodeLocation(
    location: Comment["location"] | null,
  ): SelectionRange | undefined {
    if (location?.old?.type === "lines") {
      return {
        start: { side: "left", lineNumber: location.old.range.start },
      };
    } else if (location?.new?.type === "lines") {
      return {
        start: { side: "right", lineNumber: location.new.range.start },
      };
    }
  }
  $: selectionRange = rangeAnchorsFromCodeLocation(location);
</script>

<style>
  .card {
    display: flex;
    flex-direction: column;
    padding: 0.5rem 0;
    gap: 0.5rem;
  }
  .card:not(:last-child) {
    box-shadow: -1px 0 0 0 var(--color-fill-separator);
  }
  .card-header {
    display: flex;
    align-items: center;
    white-space: nowrap;
    flex-wrap: wrap;
    padding: 0 0.75rem;
    min-height: 1.5rem;
    gap: 0.5rem;
    font-size: var(--font-size-small);
  }
  .code-location {
    font-family: var(--font-family-monospace);
    background-color: var(--color-fill-ghost);
    font-size: var(--font-size-tiny);
    border-radius: var(--border-radius-tiny);
    padding: 0.125rem 0.25rem;
  }
  .reply-dot {
    border-radius: var(--border-radius-round);
    width: 4px;
    height: 4px;
    position: absolute;
    top: 10px;
    left: -2.5px;
    background-color: var(--color-fill-separator);
  }
  .card-metadata {
    color: var(--color-fill-gray);
    font-size: var(--font-size-small);
  }
  .card-body {
    display: flex;
    align-items: center;
    min-height: 1.625rem;
    word-wrap: break-word;
    font-size: var(--font-size-small);
    padding: 0 2.25rem;
  }
  .card-empty-body {
    padding: 0;
  }
  .actions {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    padding-left: 2.25rem;
    margin-left: -0.375rem;
  }
  .timestamp {
    font-size: var(--font-size-small);
    color: var(--color-fill-gray);
  }
  .card-header-no-icon {
    padding-left: 1rem;
  }
  .reply .card-body,
  .reply .actions {
    padding-left: 1rem;
  }
  .connector-line {
    width: 1px;
    height: 21px;
    position: absolute;
    top: -9px;
    left: -1px;
    background-color: var(--color-fill-separator);
  }
</style>

<div class="card" class:card-empty-body={!body} {id} class:reply={isReply}>
  <div style:position="relative">
    {#if isReply}
      <div class="reply-dot"></div>
    {/if}
    {#if isLastReply}
      <div class="connector-line"></div>
    {/if}
    <div class="card-header" class:card-header-no-icon={isReply}>
      <slot class="icon" name="icon" />
      <NodeId {baseUrl} nodeId={authorId} alias={authorAlias} />
      <slot name="caption">{caption}</slot>
      <Id {id} />
      {#if location}
        on change
        <div class="code-location">
          {#if location.path && selectionRange}
            <div class="comment-header">
              {location.path.split("/").length > 1 ? "…/" : ""}{location.path
                .split("/")
                .slice(-1)}:{selectionRange.start.side === "left"
                ? "L"
                : "R"}{selectionRange.start.lineNumber}
              {#if selectionRange.end}
                ->
                {selectionRange.end.side === "left" ? "L" : "R"}{selectionRange
                  .end.lineNumber}
              {/if}
            </div>
          {/if}
        </div>
      {/if}
      <span class="timestamp" title={utils.absoluteTimestamp(timestamp)}>
        {utils.formatTimestamp(timestamp)}
      </span>
      {#if lastEdit}
        <div
          class="card-metadata"
          title={utils.formatEditedCaption(
            lastEdit.author,
            lastEdit.timestamp,
          )}>
          • edited
        </div>
      {/if}
    </div>
  </div>

  {#if body}
    <div class="card-body">
      <div style:overflow="hidden" style:width="100%">
        <Markdown breaks {rawPath} content={body} />
      </div>
    </div>
  {/if}
  {#if reactions && reactions.length > 0}
    <div class="actions">
      <Reactions {reactions} />
    </div>
  {/if}
</div>
