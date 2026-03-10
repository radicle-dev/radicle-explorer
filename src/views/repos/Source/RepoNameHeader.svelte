<script lang="ts">
  import type { BaseUrl, Repo } from "@http-client";

  import dompurify from "dompurify";
  import { markdown } from "@app/lib/markdown";
  import { baseUrlToString, twemoji } from "@app/lib/utils";

  import Badge from "@app/components/Badge.svelte";
  import CloneButton from "@app/views/repos/Header/CloneButton.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Id from "@app/components/Id.svelte";
  import Link from "@app/components/Link.svelte";
  import SeedButton from "@app/views/repos/Header/SeedButton.svelte";
  import Share from "@app/views/repos/Share.svelte";

  export let repo: Repo;
  export let baseUrl: BaseUrl;
  export let currentRefname: string;

  let enabledArchiveDownload = false;

  void fetch(
    `${baseUrlToString(baseUrl)}/raw/${repo.rid}/archive/${currentRefname}`,
    {
      method: "HEAD",
    },
  ).then(response => {
    enabledArchiveDownload = response.ok;
  });

  function render(content: string): string {
    return dompurify.sanitize(
      markdown({ linkify: true, emojis: true }).parseInline(content) as string,
    );
  }

  $: project = repo.payloads["xyz.radicle.project"];
</script>

<style>
  .title {
    align-items: center;
    gap: 0.5rem;
    color: var(--color-text-primary);
    display: flex;
    font: var(--txt-heading-l);
    justify-content: left;
    text-align: left;
    text-overflow: ellipsis;
    padding: 1rem 1rem 0 1rem;
  }
  .description {
    padding: 0 1rem 1rem 1rem;
  }
  .repo-name:hover {
    color: inherit;
  }
  .repo-name-link {
    flex: 1 1 auto;
    min-width: 0;
  }
  .repo-name-link :global(a) {
    display: inline-flex;
    align-items: center;
    border-radius: var(--border-radius-sm);
    line-height: 1.15;
    padding: 0.125rem 0.25rem;
    margin: -0.125rem -0.25rem;
  }
  .repo-name-link :global(a:focus-visible) {
    outline: none !important;
    box-shadow: inset 0 0 0 2px var(--color-border-brand);
  }
  .repo-name {
    display: block;
  }
  .description :global(a) {
    border-bottom: 1px solid var(--color-text-tertiary);
  }
  .description :global(a:hover) {
    border-bottom: 1px solid var(--color-text-primary);
  }
  .id {
    padding-left: 1rem;
  }
  .title-container {
    display: flex;
    flex-direction: column;
    gap: 0rem;
    margin-bottom: 1rem;
  }
</style>

<div class="title-container">
  <div class="title">
    <span class="repo-name-link">
      <Link
        route={{
          resource: "repo.source",
          repo: repo.rid,
          node: baseUrl,
        }}>
        <span class="repo-name">
          {project.data.name}
        </span>
      </Link>
    </span>
    {#if repo.visibility.type === "private"}
      <Badge variant="private" size="tiny">
        <Icon name="lock" />
        Private
      </Badge>
    {/if}
    <div style="margin-left: auto; display: flex; gap: 0.5rem;">
      <Share />
      <div
        style:display="flex"
        style:gap="0.5rem"
        class="global-hide-on-mobile-down">
        <CloneButton
          {enabledArchiveDownload}
          {baseUrl}
          {currentRefname}
          id={repo.rid}
          name={project.data.name} />
        <SeedButton seedCount={repo.seeding} repoId={repo.rid} />
      </div>
      <div
        style:display="flex"
        style:gap="0.5rem"
        class="global-hide-on-small-desktop-up">
        <SeedButton disabled seedCount={repo.seeding} repoId={repo.rid} />
      </div>
    </div>
  </div>
  <div class="id">
    <Id shorten={false} id={repo.rid} ariaLabel="repo-id" focusable={false} />
  </div>
</div>
<div class="description" use:twemoji>
  {@html render(project.data.description)}
</div>
