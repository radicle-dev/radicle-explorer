<script lang="ts">
  import type { RepoInfo } from "./RepoCard";
  import type { BaseUrl } from "@http-client";

  import { HttpdClient } from "@http-client";

  import {
    absoluteTimestamp,
    formatTimestamp,
    formatRepositoryId,
    twemoji,
  } from "@app/lib/utils";

  import ActivityDiagram from "@app/components/ActivityDiagram.svelte";
  import Badge from "@app/components/Badge.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Id from "@app/components/Id.svelte";
  import Link from "@app/components/Link.svelte";

  export let compact = false;
  export let repoInfo: RepoInfo;
  export let baseUrl: BaseUrl;

  const api = new HttpdClient(baseUrl);

  $: repo = repoInfo.repo;
  $: project = repoInfo.repo.payloads["xyz.radicle.project"];
  $: baseUrl = repoInfo.baseUrl;
  $: isPrivate = repo.visibility.type === "private";
</script>

<style>
  .repo-card {
    height: 10rem;
    border: 1px solid var(--color-border-default);
    border-radius: var(--border-radius-small);
    background-color: var(--color-background-float);
    padding: 0.75rem 1rem;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .repo-card.compact {
    height: 8rem;
  }

  .repo-card:hover {
    background-color: var(--color-fill-float-hover);
  }

  .activity {
    position: absolute;
    bottom: 1.5rem;
    right: 0;
    width: calc(100% - 3rem);
    max-width: 22rem;
  }

  .activity > .fadeout-overlay {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to right,
      var(--color-background-float) 20%,
      rgba(255, 255, 255, 0) 100%
    );
  }

  .repo-card:hover .fadeout-overlay {
    background: linear-gradient(
      to right,
      var(--color-fill-float-hover) 20%,
      rgba(255, 255, 255, 0) 100%
    );
  }

  .title {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    position: relative;
  }

  .title * {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .title p {
    color: var(--color-foreground-dim);
  }

  .headline-and-badges {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .badges {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .badge {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    overflow: hidden;
    position: relative;
    padding: 0.25rem;
  }

  h4,
  p {
    margin: 0;
  }

  .stats-row {
    position: relative;
    display: flex;
    gap: 0.25rem;
    height: 1.5rem;
    align-items: center;
    white-space: nowrap;
  }
</style>

<Link
  route={{
    resource: "repo.source",
    repo: repo.rid,
    node: baseUrl,
  }}>
  <div class="repo-card" class:compact>
    <div class="activity">
      <div class="fadeout-overlay"></div>
      <ActivityDiagram
        id={repo.rid}
        viewBoxHeight={200}
        styleColor="var(--color-foreground-primary)"
        activity={repoInfo.activity} />
    </div>
    <div class="title">
      <div class="headline-and-badges">
        <h4 use:twemoji>{project.data.name}</h4>
        <div class="badges">
          {#if isPrivate}
            <div
              title="Private"
              class="badge"
              style="background-color: var(--color-fill-private); color: var(--color-foreground-yellow)">
              <Icon name="lock" />
            </div>
          {/if}
          <slot name="delegate" />
          <Badge
            variant="neutral"
            size="tiny"
            style="padding: 0 0.372rem; gap: 0.125rem;">
            <Icon name="seedling" />
            {repoInfo.repo.seeding}
          </Badge>
        </div>
      </div>
      <p class="txt-small" use:twemoji>
        {project.data.description}
      </p>
    </div>
    <div>
      <div class="stats-row txt-tiny" style:color="var(--color-foreground-dim)">
        <Icon name="issue" />
        {project.meta.issues.open} ·
        <Icon name="patch" />
        {project.meta.patches.open}
        {#await api.repo.getCommitBySha(repo.rid, project.meta.head) then { commit }}
          <span
            style:overflow="hidden"
            style:text-overflow="ellipsis"
            title={absoluteTimestamp(commit.committer.time)}>
            · Updated {formatTimestamp(commit.committer.time)}
          </span>
        {/await}
        <span class="global-flex-item" style:margin-left="auto">
          <Id id={repo.rid} title={repo.rid}>
            <span style:font-size="var(--font-size-tiny)">
              {formatRepositoryId(repo.rid)}
            </span>
          </Id>
        </span>
      </div>
    </div>
  </div>
</Link>
