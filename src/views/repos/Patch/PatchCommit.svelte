<script lang="ts">
  import type { CommitHeader } from "@http-client";

  import { formatTimeShort } from "@app/views/repos/Patch/timeline";

  import Icon from "@app/components/Icon.svelte";
  import Id from "@app/components/Id.svelte";

  export let commit: CommitHeader;
  export let hideAuthor: boolean = false;
</script>

<style>
  .timeline-item {
    display: grid;
    grid-template-columns: 1rem minmax(0, 1fr);
    column-gap: 0.5rem;
    align-items: center;
    min-width: 0;
    padding: 0.375rem 0.5rem;
    min-height: 2.5rem;
    font: var(--txt-body-m-regular);
  }
  .icon {
    width: 1rem;
    color: var(--color-text-secondary);
  }
  .wrapper {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
    flex: 1 1 0;
  }
  .author {
    color: var(--color-text-tertiary);
  }
  .summary-line {
    flex: 1 1 0;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .action-verb {
    color: var(--color-text-tertiary);
  }
  .summary-content {
    color: var(--color-text-primary);
    font: var(--txt-body-m-medium);
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
</style>

<div class="timeline-item">
  <div class="icon"><Icon name="commit" /></div>
  <div class="wrapper">
    {#if !hideAuthor}
      <span class="author">{commit.author.name}</span>
    {/if}
    <div class="summary-line">
      {#if !hideAuthor}
        <span class="action-verb">committed</span>
      {/if}
      <span class="summary-content">{commit.summary}</span>
    </div>
    <div class="meta">
      <span class="meta-hash"><Id id={commit.id} /></span>
      <span class="timestamp">{formatTimeShort(commit.committer.time)}</span>
    </div>
  </div>
</div>
