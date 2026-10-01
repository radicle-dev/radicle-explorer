<script lang="ts" context="module">
  export type ActiveTab =
    "files" | "commits" | "issues" | "patches" | "releases" | undefined;

  // Cache commit counts across component remounts (tab navigation).
  const commitCountCache: Record<string, number> = {};
</script>

<script lang="ts">
  import type { BaseUrl, Repo } from "@http-client";

  import { HttpdClient } from "@http-client";

  import Button from "@app/components/Button.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Link from "@app/components/Link.svelte";

  export let baseUrl: BaseUrl;
  export let activeTab: ActiveTab = undefined;
  export let repo: Repo;
  export let repoId: string;
  export let commit: string | undefined = undefined;
  export let peer: string | undefined = undefined;
  export let revision: string | undefined = undefined;

  const api = new HttpdClient(baseUrl);
  let commitCount: number | undefined = undefined;

  function fetchCommitCount(rid: string, sha: string) {
    const cached = commitCountCache[sha];
    if (cached !== undefined) {
      commitCount = cached;
    } else {
      commitCount = undefined;
      void api.repo.getCommitCountBySha(rid, sha).then(commits => {
        commitCountCache[sha] = commits;
        if (sha === countedCommit) {
          commitCount = commits;
        }
      });
    }
  }

  $: countedCommit = commit ?? repo.payloads["xyz.radicle.project"].meta.head;
  $: fetchCommitCount(repo.rid, countedCommit);
  $: sourceTab = activeTab === "files" || activeTab === "commits";
</script>

<style>
  .container {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.25rem;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .counter {
    border-radius: var(--border-radius-sm);
    background-color: var(--color-surface-mid);
    color: var(--color-text-tertiary);
    padding: 0 0.25rem;
  }

  .selected {
    background-color: var(--color-surface-alpha-subtle);
    color: var(--color-text-primary);
  }

  .hover {
    background-color: var(--color-surface-strong);
    color: var(--color-text-primary);
  }

  .title-counter {
    display: flex;
    gap: 0.5rem;
  }

  @media (max-width: 719.98px) {
    .container {
      padding: 0.75rem 1rem;
      overflow-x: auto;
      scrollbar-width: none;
      white-space: nowrap;
    }
    .container::-webkit-scrollbar {
      display: none;
    }
    .container :global(button svg) {
      display: none;
    }
  }
</style>

<div class="container">
  <Link
    route={{
      resource: "repo.source",
      repo: repoId,
      node: baseUrl,
      peer: sourceTab ? peer : undefined,
      revision: sourceTab ? revision : undefined,
    }}>
    <Button variant={activeTab === "files" ? "gray" : "background"}>
      <Icon name="document" />
      Files
    </Button>
  </Link>

  <Link
    route={{
      resource: "repo.history",
      repo: repoId,
      node: baseUrl,
      peer: sourceTab ? peer : undefined,
      revision: sourceTab ? revision : undefined,
    }}>
    <Button let:hover variant={activeTab === "commits" ? "gray" : "background"}>
      <Icon name="commit" />
      <div class="title-counter">
        Commits
        {#if commitCount !== undefined}
          <span
            class="counter"
            class:selected={activeTab === "commits"}
            class:hover={hover && activeTab !== "commits"}>
            {commitCount}
          </span>
        {/if}
      </div>
    </Button>
  </Link>

  <Link
    route={{
      resource: "repo.issues",
      repo: repoId,
      node: baseUrl,
    }}>
    <Button let:hover variant={activeTab === "issues" ? "gray" : "background"}>
      <Icon name="issue" />
      <div class="title-counter">
        Issues
        <span
          class="counter"
          class:selected={activeTab === "issues"}
          class:hover={hover && activeTab !== "issues"}>
          {repo.payloads["xyz.radicle.project"].meta.issues.open}
        </span>
      </div>
    </Button>
  </Link>

  <Link
    route={{
      resource: "repo.patches",
      repo: repoId,
      node: baseUrl,
    }}>
    <Button let:hover variant={activeTab === "patches" ? "gray" : "background"}>
      <Icon name="patch" />
      <div class="title-counter">
        Patches
        <span
          class="counter"
          class:hover={hover && activeTab !== "patches"}
          class:selected={activeTab === "patches"}>
          {repo.payloads["xyz.radicle.project"].meta.patches.open}
        </span>
      </div>
    </Button>
  </Link>

  <!-- Only nodes that report a release count support the release API; hide the
  tab on older nodes where the field is absent. -->
  {#if repo.payloads["xyz.radicle.project"].meta.releases !== undefined}
    <Link
      route={{
        resource: "repo.releases",
        repo: repoId,
        node: baseUrl,
      }}>
      <Button
        let:hover
        variant={activeTab === "releases" ? "gray" : "background"}>
        <Icon name="parcel" />
        <div class="title-counter">
          Releases
          <span
            class="counter"
            class:hover={hover && activeTab !== "releases"}
            class:selected={activeTab === "releases"}>
            {repo.payloads["xyz.radicle.project"].meta.releases}
          </span>
        </div>
      </Button>
    </Link>
  {/if}
</div>
