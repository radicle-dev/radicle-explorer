<script lang="ts">
  import type { BaseUrl, CommitHeader } from "@http-client";

  import { absoluteTimestamp, twemoji } from "@app/lib/utils";
  import { renderCommitDescription } from "@app/lib/commit";

  import IconButton from "@app/components/IconButton.svelte";
  import Icon from "@app/components/Icon.svelte";
  import InlineTitle from "@app/views/repos/components/InlineTitle.svelte";
  import Link from "@app/components/Link.svelte";
  import Id from "@app/components/Id.svelte";

  export let baseUrl: BaseUrl;
  export let commit: CommitHeader;
  export let repoId: string;

  let commitMessageVisible = false;

  function toggle(event: MouseEvent | KeyboardEvent) {
    if (
      (event.target as HTMLElement).closest("a, button, [role='button']") !==
      event.currentTarget
    ) {
      return;
    }
    if (event instanceof KeyboardEvent) {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
    }
    commitMessageVisible = !commitMessageVisible;
  }

  $: sameCommitter = commit.author.email === commit.committer.email;
  $: timeParts = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).formatToParts(commit.committer.time * 1000);
  $: clock = timeParts
    .filter(part => part.type !== "dayPeriod")
    .map(part => part.value)
    .join("")
    .trim();
  $: period = timeParts
    .find(part => part.type === "dayPeriod")
    ?.value.toLowerCase();
</script>

<style>
  .teaser {
    display: grid;
    grid-template-columns: 1rem minmax(0, 1fr);
    column-gap: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: var(--border-radius-sm);
  }
  .teaser:hover {
    background-color: var(--color-surface-subtle);
  }
  .toggleable {
    cursor: pointer;
  }
  .icon-cell {
    display: flex;
    align-items: center;
    height: 2rem;
    padding-top: 0.25rem;
  }
  .icon {
    display: flex;
    padding: 0.125rem 0;
    color: var(--color-text-tertiary);
    background-color: var(--color-surface-canvas);
  }
  .icon-stack {
    display: grid;
    place-items: center;
  }
  .icon-default,
  .icon-hover {
    display: flex;
    grid-area: 1 / 1;
    transition:
      opacity 150ms ease,
      transform 150ms ease;
  }
  .icon-hover {
    opacity: 0;
    transform: rotate(-90deg);
  }
  .toggleable:hover .icon-default,
  .toggleable:focus-visible .icon-default {
    opacity: 0;
    transform: rotate(90deg);
  }
  .toggleable:hover .icon-hover,
  .toggleable:focus-visible .icon-hover {
    opacity: 1;
    transform: rotate(0);
  }
  .teaser:hover .icon {
    background-color: var(--color-surface-subtle);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    column-gap: 1rem;
    min-height: 2rem;
    min-width: 0;
  }
  .summary-line {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-height: 2rem;
    flex: 1 1 16rem;
    min-width: 0;
  }
  .summary {
    display: block;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--color-text-primary);
  }
  .summary:hover {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
  }
  .no-message {
    color: var(--color-text-tertiary);
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-left: auto;
    font: var(--txt-body-m-regular);
    color: var(--color-text-tertiary);
    white-space: nowrap;
  }
  .people {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
    max-width: 50%;
    min-width: 0;
    margin-left: 0.5rem;
    font: var(--txt-body-m-regular);
    color: var(--color-text-tertiary);
    white-space: nowrap;
  }
  .names {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .timestamp {
    min-width: 4.5rem;
    text-align: right;
    color: var(--color-text-quaternary);
  }
  .clock {
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.03em;
  }
  .period {
    margin-left: 0.2rem;
  }
  .browse {
    display: flex;
    flex-shrink: 0;
    margin-left: 0.25rem;
    opacity: 0;
  }
  .teaser:hover .browse,
  .teaser:focus-visible .browse,
  .teaser:has(:focus-visible) .browse {
    opacity: 1;
  }
  @media (hover: none) {
    .browse {
      opacity: 1;
    }
  }
  .break {
    display: none;
  }
  @media (max-width: 719.98px) {
    .row {
      column-gap: 0.25rem;
    }
    .summary-line {
      display: contents;
    }
    .summary-line > :global(a) {
      display: flex;
      align-items: center;
      min-height: 2rem;
    }
    .summary {
      min-width: 0;
    }
    .break {
      display: block;
      flex-basis: 100%;
    }
    .people {
      margin-left: 0;
      margin-right: 0.5rem;
    }
    .meta {
      min-width: 0;
      margin-left: 0;
    }
    .browse {
      display: none;
    }
  }
  .commit-message {
    padding: 0.25rem 0 0.75rem;
    font: var(--txt-body-m-regular);
    color: var(--color-text-secondary);
  }
  pre {
    white-space: pre-wrap;
    word-wrap: break-word;
  }
</style>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
  class="teaser"
  class:toggleable={commit.description}
  role={commit.description ? "button" : undefined}
  tabindex={commit.description ? 0 : undefined}
  aria-expanded={commit.description ? commitMessageVisible : undefined}
  on:click={commit.description ? toggle : undefined}
  on:keydown={commit.description ? toggle : undefined}>
  <div class="icon-cell">
    <div class="icon">
      {#if commit.description}
        <span class="icon-stack">
          <span class="icon-default"><Icon name="commit" /></span>
          <span class="icon-hover">
            <Icon
              name={commitMessageVisible
                ? "collapse-vertical"
                : "expand-vertical"} />
          </span>
        </span>
      {:else}
        <Icon name="commit" />
      {/if}
    </div>
  </div>
  <div>
    <div class="row">
      <div class="summary-line">
        <Link
          route={{
            resource: "repo.commit",
            repo: repoId,
            node: baseUrl,
            commit: commit.id,
          }}
          style="min-width: 0;">
          <span class="summary" use:twemoji>
            {#if !commit.summary}
              <span class="no-message">No commit message</span>
            {:else}
              <InlineTitle fontSize="body-m-regular" content={commit.summary} />
            {/if}
          </span>
        </Link>
        <span class="break"></span>
        <span class="people">
          <span class="names">
            <span title={commit.author.email}>{commit.author.name}</span>
            {#if !sameCommitter}
              and <span title={commit.committer.email}>
                {commit.committer.name}
              </span>{/if}
          </span>
        </span>
        <span class="browse">
          <IconButton title="Browse repo at this commit" stylePadding="0.25rem">
            <Link
              route={{
                resource: "repo.source",
                repo: repoId,
                node: baseUrl,
                revision: commit.id,
              }}>
              <Icon name="arrow-right" />
            </Link>
          </IconButton>
        </span>
      </div>
      <div class="meta">
        <Id id={commit.id} />
        <span
          class="timestamp"
          title={absoluteTimestamp(commit.committer.time)}>
          <span class="clock">{clock}</span>
          {#if period}<span class="period">{period}</span>{/if}
        </span>
      </div>
    </div>
    {#if commitMessageVisible}
      <div class="commit-message">
        <pre>{@html renderCommitDescription(commit.description)}</pre>
      </div>
    {/if}
  </div>
</div>
