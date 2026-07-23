<script lang="ts">
  import type { Comment } from "@http-client";

  import { formatObjectId } from "@app/lib/utils";

  export let reactions: Comment["reactions"];

  type Author = Comment["reactions"][0]["authors"][0];

  function formatAuthor(author: Author): string {
    return author.alias ?? formatObjectId(author.id.replace("did:key:", ""));
  }
  function formatAuthors(authors: Author[]): string {
    if (authors.length > 3) return `${authors.length}`;
    return authors.map(formatAuthor).join(", ");
  }
  function tooltip(authors: Author[]): string {
    return authors.map(author => author.alias ?? author.id).join("\n");
  }
</script>

<style>
  .reactions {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex-wrap: wrap;
  }
  .reaction {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 2px 6px;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--border-radius-sm);
    background-color: var(--color-surface-subtle);
    color: var(--color-text-secondary);
    font: var(--txt-body-s-regular);
  }
  .emoji {
    font-size: 0.875rem;
    line-height: 1;
  }
</style>

<div class="reactions">
  {#each reactions as { emoji, authors }}
    <div class="reaction" title={tooltip(authors)}>
      <span class="emoji">{emoji}</span>
      <span>{formatAuthors(authors)}</span>
    </div>
  {/each}
</div>
