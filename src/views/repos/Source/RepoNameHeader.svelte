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
    <span class="txt-overflow">
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
    <Id shorten={false} id={repo.rid} ariaLabel="repo-id" />
  </div>
</div>
<div class="description" use:twemoji>
  {@html render(project.data.description)}
</div>
