<script lang="ts">
  import type { BaseUrl, Repo, SeedingPolicy, Tree } from "@http-client";
  import type { BlobResult, RepoRoute } from "./router";

  import { HttpdClient } from "@http-client";
  import { tick } from "svelte";

  import {
    formatQualifiedRefname,
    safeDecodeURIComponent,
  } from "@app/lib/utils";

  import BlobComponent from "./Source/Blob.svelte";
  import Button from "@app/components/Button.svelte";
  import CloneButton from "@app/views/repos/Header/CloneButton.svelte";
  import FilePath from "@app/components/FilePath.svelte";
  import Header from "./Source/Header.svelte";
  import Layout from "./Layout.svelte";
  import PathBreadcrumb from "./Source/PathBreadcrumb.svelte";
  import Placeholder from "@app/components/Placeholder.svelte";
  import RepoNameHeader from "./Source/RepoNameHeader.svelte";
  import Separator from "./Separator.svelte";
  import TreeComponent from "./Source/Tree.svelte";

  export let baseUrl: BaseUrl;
  export let blobResult: BlobResult;
  export let commit: string;
  export let path: string;
  export let peer: string | undefined;
  export let repo: Repo;
  export let repoId: string;
  export let rawPath: (commit?: string) => string;
  export let revision: string | undefined;
  export let seedingPolicy: SeedingPolicy;
  export let tree: Tree;
  export let nodeId: string;
  export let nodeAvatarUrl: string | undefined;

  const mobileTreeLimit = 6;

  let showAllEntries = false;
  let animatingTree = false;
  let mobileTreeElement: HTMLElement | undefined = undefined;
  let folderTree: Tree | undefined = undefined;

  async function loadFolderTree(folderPath: string, blobLoaded: boolean) {
    folderTree = undefined;
    if (folderPath === "/" || blobLoaded) {
      return;
    }
    const result = await api.repo
      .getTree(repo.rid, tree.lastCommit.id, `${folderPath}/`)
      .catch(() => undefined);
    if (folderPath === path) {
      folderTree = result;
    }
  }

  async function toggleShowAll() {
    if (
      typeof document.startViewTransition !== "function" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      showAllEntries = !showAllEntries;
      return;
    }
    animatingTree = true;
    await tick();
    const transition = document.startViewTransition(async () => {
      showAllEntries = !showAllEntries;
      await tick();
      if (!showAllEntries) {
        mobileTreeElement?.scrollIntoView({ block: "nearest" });
      }
    });
    await transition.finished.finally(() => {
      animatingTree = false;
    });
  }

  const api = new HttpdClient(baseUrl);

  const fetchTree = async (path: string) => {
    return api.repo.getTree(repo.rid, tree.lastCommit.id, path).catch(() => {
      blobResult = {
        ok: false,
        error: {
          message: "Not able to expand directory",
          path,
        },
      };
      return undefined;
    });
  };

  // The revision carries the encoded branch name after an in-app navigation,
  // and this refname reaches the user as part of the clone popover's archive
  // command.
  $: currentRefname = formatQualifiedRefname(
    revision
      ? safeDecodeURIComponent(revision)
      : repo.payloads["xyz.radicle.project"].data.defaultBranch,
    peer,
  );

  $: isFolder = folderTree !== undefined;
  $: void loadFolderTree(path, blobResult.ok);
  $: mobileTree = path === "/" ? tree : folderTree;
  $: if (path) {
    showAllEntries = false;
  }

  $: baseRoute = {
    resource: "repo.source",
    node: baseUrl,
    repo: repoId,
    path: "/",
  } as Extract<RepoRoute, { resource: "repo.source" }>;
</script>

<style>
  .center-content {
    margin: 0 auto;
  }

  .container {
    display: flex;
    width: inherit;
    padding: 0;
  }

  .column-left {
    display: flex;
    flex-direction: column;
    padding-right: 0.5rem;
    border-right: 1px solid var(--color-border-subtle);
  }

  .column-right {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding-bottom: 2.5rem;
    /* To allow pre elements to shrink when overflowing */
    min-width: 0;
  }
  .placeholder {
    width: 100%;
    padding: 4rem 0;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--border-radius-sm);
  }

  .subheader {
    padding: 1rem;
    border-bottom: 1px solid var(--color-border-subtle);
  }
  @media (max-width: 1010.98px) {
    .subheader.tree-below {
      border-bottom: 0;
    }
  }
  .mobile-tree {
    margin: 0 1rem 1rem;
    padding: 0.25rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--border-radius-sm);
  }
  .mobile-tree.animating {
    view-transition-name: mobile-file-tree;
  }
  .container.animating {
    view-transition-name: source-content;
  }
  .animating .show-all {
    view-transition-name: mobile-file-tree-toggle;
  }
  :global(:has(.mobile-tree.animating)) {
    overflow-anchor: none;
  }
  :global(::view-transition-group(mobile-file-tree)),
  :global(::view-transition-group(mobile-file-tree-toggle)),
  :global(::view-transition-group(source-content)) {
    animation-duration: 0.25s;
    animation-timing-function: ease-out;
  }
  :global(::view-transition-group(mobile-file-tree)) {
    overflow: clip;
  }
  :global(::view-transition-old(mobile-file-tree)),
  :global(::view-transition-new(mobile-file-tree)) {
    height: auto;
    inset-block-start: 0;
  }
  .show-all {
    padding: 0.25rem;
  }
  .mobile-blob-path {
    flex: 1;
    min-width: 0;
  }
  :global(.left:has(> .mobile-blob-path)) {
    flex: 1;
    min-width: 0;
  }
  .mobile-path {
    padding: 0 1rem 1rem;
  }

  .source-tree {
    overflow-x: hidden;
    width: 17.5rem;
    padding-right: 0.25rem;
  }
  .sticky {
    position: sticky;
    top: 0rem;
    max-height: calc(100vh - 5.5rem);
  }
  @media (max-width: 719.98px) {
    .container {
      display: flex;
      width: inherit;
      padding: 0;
    }
    .placeholder {
      border-radius: 0;
      border-left: 0;
      border-right: 0;
    }
  }
</style>

<Layout
  {baseUrl}
  {nodeId}
  {nodeAvatarUrl}
  {repo}
  {repoId}
  activeTab="source"
  stylePaddingBottom="0">
  <svelte:fragment slot="breadcrumb">
    {#if path !== "/"}
      <Separator />
      <FilePath filenameWithPath={path} />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="actions">
    <CloneButton
      {baseUrl}
      {currentRefname}
      id={repo.rid}
      alias={repo.alias}
      name={repo.payloads["xyz.radicle.project"].data.name} />
  </svelte:fragment>
  <RepoNameHeader {repo} {repoId} {baseUrl} {seedingPolicy} slot="header" />

  <div
    class="subheader"
    class:tree-below={tree.entries.length > 0}
    slot="subheader">
    <Header
      filesLinkActive={true}
      historyLinkActive={false}
      node={baseUrl}
      {commit}
      {baseRoute}
      {peer}
      {repo}
      {repoId}
      {revision}
      {tree} />
  </div>
  <div class="global-hide-on-medium-desktop-up">
    {#if isFolder}
      <div class="mobile-path">
        <PathBreadcrumb
          {baseUrl}
          {path}
          {peer}
          {repoId}
          repoName={repo.payloads["xyz.radicle.project"].data.name}
          {revision} />
      </div>
    {/if}
    {#if mobileTree && mobileTree.entries.length > 0}
      <div
        class="mobile-tree"
        class:animating={animatingTree}
        bind:this={mobileTreeElement}>
        <TreeComponent
          {repoId}
          {revision}
          {baseUrl}
          {fetchTree}
          {path}
          {peer}
          tree={mobileTree}
          limit={showAllEntries ? undefined : mobileTreeLimit} />
        {#if mobileTree.entries.length > mobileTreeLimit}
          <div class="show-all">
            <Button styleWidth="100%" variant="gray" on:click={toggleShowAll}>
              {showAllEntries
                ? "Show less"
                : `Show all ${mobileTree.entries.length}`}
            </Button>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="container center-content" class:animating={animatingTree}>
    {#if tree.entries.length > 0}
      <div class="column-left global-hide-on-small-desktop-down">
        <div class="source-tree sticky">
          <TreeComponent
            {repoId}
            {revision}
            {baseUrl}
            {fetchTree}
            {path}
            {peer}
            {tree} />
        </div>
      </div>
      <div class="column-right">
        {#if blobResult.ok}
          <BlobComponent
            {path}
            {baseUrl}
            {repoId}
            blob={blobResult.blob}
            highlighted={blobResult.highlighted}
            rawPath={rawPath(tree.lastCommit.id)}>
            <svelte:fragment slot="path">
              {#if path === "/"}
                <FilePath filenameWithPath={blobResult.blob.path} />
              {:else}
                <span class="global-hide-on-small-desktop-down">
                  <FilePath filenameWithPath={blobResult.blob.path} />
                </span>
                <div class="mobile-blob-path global-hide-on-medium-desktop-up">
                  <PathBreadcrumb
                    {baseUrl}
                    {path}
                    {peer}
                    {repoId}
                    repoName={repo.payloads["xyz.radicle.project"].data.name}
                    {revision} />
                </div>
              {/if}
            </svelte:fragment>
          </BlobComponent>
        {:else if blobResult.error.status === 413}
          <div class="placeholder">
            <Placeholder
              iconName="exclamation-circle"
              caption="This file is too big to be displayed.
              If you want to view this file, clone this repository locally." />
          </div>
        {:else if path === "/"}
          <div class="placeholder">
            <Placeholder iconName="no-file" caption="No README found." />
          </div>
        {:else if isFolder}
          <div class="placeholder global-hide-on-small-desktop-down">
            <Placeholder
              iconName="no-file"
              caption="Select a file to view it." />
          </div>
        {:else}
          <div class="placeholder">
            <Placeholder iconName="no-file" caption="File not found." />
          </div>
        {/if}
      </div>
    {:else}
      <div class="placeholder">
        <Placeholder iconName="no-file" caption="No files at this revision." />
      </div>
    {/if}
  </div>
</Layout>
