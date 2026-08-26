<script lang="ts">
  import type { ActivityItem, BaseUrl, ContributionDay } from "@http-client";
  import type { ComponentProps } from "svelte";

  import { HttpdClient } from "@http-client";

  import {
    absoluteTimestamp,
    formatRepositoryId,
    formatTimestamp,
  } from "@app/lib/utils";
  import { USER_ACTIVITY_TAKE } from "@app/views/users/router";

  import Button from "@app/components/Button.svelte";
  import ContributionCalendar from "@app/components/ContributionCalendar.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Link from "@app/components/Link.svelte";
  import Loading from "@app/components/Loading.svelte";
  import RepoAvatar from "@app/components/RepoAvatar.svelte";

  type IconName = ComponentProps<Icon>["name"];

  export let baseUrl: BaseUrl;
  export let did: string;
  export let activity: ActivityItem[];
  export let calendar: ContributionDay[];
  // Repo names keyed by RID, for the group headings. Activity can in principle
  // name a repo the COB cache still knows but the repo list no longer holds,
  // so the RID is the fallback.
  export let repoNames: Record<string, string>;

  interface FeedRun {
    key: string;
    rid: string;
    name: string;
    items: ActivityItem[];
  }

  const api = new HttpdClient(baseUrl);

  let loadedItems: ActivityItem[] | undefined = undefined;
  let limit = USER_ACTIVITY_TAKE;
  let loading = false;

  // "More" refetches a longer window in place rather than re-running the route
  // load. Tagging the override with the DID it belongs to means navigating to
  // another profile falls back to that route's own feed.
  let loadedFor: string | undefined = undefined;

  $: feed = loadedFor === did && loadedItems ? loadedItems : activity;
  $: feedLimit = loadedFor === did ? limit : USER_ACTIVITY_TAKE;
  // A short page means the query had nothing left to give.
  $: exhausted = feed.length < feedLimit;
  $: feedRuns = groupByRepo(feed, repoNames);

  async function loadMore() {
    if (loading || exhausted) return;
    loading = true;
    const next = feedLimit + USER_ACTIVITY_TAKE;
    try {
      loadedItems = await api.getUserActivity(did, { limit: next });
      loadedFor = did;
      limit = next;
    } finally {
      loading = false;
    }
  }

  // The feed stays in time order; neighbouring items from the same repo
  // collapse under one heading. Every run is headed, a run of one included, so
  // the repo is always named the same way.
  function groupByRepo(
    items: ActivityItem[],
    names: Record<string, string>,
  ): FeedRun[] {
    const runs: FeedRun[] = [];
    for (const item of items) {
      const last = runs.at(-1);
      if (last?.rid === item.rid) {
        last.items.push(item);
      } else {
        runs.push({
          key: `${item.rid}:${item.revisionId ?? item.id}`,
          rid: item.rid,
          name: names[item.rid] ?? formatRepositoryId(item.rid),
          items: [item],
        });
      }
    }

    return runs;
  }

  // Status-bearing icons, matching how the issue and patch teasers render their
  // own state.
  function itemIcon(item: ActivityItem): IconName {
    if (item.kind === "revision") {
      return "revision";
    }
    if (item.kind === "issue") {
      return item.status === "closed" ? "issue-closed" : "issue";
    }
    switch (item.status) {
      case "merged":
        return "patch-merged";
      case "archived":
        return "patch-archived";
      case "draft":
        return "patch-draft";
      default:
        return "patch";
    }
  }

  function itemLabel(item: ActivityItem): string {
    switch (item.kind) {
      case "revision":
        return `New revision on “${item.title}”`;
      case "issue":
        return `Issue “${item.title}”`;
      default:
        return `Patch “${item.title}”`;
    }
  }
</script>

<style>
  .feed-group-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem 0.25rem;
    font: var(--txt-body-m-semibold);
    color: var(--color-text-secondary);
    min-width: 0;
  }
  .feed-group-avatar {
    display: flex;
    width: 1rem;
    height: 1rem;
    overflow: hidden;
    flex-shrink: 0;
    border-radius: var(--border-radius-sm);
  }
  .feed-group-avatar :global(img) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  /* A single absolutely positioned hairline behind the icon column, with each
     icon carrying the surrounding background so the line reads as broken by it.
     Rows are left static on purpose: an absolutely positioned ::before paints
     after in-flow children, so the rail stays visible across a hovered row
     instead of being covered by its background. */
  .feed {
    position: relative;
    /* What an icon paints over the rail. It has to be whatever the section
       itself sits on, or the icons read as chips on a lighter background: the
       centre column sets no background of its own, so this is the page's. */
    --feed-bg: var(--color-surface-base);
  }
  .feed.railed {
    padding: 0.25rem 0 0.5rem;
  }
  .feed.railed::before {
    content: "";
    position: absolute;
    top: 1.5rem;
    bottom: 1.75rem;
    left: 1.5rem;
    width: 1px;
    background-color: var(--color-border-subtle);
    pointer-events: none;
  }
  .feed-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 1rem;
    min-height: 2.5rem;
  }
  .feed-item:hover {
    background-color: var(--color-surface-subtle);
  }
  .feed-icon {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 0.25rem 0;
    background-color: var(--feed-bg);
  }
  .feed-item:hover .feed-icon {
    background-color: var(--color-surface-subtle);
  }
  .feed-title {
    font: var(--txt-body-m-regular);
    color: var(--color-text-primary);
    min-width: 0;
    flex-shrink: 1;
  }
  .feed-revision {
    flex-shrink: 0;
    font: var(--txt-body-m-regular);
    color: var(--color-text-tertiary);
  }
  .feed-meta {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    margin-left: auto;
    flex-shrink: 0;
    font: var(--txt-body-m-regular);
    color: var(--color-text-tertiary);
    white-space: nowrap;
  }
  .open {
    color: var(--color-text-open);
  }
  .closed,
  .merged {
    color: var(--color-text-merged);
  }
  .draft {
    color: var(--color-text-draft);
  }
  .archived {
    color: var(--color-text-archived);
  }
  .more {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
  }
</style>

<ContributionCalendar title="Activity" days={calendar} />

{#each feedRuns as run (run.key)}
  <Link
    styleHoverState
    route={{ resource: "repo.source", repo: run.rid, node: baseUrl }}>
    <div class="feed-group-header">
      <span class="feed-group-avatar">
        <RepoAvatar name={run.name} rid={run.rid} styleWidth="1rem" />
      </span>
      <span class="txt-overflow">{run.name}</span>
    </div>
  </Link>
  <div class="feed" class:railed={run.items.length > 1}>
    {#each run.items as item (item.revisionId ?? item.id)}
      <Link
        styleHoverState
        route={item.kind === "issue"
          ? {
              resource: "repo.issue",
              repo: item.rid,
              node: baseUrl,
              issue: item.id,
            }
          : {
              resource: "repo.patch",
              repo: item.rid,
              node: baseUrl,
              patch: item.id,
            }}>
        <div class="feed-item" title={itemLabel(item)}>
          <span
            class="feed-icon"
            class:open={item.status === "open"}
            class:closed={item.status === "closed"}
            class:merged={item.status === "merged"}
            class:draft={item.status === "draft"}
            class:archived={item.status === "archived"}>
            <Icon name={itemIcon(item)} />
          </span>
          <span class="feed-title txt-overflow">{item.title}</span>
          {#if item.revisionPosition && item.revisionTotal}
            <span class="feed-revision">
              Revision {item.revisionPosition} of {item.revisionTotal}
            </span>
          {/if}
          <span class="feed-meta">
            <span title={absoluteTimestamp(item.timestamp)}>
              {formatTimestamp(item.timestamp)}
            </span>
          </span>
        </div>
      </Link>
    {/each}
  </div>
{/each}

{#if !exhausted}
  <div class="more">
    {#if loading}
      <Loading small center />
    {:else}
      <Button size="large" variant="outline" on:click={loadMore}>More</Button>
    {/if}
  </div>
{/if}
