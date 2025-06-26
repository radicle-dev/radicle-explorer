<script lang="ts" context="module">
  import type {
    Author,
    Comment,
    Review,
    Merge,
    Repo,
    Revision,
    Diff,
    SeedingPolicy,
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

  import Badge from "@app/components/Badge.svelte";
  import Button from "@app/components/Button.svelte";
  import Changeset from "@app/views/repos/Changeset.svelte";
  import CheckoutButton from "@app/views/repos/Patch/CheckoutButton.svelte";
  import CobHeader from "@app/views/repos/Cob/CobHeader.svelte";
  import CompareButton from "@app/views/repos/Patch/CompareButton.svelte";
  import DiffStatBadge from "@app/components/DiffStatBadge.svelte";
  import Embeds from "@app/views/repos/Cob/Embeds.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Id from "@app/components/Id.svelte";
  import InlineTitle from "@app/views/repos/components/InlineTitle.svelte";
  import Labels from "@app/views/repos/Cob/Labels.svelte";
  import Layout from "@app/views/repos/Layout.svelte";
  import Link from "@app/components/Link.svelte";
  import Markdown from "@app/components/Markdown.svelte";
  import NodeId from "@app/components/NodeId.svelte";
  import Placeholder from "@app/components/Placeholder.svelte";
  import Radio from "@app/components/Radio.svelte";
  import Reactions from "@app/components/Reactions.svelte";
  import Reviews from "@app/views/repos/Cob/Reviews.svelte";
  import RevisionComponent from "@app/views/repos/Cob/Revision.svelte";
  import RevisionSelector from "@app/views/repos/Patch/RevisionSelector.svelte";
  import Separator from "./Separator.svelte";
  import Share from "@app/views/repos/Share.svelte";

  export let baseUrl: BaseUrl;
  export let seedingPolicy: SeedingPolicy;
  export let patch: Patch;
  export let stats: Diff["stats"];
  export let rawPath: (commit?: string) => string;
  export let repo: Repo;
  export let view: PatchView;
  export let nodeAvatarUrl: string | undefined;

  function badgeColor(status: string): ComponentProps<Badge>["variant"] {
    if (status === "draft") {
      return "foreground";
    } else if (status === "open") {
      return "positive";
    } else if (status === "archived") {
      return "caution";
    } else if (status === "merged") {
      return "primary";
    } else {
      return "foreground";
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

  function computeReviews(patch: Patch) {
    const patchReviews: Record<string, { latest: boolean; review: Review }> =
      {};

    patch.revisions.forEach((rev, i) => {
      const latest = i === patch.revisions.length - 1;
      for (const review of rev.reviews) {
        patchReviews[review.author.id] = { latest, review };
      }
    });

    return patchReviews;
  }

  let revisionId: string;
  $: if (view.name === "diff") {
    revisionId = patch.revisions[patch.revisions.length - 1].id;
  } else {
    revisionId = view.revision;
  }

  $: uniqueEmbeds = uniqBy(
    patch.revisions.flatMap(({ discussions }) =>
      discussions.flatMap(comment => comment.embeds),
    ),
    "content",
  );
  $: description = patch.revisions[0].description;
  $: lastEdit = patch.revisions[0].edits.at(-1);
  $: reviews = computeReviews(patch);
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
  $: latestRevision = patch.revisions[patch.revisions.length - 1];
</script>

<style>
  .patch {
    display: flex;
    flex: 1;
    min-height: 100%;
  }
  .main {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    background-color: var(--color-background-float);
  }
  .metadata {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    font-size: var(--font-size-small);
    padding: 1rem;
    border-left: 1px solid var(--color-border-hint);
    border-left: 1px solid var(--color-border-hint);
    width: 20rem;
  }
  .title {
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-large);
    word-break: break-word;
  }
  .bottom {
    background-color: var(--color-background-default);
    padding: 1rem 1rem 0.5rem 1rem;
    height: 100%;
  }
  .tabs {
    font-size: var(--font-size-tiny);
    display: flex;
    align-items: center;
    justify-content: left;
    flex-wrap: wrap;
    position: relative;
    margin-top: 1rem;
    box-shadow: inset 0 -1px 0 var(--color-border-hint);
  }
  .tabs-spacer {
    width: 1rem;
    height: 100%;
  }
  .author-metadata {
    color: var(--color-fill-gray);
    font-size: var(--font-size-small);
  }
  .revision-description {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }
  .id {
    font-size: var(--font-size-small);
    font-family: var(--font-family-monospace);
    font-weight: var(--font-weight-semibold);
  }
  @media (max-width: 719.98px) {
    .patch {
      display: block;
    }
    .bottom {
      padding: 1rem 0 0 0;
    }
  }
</style>

<Layout
  {baseUrl}
  {repo}
  {nodeAvatarUrl}
  {seedingPolicy}
  activeTab="patches"
  stylePaddingBottom="0">
  <svelte:fragment slot="breadcrumb">
    <Separator />
    <Link
      route={{
        resource: "repo.patches",
        repo: repo.rid,
        node: baseUrl,
      }}>
      Patches
    </Link>
    <Separator />
    <span class="id">
      <div class="global-hide-on-small-desktop-down">
        {patch.id}
      </div>
      <div class="global-hide-on-medium-desktop-up">
        {utils.formatObjectId(patch.id)}
      </div>
    </span>
  </svelte:fragment>
  <div class="patch">
    <div class="main">
      <CobHeader>
        <svelte:fragment slot="title">
          {#if patch.title}
            <div class="title">
              <InlineTitle fontSize="large" content={patch.title} />
            </div>
          {:else}
            <span class="txt-missing">No title</span>
          {/if}
          <div class="global-flex-item">
            <Share />
            <div class="global-hide-on-mobile-down">
              <CheckoutButton id={patch.id} />
            </div>
          </div>
        </svelte:fragment>
        <svelte:fragment slot="state">
          <Badge size="tiny" variant={badgeColor(patch.state.status)}>
            <Icon name="patch" />
            {capitalize(patch.state.status)}
          </Badge>
          <Link
            route={{
              resource: "repo.patch",
              repo: repo.rid,
              node: baseUrl,
              patch: patch.id,
              view: { name: "changes", revision: latestRevision.id },
            }}>
            <DiffStatBadge
              hoverable
              insertions={stats.insertions}
              deletions={stats.deletions} />
          </Link>
          <NodeId
            {baseUrl}
            nodeId={patch.author.id}
            alias={patch.author.alias} />
          opened
          <Id id={patch.id} />
          <span title={utils.absoluteTimestamp(patch.revisions[0].timestamp)}>
            {utils.formatTimestamp(patch.revisions[0].timestamp)}
          </span>
          {#if patch.revisions[0].edits.length > 1 && lastEdit}
            <div
              class="author-metadata"
              title={utils.formatEditedCaption(
                lastEdit.author,
                lastEdit.timestamp,
              )}>
              • edited
            </div>
          {/if}
        </svelte:fragment>
        <div slot="subtitle" class="global-hide-on-desktop-up">
          <div
            style:margin-top="2rem"
            style="display: flex; flex-direction: column; gap: 0.5rem;">
            <Reviews {baseUrl} {reviews} />
            <Labels labels={patch.labels} />
            <Embeds embeds={uniqueEmbeds} />
          </div>
        </div>
        <svelte:fragment slot="description">
          <div class="revision-description">
            {#if description}
              <Markdown
                breaks
                content={description}
                rawPath={rawPath(patch.id)} />
            {:else}
              <span class="txt-missing">No description available</span>
            {/if}
            {#if firstRevision.revisionReactions.length > 0}
              <Reactions reactions={firstRevision.revisionReactions} />
            {/if}
          </div>
        </svelte:fragment>
      </CobHeader>

      <div class="tabs">
        <div class="tabs-spacer"></div>
        <Radio styleGap="0.375rem">
          {#each Object.entries(tabs) as [name, { route, icon }]}
            <Link {route}>
              <Button
                size="large"
                variant={name === view.name ||
                (view.name === "diff" && name === "changes")
                  ? "tab-active"
                  : "tab"}>
                <Icon name={icon} />
                {capitalize(name)}
              </Button>
            </Link>
          {/each}
        </Radio>

        {#if view.name === "changes"}
          <div
            class="global-hide-on-mobile-down"
            style="margin-left: auto; margin-top: -0.5rem;">
            <RevisionSelector {view} {baseUrl} {patch} {repo} />
          </div>
        {/if}
        {#if view.name === "diff"}
          <div
            class="global-hide-on-mobile-down"
            style="margin-left: auto; margin-top: -0.5rem;">
            <div style:margin-left="auto">
              <CompareButton
                fromCommit={view.fromCommit}
                toCommit={view.toCommit} />
            </div>
          </div>
        {/if}
        <div class="tabs-spacer"></div>
      </div>
      <div class="bottom">
        {#if view.name === "changes"}
          <div
            style:width="100%"
            style:padding="0 1rem"
            style:display="flex"
            class="global-hide-on-small-desktop-up">
            <RevisionSelector {view} {baseUrl} {patch} {repo} />
          </div>
        {/if}
        {#if view.name === "diff"}
          <div
            style:width="100%"
            style:padding="0 1rem"
            style:display="flex"
            class="global-hide-on-small-desktop-up">
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
        {:else if view.name === "changes"}
          <Changeset
            {baseUrl}
            repoId={repo.rid}
            revision={view.oid}
            files={view.files}
            diff={view.diff} />
        {:else}
          {utils.unreachable(view)}
        {/if}
      </div>
    </div>

    <div class="metadata global-hide-on-medium-desktop-down">
      <Reviews {baseUrl} {reviews} />
      <Labels labels={patch.labels} />
      <Embeds embeds={uniqueEmbeds} />
    </div>
  </div>
</Layout>
