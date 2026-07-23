<script lang="ts">
  import type {
    Author,
    BaseUrl,
    Diff,
    Patch,
    Repo,
    Verdict,
  } from "@http-client";

  import Badge from "@app/components/Badge.svelte";
  import DropdownList from "@app/components/DropdownList.svelte";
  import DropdownListItem from "@app/components/DropdownList/DropdownListItem.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Id from "@app/components/Id.svelte";
  import Link from "@app/components/Link.svelte";
  import NodeId from "@app/components/NodeId.svelte";
  import Popover from "@app/components/Popover.svelte";
  import UserAvatar from "@app/components/UserAvatar.svelte";

  export let baseUrl: BaseUrl;
  export let patch: Patch;
  export let repo: Repo;
  export let stats: Diff["stats"];

  interface ReviewerSummary {
    author: Author;
    verdict: Verdict | null | undefined;
  }

  $: latestRevision = patch.revisions[patch.revisions.length - 1];

  $: reviewers = (() => {
    const byAuthor: Record<string, ReviewerSummary> = {};
    const sorted = [...patch.revisions].sort(
      (a, b) => a.timestamp - b.timestamp,
    );
    for (const rev of sorted) {
      for (const review of rev.reviews) {
        byAuthor[review.author.id] = {
          author: review.author,
          verdict: review.verdict,
        };
      }
    }
    return Object.values(byAuthor);
  })();

  $: verdicts = reviewers.map(r => r.verdict);
  $: hasReject = verdicts.includes("reject");
  $: allAccept = verdicts.length > 0 && verdicts.every(v => v === "accept");

  function verdictIcon(verdict: Verdict | null | undefined) {
    if (verdict === "accept") return "comment-checkmark" as const;
    if (verdict === "reject") return "comment-cross" as const;
    return "comment" as const;
  }
</script>

<style>
  .meta-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    font: var(--txt-body-m-regular);
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    height: 2rem;
    padding: 0 0.5rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--border-radius-sm);
    background-color: var(--color-surface-canvas);
    color: var(--color-text-tertiary);
    font: var(--txt-body-m-regular);
  }
  .pill-id {
    padding: 0 0.25rem;
  }
  button.pill {
    cursor: pointer;
  }
  .pill-link {
    cursor: pointer;
  }
  button.pill:hover,
  button.pill:focus-visible,
  .pill-link:hover,
  .pill-link:focus-visible {
    background-color: var(--color-surface-subtle);
    color: var(--color-text-primary);
  }
  .insertions {
    color: var(--color-feedback-success-text);
  }
  .deletions {
    color: var(--color-feedback-error-text);
  }
  .reviewer-stack {
    display: inline-flex;
    align-items: center;
  }
  .reviewer-stack :global(img) {
    outline: 1px solid var(--color-surface-canvas);
    margin-left: -0.375rem;
  }
  .reviewer-stack :global(img:first-child) {
    margin-left: 0;
  }
  .reviewer-overflow {
    margin-left: 0.25rem;
    color: var(--color-text-tertiary);
  }
  .verdict-accept {
    color: var(--color-feedback-success-text);
  }
  .verdict-reject {
    color: var(--color-feedback-error-text);
  }
  .labels {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .assignees {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
</style>

<div class="meta-row">
  <div class="pill pill-id">
    <Id id={patch.id} ariaLabel="patch ID" />
  </div>

  {#if stats}
    <Link
      title="View changed files"
      route={{
        resource: "repo.patch",
        repo: repo.rid,
        node: baseUrl,
        patch: patch.id,
        view: { name: "changes", revision: latestRevision.id },
      }}>
      <div class="pill pill-link">
        <Icon name="diff" />
        <span>
          {stats.filesChanged}
          {stats.filesChanged === 1 ? "file" : "files"}
        </span>
        <span class="insertions">+{stats.insertions}</span>
        <span class="deletions">-{stats.deletions}</span>
      </div>
    </Link>
  {/if}

  {#if reviewers.length > 0}
    {#if reviewers.length === 1}
      <div
        class="pill"
        title="{reviewers.length} reviewer{reviewers.length === 1 ? '' : 's'}">
        <span class:verdict-accept={allAccept} class:verdict-reject={hasReject}>
          <Icon
            name={hasReject ? "stop" : allAccept ? "thumbs-up" : "comment"} />
        </span>
        <span>
          {reviewers.length}
          {reviewers.length === 1 ? "review" : "reviews"}
        </span>
        <span class="reviewer-stack">
          <UserAvatar nodeId={reviewers[0].author.id} styleWidth="1.125rem" />
        </span>
      </div>
    {:else}
      <Popover popoverPadding="0" popoverPositionTop="2.5rem">
        <button
          slot="toggle"
          let:toggle
          let:expanded
          class="pill"
          on:click={toggle}
          aria-haspopup="menu"
          aria-expanded={expanded}
          title="{reviewers.length} reviewers">
          <span
            class:verdict-accept={allAccept}
            class:verdict-reject={hasReject}>
            <Icon
              name={hasReject ? "stop" : allAccept ? "thumbs-up" : "comment"} />
          </span>
          <span>{reviewers.length} reviews</span>
          <span class="reviewer-stack">
            {#each reviewers.slice(0, 3) as reviewer}
              <UserAvatar nodeId={reviewer.author.id} styleWidth="1.125rem" />
            {/each}
            {#if reviewers.length > 3}
              <span class="reviewer-overflow">+{reviewers.length - 3}</span>
            {/if}
          </span>
        </button>
        <div
          slot="popover"
          style:border="1px solid var(--color-border-subtle)"
          style:border-radius="var(--border-radius-sm)"
          style:background-color="var(--color-surface-canvas)"
          style:min-width="14rem">
          <DropdownList items={reviewers}>
            <DropdownListItem slot="item" let:item selected={false}>
              <span
                class:verdict-accept={item.verdict === "accept"}
                class:verdict-reject={item.verdict === "reject"}>
                <Icon name={verdictIcon(item.verdict)} />
              </span>
              <NodeId
                {baseUrl}
                nodeId={item.author.id}
                alias={item.author.alias} />
            </DropdownListItem>
          </DropdownList>
        </div>
      </Popover>
    {/if}
  {/if}

  {#if patch.labels.length > 0}
    <div class="labels">
      {#each patch.labels as label}
        <Badge variant="neutral" size="small">{label}</Badge>
      {/each}
    </div>
  {/if}

  {#if patch.assignees.length > 0}
    <div class="assignees">
      {#each patch.assignees as { id, alias }}
        <NodeId {baseUrl} nodeId={id} {alias} />
      {/each}
    </div>
  {/if}
</div>
