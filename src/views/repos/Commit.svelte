<script lang="ts">
  import type { BaseUrl, Commit, Repo, SeedingPolicy } from "@http-client";

  import dompurify from "dompurify";
  import escape from "lodash/escape";
  import { baseUrlToString, formatObjectId } from "@app/lib/utils";

  import Button from "@app/components/Button.svelte";
  import Changeset from "@app/views/repos/Changeset.svelte";
  import CommitAuthorship from "@app/views/repos/Commit/CommitAuthorship.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Id from "@app/components/Id.svelte";
  import InlineTitle from "@app/views/repos/components/InlineTitle.svelte";
  import Layout from "./Layout.svelte";
  import Link from "@app/components/Link.svelte";
  import Separator from "./Separator.svelte";
  import Share from "./Share.svelte";

  export let baseUrl: BaseUrl;
  export let seedingPolicy: SeedingPolicy;
  export let commit: Commit;
  export let repo: Repo;
  export let nodeAvatarUrl: string | undefined;

  let enabledArchiveDownload = false;

  void fetch(
    `${baseUrlToString(baseUrl)}/raw/${repo.rid}/${commit.commit.id}.tar.gz`,
    {
      method: "HEAD",
    },
  ).then(response => {
    enabledArchiveDownload = response.ok;
  });

  $: header = commit.commit;

  function convertUrlsToExternalLinks(text: string): string {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(
      urlRegex,
      '<radicle-external-link href="$1">$1</radicle-external-link>',
    );
  }
</script>

<style>
  .commit {
    background-color: var(--color-background-float);
  }
  .header {
    padding: 1rem;
    border-radius: var(--border-radius-small);
    border-bottom: 1px solid var(--color-border-hint);
  }
  .title {
    display: flex;
    align-items: center;
    font-weight: var(--font-weight-semibold);
  }
  .description {
    font-family: var(--font-family-monospace);
    white-space: pre-wrap;
    margin-top: 1.5rem;
  }
  .button-container {
    margin-left: auto;
    display: flex;
    gap: 0.5rem;
  }
</style>

<Layout {nodeAvatarUrl} {seedingPolicy} {baseUrl} {repo}>
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
    <Separator />
    <span class="id">
      <div class="global-hide-on-small-desktop-down">
        {commit.commit.id}
      </div>
      <div class="global-hide-on-medium-desktop-up">
        {formatObjectId(commit.commit.id)}
      </div>
    </span>
  </svelte:fragment>
  <div class="commit">
    <div class="header">
      <div style="display:flex; flex-direction: column; gap: 0.5rem;">
        <span class="title">
          <InlineTitle fontSize="large" content={header.summary} />
          <div class="button-container">
            <Link
              route={{
                resource: "repo.source",
                repo: repo.rid,
                node: baseUrl,
                path: "/",
                revision: commit.commit.id,
              }}>
              <Button variant="outline" title="Browse repo at this commit">
                <Icon name="chevron-left-right" />
              </Button>
            </Link>
            {#if enabledArchiveDownload}
              <a
                href={`${baseUrlToString(baseUrl)}/raw/${repo.rid}/${commit.commit.id}.tar.gz`}>
                <Button variant="outline">
                  <Icon name="archive" />Download
                </Button>
              </a>
            {/if}
            <Share />
          </div>
        </span>
        <CommitAuthorship {header}>
          <Id id={header.id} style="commit" ariaLabel="commit-id" />
        </CommitAuthorship>
        <span class="txt-small">
          {header.parents.length === 1 ? "Parent" : "Parents"}:
          {#each header.parents as parent, i}
            {i > 0 ? " + " : ""}
            <Link
              styleHoverState
              route={{
                resource: "repo.commit",
                repo: repo.rid,
                node: baseUrl,
                commit: parent,
              }}>
              <span class="global-commit">{formatObjectId(parent)}</span>
            </Link>
          {/each}
        </span>
      </div>
      {#if header.description}
        <pre class="description txt-small">{@html dompurify.sanitize(
            convertUrlsToExternalLinks(escape(header.description)),
          )}</pre>
      {/if}
    </div>
    <Changeset
      {baseUrl}
      repoId={repo.rid}
      files={commit.files}
      diff={commit.diff}
      revision={commit.commit.id} />
  </div>
</Layout>
