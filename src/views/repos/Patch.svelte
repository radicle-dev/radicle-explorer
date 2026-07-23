<script lang="ts" context="module">
  import type {
    Author,
    Comment,
    Review,
    Merge,
    Repo,
    Revision,
    Diff,
  } from "@http-client";

  interface Thread {
    root: Comment;
    replies: Comment[];
  }

  interface ReviewWithThreads extends Review {
    threads: Thread[];
  }

  interface TimelineReview {
    inner: [string, ReviewWithThreads];
    type: "review";
    timestamp: number;
  }

  interface TimelineMerge {
    inner: Merge;
    type: "merge";
    timestamp: number;
  }

  interface TimelineThread {
    inner: Thread;
    type: "thread";
    timestamp: number;
  }

  export type Timeline = TimelineMerge | TimelineReview | TimelineThread;
  export type PatchReviews = Record<
    string,
    { latest: boolean; review: Review }
  >;
</script>

<script lang="ts">
  import type { BaseUrl, Patch } from "@http-client";
  import type { PatchView } from "./router";
  import type { Route } from "@app/lib/router";
  import type { ComponentProps } from "svelte";

  import * as utils from "@app/lib/utils";
  import capitalize from "lodash/capitalize";
  import uniqBy from "lodash/uniqBy";
  import { onDestroy } from "svelte";

  import Badge from "@app/components/Badge.svelte";
  import Button from "@app/components/Button.svelte";
  import Changeset from "@app/views/repos/Changeset.svelte";
  import CheckoutButton from "@app/views/repos/Patch/CheckoutButton.svelte";
  import CompareButton from "@app/views/repos/Patch/CompareButton.svelte";
  import Embeds from "@app/views/repos/Cob/Embeds.svelte";
  import Icon from "@app/components/Icon.svelte";
  import InlineTitle from "@app/views/repos/components/InlineTitle.svelte";
  import Layout from "@app/views/repos/Layout.svelte";
  import Link from "@app/components/Link.svelte";
  import Markdown from "@app/components/Markdown.svelte";
  import PatchMetadata from "@app/views/repos/Patch/PatchMetadata.svelte";
  import Placeholder from "@app/components/Placeholder.svelte";
  import Reactions from "@app/components/Reactions.svelte";
  import RevisionComponent from "@app/views/repos/Cob/Revision.svelte";
  import RevisionSelector from "@app/views/repos/Patch/RevisionSelector.svelte";
  import Separator from "./Separator.svelte";
  import Share from "@app/views/repos/Share.svelte";

  export let baseUrl: BaseUrl;
  export let patch: Patch;
  export let stats: Diff["stats"];
  export let rawPath: (commit?: string) => string;
  export let repo: Repo;
  export let view: PatchView;
  export let nodeId: string;
  export let nodeAvatarUrl: string | undefined;

  const patchStatusLabel: Record<Patch["state"]["status"], string> = {
    draft: "Draft Patches",
    open: "Open Patches",
    archived: "Archived Patches",
    merged: "Merged Patches",
  };

  function badgeColor(status: string): ComponentProps<Badge>["variant"] {
    if (status === "draft") {
      return "draft";
    } else if (status === "open") {
      return "open";
    } else if (status === "archived") {
      return "archived";
    } else if (status === "merged") {
      return "merged";
    } else {
      return "draft";
    }
  }

  type Tab = "activity" | "changes";

  let tabs: Record<Tab, { icon: ComponentProps<Icon>["name"]; route: Route }>;
  $: {
    const baseRoute = {
      resource: "repo.patch",
      repo: repo.rid,
      node: baseUrl,
      patch: patch.id,
    } as const;
    // For cleaner URLs, we omit the revision part when we link to the
    // latest revision.
    const latestRevisionId = patch.revisions[patch.revisions.length - 1].id;
    const revision = latestRevisionId === revisionId ? undefined : revisionId;
    tabs = {
      activity: {
        route: {
          ...baseRoute,
          view: { name: "activity" },
        },
        icon: "activity",
      },
      changes: {
        route: {
          ...baseRoute,
          view: { name: "changes", revision },
        },
        icon: "diff",
      },
    };
  }

  // Collapse a long patch description behind a Show more/less toggle.
  const DESCRIPTION_MAX_HEIGHT = 300;
  let descriptionEl: HTMLElement | undefined;
  let descriptionExpanded = false;
  let descriptionOverflows = false;
  let descriptionObserver: ResizeObserver | undefined;
  $: descriptionCollapsed = descriptionOverflows && !descriptionExpanded;
  $: {
    descriptionObserver?.disconnect();
    if (descriptionEl) {
      const el = descriptionEl;
      descriptionObserver = new ResizeObserver(() => {
        descriptionOverflows = el.scrollHeight > DESCRIPTION_MAX_HEIGHT;
      });
      descriptionObserver.observe(el);
    }
  }
  onDestroy(() => descriptionObserver?.disconnect());

  // eslint-disable-next-line no-useless-assignment
  $: revisionId =
    view.name === "diff"
      ? patch.revisions[patch.revisions.length - 1].id
      : view.revision;

  $: uniqueEmbeds = uniqBy(
    patch.revisions.flatMap(({ discussions }) =>
      discussions.flatMap(comment => comment.embeds),
    ),
    "content",
  );
  $: description = patch.revisions[0].description;
  $: timelineTuple = patch.revisions.map<
    [
      {
        revisionId: string;
        revisionTimestamp: number;
        revisionBase: string;
        revisionOid: string;
        revisionEdits: Revision["edits"];
        revisionReactions: Revision["reactions"];
        revisionAuthor: Author;
        revisionDescription: string;
      },
      Timeline[],
    ]
  >(rev => [
    {
      revisionId: rev.id,
      revisionTimestamp: rev.timestamp,
      revisionBase: rev.base,
      revisionOid: rev.oid,
      revisionEdits: rev.edits,
      revisionReactions: rev.reactions,
      revisionAuthor: rev.author,
      revisionDescription: rev.description,
    },
    [
      ...rev.reviews.map<TimelineReview>(review => {
        const reviewThreads: Thread[] = review.comments
          .filter(comment => !comment.replyTo)
          .map(thread => ({
            root: thread,
            replies: review.comments
              .filter(comment => comment.replyTo === thread.id)
              .sort((a, b) => a.timestamp - b.timestamp),
          }));
        return {
          timestamp: review.timestamp,
          type: "review",
          inner: [review.author.id, { ...review, threads: reviewThreads }],
        };
      }),
      ...patch.merges
        .filter(merge => merge.revision === rev.id)
        .map<TimelineMerge>(inner => ({
          timestamp: inner.timestamp,
          type: "merge",
          inner,
        })),
      ...rev.discussions
        .filter(comment => !comment.replyTo)
        .map<TimelineThread>(thread => ({
          timestamp: thread.timestamp,
          type: "thread",
          inner: {
            root: thread,
            replies: rev.discussions
              .filter(comment => comment.replyTo === thread.id)
              .sort((a, b) => a.timestamp - b.timestamp),
          },
        })),
    ].sort((a, b) => a.timestamp - b.timestamp),
  ]);
  $: firstRevision = timelineTuple[0][0];
</script>

<style>
  .main {
    max-width: 80rem;
    margin: 0 auto;
    padding: 1.5rem 6rem;
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "title"
      "meta"
      "content";
    transition:
      max-width 200ms ease,
      padding 200ms ease;
  }
  /* On the Changes/Compare views, drop the centered max-width and wide side
     margins so the diff uses the full width. */
  .main.wide {
    max-width: 100%;
    padding: 1.5rem 2rem;
  }
  .title {
    grid-area: title;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    word-break: break-word;
  }
  .title-text {
    min-width: 0;
    font: var(--txt-heading-l);
  }
  .no-title {
    color: var(--color-text-tertiary);
    font: var(--txt-heading-l);
  }
  .meta-bar {
    grid-area: meta;
    margin-bottom: 1rem;
  }
  .content {
    grid-area: content;
    min-width: 0;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* Collapsible patch description. */
  .patch-description {
    position: relative;
  }
  .patch-description-body {
    font: var(--txt-body-m-regular);
    word-break: break-word;
  }
  .patch-description.collapsed .patch-description-body {
    max-height: 300px;
    overflow: hidden;
  }
  .patch-description.collapsed {
    margin-bottom: 1.5rem;
  }
  .patch-description-toggle {
    display: flex;
    justify-content: center;
    margin-top: 0.5rem;
    margin-bottom: 1.5rem;
  }
  .patch-description.collapsed .patch-description-toggle {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    align-items: flex-end;
    height: 6rem;
    margin: 0;
    padding-bottom: 0.25rem;
    background: linear-gradient(
      to bottom,
      transparent,
      var(--color-surface-base)
    );
    pointer-events: none;
  }
  .patch-description-button {
    pointer-events: auto;
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--border-radius-sm);
    background-color: var(--color-surface-canvas);
    color: var(--color-text-primary);
    cursor: pointer;
    box-shadow: var(--elevation-low);
    font: var(--txt-body-m-medium);
  }
  .patch-description-button:hover,
  .patch-description-button:focus-visible {
    background-color: var(--color-surface-subtle);
  }
  .no-description {
    color: var(--color-text-tertiary);
  }
  .description-reactions {
    margin-bottom: 1.5rem;
  }
  .embeds {
    margin-bottom: 1.5rem;
  }

  .tabs {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding: 0.5rem 0;
    border-top: 1px solid var(--color-border-subtle);
    border-bottom: 1px solid var(--color-border-subtle);
    margin-bottom: 1rem;
  }
  .tabs-left,
  .tabs-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .tabs-right {
    margin-left: auto;
  }
  .mobile-revision-selector {
    width: 100%;
    display: flex;
    margin-bottom: 1rem;
  }
  @media (max-width: 1349.98px) {
    .main {
      padding: 1.5rem 2rem;
    }
  }
  @media (max-width: 719.98px) {
    .main {
      padding: 1rem;
    }
    .main.wide {
      padding: 1rem 0;
    }
  }
</style>

<Layout
  {baseUrl}
  {repo}
  {nodeId}
  {nodeAvatarUrl}
  activeTab="patches"
  stylePaddingBottom="0">
  <svelte:fragment slot="breadcrumb">
    <Separator />
    <Link
      route={{
        resource: "repo.patches",
        repo: repo.rid,
        node: baseUrl,
        search: `status=${patch.state.status}`,
      }}>
      {patchStatusLabel[patch.state.status]}
    </Link>
    <Separator />
    <span class="txt-id">
      <div class="global-hide-on-small-desktop-down">
        {patch.id}
      </div>
      <div class="global-hide-on-medium-desktop-up">
        {utils.formatObjectId(patch.id)}
      </div>
    </span>
  </svelte:fragment>
  <svelte:fragment slot="actions">
    <div class="actions">
      <Share />
      <div class="global-hide-on-mobile-down">
        <CheckoutButton id={patch.id} />
      </div>
    </div>
  </svelte:fragment>

  <div
    class="main"
    class:wide={view.name === "changes" || view.name === "diff"}>
    <div class="title">
      <Badge size="tiny" variant={badgeColor(patch.state.status)}>
        <Icon
          name={patch.state.status === "draft"
            ? "patch-draft"
            : patch.state.status === "merged"
              ? "patch-merged"
              : patch.state.status === "archived"
                ? "patch-archived"
                : "patch"} />
        {capitalize(patch.state.status)}
      </Badge>
      {#if patch.title}
        <div class="title-text">
          <InlineTitle fontSize="heading-l" content={patch.title} />
        </div>
      {:else}
        <span class="no-title">No title</span>
      {/if}
    </div>

    <div class="meta-bar">
      <PatchMetadata {baseUrl} {patch} {repo} {stats} />
    </div>

    <div class="content">
      {#if view.name === "activity"}
        <div class="patch-description" class:collapsed={descriptionCollapsed}>
          <div class="patch-description-body" bind:this={descriptionEl}>
            {#if description}
              <Markdown
                breaks
                content={description}
                rawPath={rawPath(patch.id)} />
            {:else}
              <span class="no-description">No description available</span>
            {/if}
          </div>
          {#if descriptionOverflows}
            <div class="patch-description-toggle">
              <button
                type="button"
                class="patch-description-button"
                on:click={() => (descriptionExpanded = !descriptionExpanded)}>
                {descriptionExpanded ? "Show less" : "Show more"}
                <Icon
                  name={descriptionExpanded
                    ? "collapse-vertical"
                    : "expand-vertical"} />
              </button>
            </div>
          {/if}
        </div>
        {#if firstRevision.revisionReactions.length > 0}
          <div class="description-reactions">
            <Reactions reactions={firstRevision.revisionReactions} />
          </div>
        {/if}
        {#if uniqueEmbeds.length > 0}
          <div class="embeds">
            <Embeds embeds={uniqueEmbeds} />
          </div>
        {/if}
      {/if}

      <div class="tabs">
        <div class="tabs-left">
          {#each Object.entries(tabs) as [name, { route, icon }]}
            <Link {route}>
              <Button
                variant={name === view.name ||
                (view.name === "diff" && name === "changes")
                  ? "gray"
                  : "background"}>
                <Icon name={icon} />
                {capitalize(name)}
              </Button>
            </Link>
          {/each}
        </div>
        <div class="tabs-right global-hide-on-mobile-down">
          {#if view.name === "changes"}
            <RevisionSelector {view} {baseUrl} {patch} {repo} />
          {/if}
          {#if view.name === "diff"}
            <CompareButton
              fromCommit={view.fromCommit}
              toCommit={view.toCommit} />
          {/if}
        </div>
      </div>

      {#if view.name === "changes"}
        <div class="mobile-revision-selector global-hide-on-small-desktop-up">
          <RevisionSelector {view} {baseUrl} {patch} {repo} />
        </div>
        <Changeset
          {baseUrl}
          repoId={repo.rid}
          revision={view.oid}
          files={view.files}
          diff={view.diff} />
      {:else if view.name === "diff"}
        <div class="mobile-revision-selector global-hide-on-small-desktop-up">
          <CompareButton
            fromCommit={view.fromCommit}
            toCommit={view.toCommit} />
        </div>
        <Changeset
          {baseUrl}
          repoId={repo.rid}
          revision={view.toCommit}
          files={view.files}
          diff={view.diff} />
      {:else if view.name === "activity"}
        {#each timelineTuple as [revision, timelines], index}
          {@const previousRevision =
            index > 0 ? patch.revisions[index - 1] : undefined}
          <RevisionComponent
            {baseUrl}
            {rawPath}
            repoId={repo.rid}
            {timelines}
            {...revision}
            first={index === 0}
            patchId={patch.id}
            patchState={patch.state}
            initiallyExpanded={index === patch.revisions.length - 1}
            previousRevId={previousRevision?.id}
            previousRevBase={previousRevision?.base}
            previousRevOid={previousRevision?.oid} />
        {:else}
          <div style:margin="4rem 0">
            <Placeholder
              iconName="no-patches"
              caption="No activity on this patch yet" />
          </div>
        {/each}
      {:else}
        {utils.unreachable(view)}
      {/if}
    </div>
  </div>
</Layout>
