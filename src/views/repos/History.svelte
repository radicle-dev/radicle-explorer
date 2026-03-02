<script lang="ts">
  import type {
    BaseUrl,
    CommitHeader,
    Repo,
    Remote,
    SeedingPolicy,
    Tree,
  } from "@http-client";
  import type { RepoRoute } from "./router";

  import config from "@app/lib/config";
  import { HttpdClient } from "@http-client";
  import { baseUrlToString, formatQualifiedRefname } from "@app/lib/utils";
  import { groupCommits } from "@app/lib/commit";

  import Button from "@app/components/Button.svelte";
  import CommitTeaser from "./Commit/CommitTeaser.svelte";
  import ErrorMessage from "@app/components/ErrorMessage.svelte";
  import Header from "./Source/Header.svelte";
  import Layout from "./Layout.svelte";
  import Link from "@app/components/Link.svelte";
  import List from "@app/components/List.svelte";
  import Loading from "@app/components/Loading.svelte";
  import RepoNameHeader from "./Source/RepoNameHeader.svelte";
  import Separator from "./Separator.svelte";

  export let baseUrl: BaseUrl;
  export let seedingPolicy: SeedingPolicy;
  export let commit: string;
  export let commitHeaders: CommitHeader[];
  export let peer: string | undefined;
  export let peers: Remote[];
  export let repo: Repo;
  export let revision: string | undefined;
  export let tree: Tree;
  export let nodeAvatarUrl: string | undefined;

  const api = new HttpdClient(baseUrl);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let error: any;
  let page = 0;
  let loading = false;
  let allCommitHeaders: CommitHeader[];

  $: baseRoute = {
    resource: "repo.history",
    node: baseUrl,
    repo: repo.rid,
  } as Extract<RepoRoute, { resource: "repo.history" }>;
  $: {
    allCommitHeaders = commitHeaders;
    page = 0;
  }

  async function loadMore() {
    loading = true;
    page += 1;
    try {
      const response = await api.repo.getAllCommits(repo.rid, {
        parent: allCommitHeaders[0].id,
        page,
        perPage: config.source.commitsPerPage,
      });
      allCommitHeaders = [...allCommitHeaders, ...response];
    } catch (e) {
      error = e;
    }
    loading = false;
  }
</script>

<style>
  .more {
    margin-top: 2rem;
    min-height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .group-header {
    margin-left: 1rem;
    margin-top: 3rem;
    margin-bottom: 1rem;
    font: var(--txt-body-m-regular);
    color: var(--color-text-tertiary);
  }
  .group-header:first-child {
    margin-top: 0;
  }
</style>

<Layout {nodeAvatarUrl} {seedingPolicy} {baseUrl} {repo} activeTab="source">
  <svelte:fragment slot="breadcrumb">
    <Separator />
    <Link
      route={{
        resource: "repo.history",
        repo: repo.rid,
        node: baseUrl,
      }}>
      Commits
    </Link>
  </svelte:fragment>
  <RepoNameHeader
    {repo}
    currentRefname={formatQualifiedRefname(
      revision || repo.payloads["xyz.radicle.project"].data.defaultBranch,
      peer,
    )}
    {baseUrl}
    slot="header" />

  <div style:margin="1rem" slot="subheader">
    <Header
      {baseRoute}
      {commit}
      {peers}
      {peer}
      {repo}
      {revision}
      {tree}
      node={baseUrl}
      filesLinkActive={false}
      historyLinkActive={true} />
  </div>

  <div>
    {#each groupCommits(allCommitHeaders) as group (group.time)}
      <div class="group-header">{group.date}</div>
      <List items={group.commits}>
        <CommitTeaser
          slot="item"
          let:item
          repoId={repo.rid}
          {baseUrl}
          commit={item} />
      </List>
    {/each}
  </div>

  {#await api.repo.getTreeStatsBySha(repo.rid, commit)}
    <div class="more">
      <Loading small center />
    </div>
  {:then stats}
    {#if loading || allCommitHeaders.length < stats.commits}
      <div class="more">
        {#if loading}
          <Loading small={page !== 0} center />
        {:else if allCommitHeaders.length < stats.commits}
          <Button size="large" variant="outline" on:click={loadMore}>
            More
          </Button>
        {/if}
      </div>
    {/if}

    {#if error}
      <div class="message">
        <ErrorMessage
          title="Couldn't load commits"
          description="Make sure you are able to connect to the seed <code>{baseUrlToString(
            api.baseUrl,
          )}</code>"
          {error} />
      </div>
    {/if}
  {:catch error}
    <div class="message">
      <ErrorMessage
        title="Couldn't load repo stats"
        description="Make sure you are able to connect to the seed <code>{baseUrlToString(
          api.baseUrl,
        )}</code>"
        {error} />
    </div>
  {/await}
</Layout>
