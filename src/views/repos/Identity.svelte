<script lang="ts">
  import type { BaseUrl, Repo } from "@http-client";

  import { formatRepositoryId } from "@app/lib/utils";

  import Badge from "@app/components/Badge.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Id from "@app/components/Id.svelte";
  import Layout from "./Layout.svelte";
  import Link from "@app/components/Link.svelte";
  import NodeId from "@app/components/NodeId.svelte";
  import Separator from "./Separator.svelte";

  export let baseUrl: BaseUrl;
  export let repo: Repo;
  export let repoId: string;
  export let nodeId: string;
  export let nodeAvatarUrl: string | undefined;

  $: project = repo.payloads["xyz.radicle.project"].data;
  $: rules = Object.entries(
    repo.payloads["xyz.radicle.crefs"]?.data.rules ?? {},
  );
  $: majority = Math.floor(repo.delegates.length / 2) + 1;
  $: aliases = new Map(repo.delegates.map(d => [d.id, d.alias]));
</script>

<style>
  .identity {
    max-width: 80rem;
    padding: 1.5rem 1rem;
  }
  .title {
    font: var(--txt-heading-m);
    color: var(--color-text-primary);
    margin: 0 0 0.5rem;
  }
  .section {
    padding: 0.875rem 0;
  }
  .section + .section {
    border-top: 1px solid var(--color-border-subtle);
  }
  .section-head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.625rem;
  }
  .section-title {
    font: var(--txt-body-m-medium);
    color: var(--color-text-primary);
    margin: 0;
  }
  .note {
    font: var(--txt-body-m-regular);
    color: var(--color-text-tertiary);
  }
  .delegates {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    height: 2rem;
    padding: 0 0.5rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--border-radius-sm);
  }
  .fields {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    column-gap: 2rem;
    row-gap: 0.5rem;
    align-items: baseline;
    font: var(--txt-body-m-regular);
  }
  .label {
    color: var(--color-text-tertiary);
  }
  .value {
    min-width: 0;
    color: var(--color-text-primary);
    overflow-wrap: anywhere;
  }
  .inline-list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
  .mono {
    font: var(--txt-code-regular);
  }
  .rule + .rule {
    margin-top: 0.625rem;
  }
  .rule-pattern {
    font: var(--txt-code-regular);
    color: var(--color-text-primary);
    overflow-wrap: anywhere;
  }
  .rule-detail {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem;
    margin-top: 0.125rem;
    font: var(--txt-body-m-regular);
    color: var(--color-text-tertiary);
  }
  .empty {
    font: var(--txt-body-m-regular);
    color: var(--color-text-tertiary);
  }
  @media (max-width: 719.98px) {
    .fields {
      grid-template-columns: minmax(0, 1fr);
      row-gap: 0.25rem;
    }
    .label:not(:first-child) {
      margin-top: 0.5rem;
    }
  }
</style>

<Layout {baseUrl} {nodeId} {nodeAvatarUrl} {repo} {repoId}>
  <svelte:fragment slot="breadcrumb">
    <Separator />
    <Link route={{ resource: "repo.identity", repo: repoId, node: baseUrl }}>
      Identity
    </Link>
  </svelte:fragment>

  <div class="identity">
    <h1 class="title">Identity document</h1>

    <div class="section">
      <div class="section-head">
        <h2 class="section-title">Delegates</h2>
        <span class="note">
          {majority} of {repo.delegates.length} must sign to change this document
        </span>
      </div>
      <div class="delegates">
        {#each repo.delegates as delegate (delegate.id)}
          <div class="chip">
            <NodeId {baseUrl} nodeId={delegate.id} alias={delegate.alias} />
          </div>
        {/each}
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <h2 class="section-title">Document</h2>
      </div>
      <div class="fields">
        <span class="label">Default branch</span>
        <span class="value mono">{project.defaultBranch}</span>
        <span class="label">Visibility</span>
        <span class="value">
          {#if repo.visibility.type === "private"}
            <Badge variant="private" size="tiny">
              <Icon name="lock" />
              Private
            </Badge>
          {:else}
            Public
          {/if}
        </span>
        {#if repo.visibility.type === "private" && repo.visibility.allow?.length}
          <span class="label">Also visible to</span>
          <span class="value inline-list">
            {#each repo.visibility.allow as peer (peer)}
              <NodeId {baseUrl} nodeId={peer} alias={aliases.get(peer)} />
            {/each}
          </span>
        {/if}
        <span class="label">Default branch threshold</span>
        <span class="value">
          {repo.threshold} of {repo.delegates.length}
          <span class="note">
            delegates whose {project.defaultBranch} branch must contain the same commit
            for it to become canonical
          </span>
        </span>
        <span class="label">Repository ID</span>
        <span class="value">
          <Id shorten={false} id={repo.rid} ariaLabel="repo-id">
            {formatRepositoryId(repo.rid)}
          </Id>
        </span>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <h2 class="section-title">Canonical refs</h2>
      </div>
      {#each rules as [pattern, rule] (pattern)}
        <div class="rule">
          <div class="rule-pattern">{pattern}</div>
          <div class="rule-detail">
            {#if rule.allow === "delegates"}
              <span>
                Canonical once {rule.threshold} of {repo.delegates.length}
                {repo.delegates.length === 1 ? "delegate" : "delegates"}
                {rule.threshold === 1 ? "agrees" : "agree"}
              </span>
            {:else if rule.allow.length === 1}
              <span>Canonical as published by</span>
              <NodeId
                {baseUrl}
                nodeId={rule.allow[0]}
                alias={aliases.get(rule.allow[0])} />
            {:else}
              <span>
                Canonical once {rule.threshold} of these {rule.allow.length}
                peers {rule.threshold === 1 ? "agrees" : "agree"}:
              </span>
              {#each rule.allow as peer (peer)}
                <NodeId {baseUrl} nodeId={peer} alias={aliases.get(peer)} />
              {/each}
            {/if}
          </div>
        </div>
      {:else}
        <div class="empty">No canonical refs rules.</div>
      {/each}
    </div>
  </div>
</Layout>
