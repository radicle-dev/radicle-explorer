<script lang="ts">
  import type { RepoRoute } from "../router";
  import type { BaseUrl, Repo, Remote, Tree } from "@http-client";
  import type { ComponentProps } from "svelte";

  import { HttpdClient } from "@http-client";

  import Button from "@app/components/Button.svelte";
  import CommitButton from "../components/CommitButton.svelte";
  import Icon from "@app/components/Icon.svelte";
  import JobCob from "@app/components/JobCob.svelte";
  import Link from "@app/components/Link.svelte";
  import Loading from "@app/components/Loading.svelte";
  import PeerBranchSelector from "./PeerBranchSelector.svelte";

  export let commit: string;
  export let filesLinkActive: boolean;
  export let historyLinkActive: boolean;
  export let node: BaseUrl;
  export let peer: string | undefined;
  export let peers: Remote[];
  export let repo: Repo;
  export let baseRoute: Extract<
    RepoRoute,
    { resource: "repo.source" } | { resource: "repo.history" }
  >;
  export let revision: string | undefined;
  export let tree: Tree;

  const api = new HttpdClient(node);
  let selectedBranch: string | undefined;
  let commitButtonVariant: ComponentProps<CommitButton>["variant"] | undefined =
    undefined;

  // Revision may be a commit ID, a branch name or `undefined` which means the
  // default branch. We assign `selectedBranch` accordingly.
  $: if (revision === lastCommit.id) {
    selectedBranch = undefined;
  } else {
    selectedBranch =
      revision || repo.payloads["xyz.radicle.project"].data.defaultBranch;
  }

  $: lastCommit = tree.lastCommit;
  $: onCanonical = Boolean(
    !peer &&
      selectedBranch ===
        repo.payloads["xyz.radicle.project"].data.defaultBranch,
  );
  $: if (onCanonical) {
    commitButtonVariant = "right";
  } else if (!selectedBranch) {
    commitButtonVariant = "left";
  } else {
    commitButtonVariant = "center";
  }
</script>

<style>
  .top-header {
    display: flex;
    align-items: center;
    justify-content: left;
    row-gap: 0.5rem;
    gap: 1px;
    flex-wrap: wrap;
    margin-bottom: 2rem;
  }

  .header {
    font-size: var(--font-size-tiny);
    display: flex;
    gap: 0.375rem;
    align-items: center;
    justify-content: left;
    flex-wrap: wrap;
    position: relative;
  }
  .header::after {
    content: "";
    position: absolute;
    left: -1rem;
    bottom: 0;
    border-bottom: 1px solid var(--color-fill-separator);
    width: calc(100% + 1rem);
    z-index: -1;
  }

  .counter {
    border-radius: var(--border-radius-tiny);
    background-color: var(--color-fill-ghost);
    color: var(--color-foreground-dim);
    padding: 0 0.25rem;
  }

  .title-counter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .selected {
    background-color: var(--color-fill-ghost);
    color: var(--color-foreground-contrast);
  }
</style>

<div class="top-header">
  {#if selectedBranch}
    <PeerBranchSelector
      {peers}
      {peer}
      {baseRoute}
      {onCanonical}
      {repo}
      {selectedBranch} />
  {/if}
  <div class="global-flex-item txt-overflow" style:gap="1px">
    <CommitButton
      variant={commitButtonVariant}
      styleMinWidth="0"
      styleWidth="100%"
      hideSummaryOnMobile={false}
      repoId={repo.rid}
      commit={lastCommit}
      baseUrl={node} />
    {#if !onCanonical}
      <Link route={baseRoute}>
        <Button
          variant="not-selected"
          styleBorderRadius="0 var(--border-radius-tiny) var(--border-radius-tiny) 0">
          <Icon name="cross" />
        </Button>
      </Link>
    {/if}
  </div>
  <JobCob
    baseUrl={node}
    repoClient={api.repo}
    rid={repo.rid}
    commit={lastCommit.id}
    stylePopoverPositionTop="0.5rem"
    stylePopoverPositionLeft="0" />
</div>

<div class="header">
  <div style="display: flex; gap: 0.375rem;">
    <Link
      route={{
        resource: "repo.source",
        repo: repo.rid,
        node: node,
        peer,
        revision,
      }}>
      <Button size="large" variant={filesLinkActive ? "tab-active" : "tab"}>
        <Icon name="file" />Files
      </Button>
    </Link>

    <Link
      route={{
        resource: "repo.history",
        repo: repo.rid,
        node: node,
        peer,
        revision,
      }}>
      <Button size="large" variant={historyLinkActive ? "tab-active" : "tab"}>
        <Icon name="commit" />
        <div class="title-counter">
          Commits
          {#await api.repo.getTreeStatsBySha(repo.rid, commit)}
            <Loading small center noDelay grayscale />
          {:then stats}
            <div class="counter" class:selected={historyLinkActive}>
              {stats.commits}
            </div>
          {/await}
        </div>
      </Button>
    </Link>
  </div>
</div>
