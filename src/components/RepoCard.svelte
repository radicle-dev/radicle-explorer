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
  import Icon from "@app/components/Icon.svelte";
  import Id from "@app/components/Id.svelte";
  import Link from "@app/components/Link.svelte";
  import RepoAvatar from "@app/components/RepoAvatar.svelte";

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
    background-color: var(--color-surface-canvas);
    padding: 1rem;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border: 1px solid var(--color-border-subtle);
    margin-top: -1px;
    margin-left: -1px;
  }

  .repo-card.compact {
    height: 8rem;
  }

  .repo-card:hover {
    background-color: var(--color-surface-subtle);
  }

  .activity {
    position: absolute;
    bottom: 3.2rem;
    right: 1rem;
    max-width: 22rem;
  }

  .headline-and-badges {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
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

  .stats-row {
    position: relative;
    display: flex;
    gap: 0.25rem;
    height: 1.5rem;
    align-items: center;
    white-space: nowrap;
  }

  .icon {
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-brand-bg);
    color: var(--color-text-on-brand);
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
      <ActivityDiagram
        id={repo.rid}
        viewBoxHeight={100}
        styleColor="var(--color-surface-brand-primary)"
        activity={repoInfo.activity} />
    </div>
    <div style:position="relative">
      <div class="headline-and-badges txt-overflow">
        <div class="icon">
          <RepoAvatar
            rid={repoInfo.repo.rid}
            name={project.data.name}
            styleWidth="1.5rem" />
        </div>
        <div class="txt-body-l-semibold" use:twemoji>{project.data.name}</div>
        <div class="badges" style:margin-left="auto">
          {#if isPrivate}
            <div
              title="Private"
              class="badge"
              style="background-color: var(--color-feedback-warning-bg); color: var(--color-feedback-warning-text)">
              <Icon name="lock" />
            </div>
          {/if}
          <slot name="delegate" />
        </div>
      </div>
      <div class="txt-body-m-regular" use:twemoji>
        {project.data.description}
      </div>
      <span class="global-flex" style:text-overflow="ellipsis">
        <Id id={repo.rid} title={repo.rid}>
          {formatRepositoryId(repo.rid)}
        </Id>
      </span>
    </div>
    <div>
      <div
        class="stats-row txt-code-regular"
        style:color="var(--color-text-tertiary)">
        <Icon name="seed" />
        {repoInfo.repo.seeding} ·
        <Icon name="issue" />
        {project.meta.issues.open} ·
        <Icon name="patch" />
        {project.meta.patches.open}
        {#await api.repo.getCommitBySha(repo.rid, project.meta.head) then { commit }}
          <span
            class="txt-body-m-regular"
            style:margin-left="auto"
            style:overflow="hidden"
            style:text-overflow="ellipsis"
            title={absoluteTimestamp(commit.committer.time)}>
            Updated {formatTimestamp(commit.committer.time)}
          </span>
        {/await}
      </div>
    </div>
  </div>
</Link>
