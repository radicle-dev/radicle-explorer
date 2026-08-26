<script lang="ts">
  import type {
    BaseUrl,
    NodeIdentity,
    NodeStats,
    UserRepo,
  } from "@http-client";
  import type { RepoInfo } from "@app/components/RepoCard";

  import { onDestroy } from "svelte";

  import * as router from "@app/lib/router";
  import * as utils from "@app/lib/utils";
  import { loadRepoActivity } from "@app/lib/commit";
  import { fetchRepoInfos } from "@app/components/RepoCard";
  import { handleError } from "@app/views/nodes/error";

  import Badge from "@app/components/Badge.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Loading from "@app/components/Loading.svelte";
  import Placeholder from "@app/components/Placeholder.svelte";
  import RepoCard from "@app/components/RepoCard.svelte";

  export let baseUrl: BaseUrl;
  export let stats: NodeStats;
  export let user: NodeIdentity;
  export let did: { prefix: string; pubkey: string };
  // The repos this user delegates or has contributed to. Undefined when the
  // node predates the endpoint that reports contributions, in which case only
  // the repos they delegate are listed, as before.
  export let repos: UserRepo[] | undefined = undefined;

  // How many cards are shown before the list is collapsed. Two full rows in the
  // two-column grid, so the activity feed below is reachable without scrolling
  // past a long list.
  const COLLAPSED = 4;

  let expanded = false;

  let activityAbort: AbortController | undefined;

  function newActivitySession(): AbortSignal {
    activityAbort?.abort();
    activityAbort = new AbortController();
    return activityAbort.signal;
  }

  onDestroy(() => activityAbort?.abort());

  $: name = user.alias || utils.formatNodeId(did.pubkey);
  // Contribution counts keyed by RID, for the badge tooltips.
  $: contributions = new Map(
    (repos ?? []).map(repo => [
      repo.rid,
      { patches: repo.patchesAuthored, issues: repo.issuesAuthored },
    ]),
  );
  // Undefined on a node without the contributions endpoint, where the fallback
  // query returns only repos this user delegates.
  $: delegated = repos
    ? new Set(repos.filter(repo => repo.isDelegate).map(repo => repo.rid))
    : undefined;

  $: if (baseUrl || did) {
    expanded = false;
  }

  function repoInfos(repos: UserRepo[], signal: AbortSignal): RepoInfo[] {
    return repos
      .filter(repo => Boolean(repo.payloads["xyz.radicle.project"]))
      .map(repo => ({
        repo,
        baseUrl,
        activity: loadRepoActivity(repo.rid, baseUrl, signal).catch(e => {
          if (import.meta.env.DEV && (e as Error)?.name !== "AbortError") {
            console.warn("loadRepoActivity failed for", repo.rid, e);
          }
          return [];
        }),
      }));
  }

  // The order is the one the node returns: most recently contributed to by this
  // user first, with repos they only delegate last.
  async function fetchRepos(): Promise<RepoInfo[]> {
    const signal = newActivitySession();

    return repos
      ? repoInfos(repos, signal)
      : await fetchRepoInfos(
          baseUrl,
          { show: "all", perPage: stats.repos.total },
          utils.formatDid(did),
          signal,
        );
  }

  function badgeTitle(rid: string, isDelegate: boolean): string {
    const counts = contributions.get(rid);
    const opened =
      counts && counts.patches + counts.issues > 0
        ? `${counts.patches} ${utils.pluralize("patch", counts.patches)} and ${
            counts.issues
          } ${utils.pluralize("issue", counts.issues)} opened by ${name}`
        : undefined;

    if (isDelegate) {
      return opened
        ? `${name} is a delegate of this repository · ${opened}`
        : `${name} is a delegate of this repository`;
    }

    return opened ?? `${name} has contributed to this repository`;
  }
</script>

<style>
  .repo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(32rem, 1fr));
    gap: 0;
  }
  .container {
    display: grid;
    place-items: center;
    min-height: calc(100vh - var(--global-header-height));
    font: var(--txt-body-m-regular);
  }
  /* Matches the header on the activity section below, so the two read as one
     page rather than two stacked widgets. */
  .section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 3rem;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--color-border-subtle);
    color: var(--color-text-primary);
  }
  .counter {
    border-radius: var(--border-radius-sm);
    background-color: var(--color-surface-mid);
    color: var(--color-text-tertiary);
    font: var(--txt-body-s-regular);
    padding: 0 0.25rem;
    min-width: 1.5rem;
    text-align: center;
  }
  .expand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    min-height: 2.5rem;
    padding: 0.375rem 1rem;
    border: none;
    border-bottom: 1px solid var(--color-border-subtle);
    background: none;
    font: var(--txt-body-m-regular);
    color: var(--color-text-secondary);
    cursor: pointer;
  }
  .expand:hover {
    background-color: var(--color-surface-subtle);
    color: var(--color-text-primary);
  }

  @media (max-width: 1010.98px) {
    .repo-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

{#await fetchRepos()}
  <div class="container">
    <Loading small center />
  </div>
{:then repos}
  {#if repos.length > 0}
    {@const hiddenCount = Math.max(0, repos.length - COLLAPSED)}
    <div class="section-header">
      <span class="txt-body-l-semibold">Repositories</span>
      <span class="counter">{repos.length}</span>
    </div>
    <div class="repo-grid">
      {#each expanded ? repos : repos.slice(0, COLLAPSED) as repoInfo (repoInfo.repo.rid)}
        {@const isDelegate = delegated?.has(repoInfo.repo.rid) ?? true}
        <RepoCard {repoInfo} {baseUrl}>
          <svelte:fragment slot="delegate">
            <Badge
              title={badgeTitle(repoInfo.repo.rid, isDelegate)}
              variant={isDelegate ? "delegate" : "neutral"}
              size="tiny"
              style="padding: 0 0.375rem; gap: 0.25rem;">
              {#if isDelegate}
                <Icon name="badge" />
                Delegate
              {:else}
                Contributor
              {/if}
            </Badge>
          </svelte:fragment>
        </RepoCard>
      {/each}
    </div>
    {#if hiddenCount > 0}
      <button class="expand" on:click={() => (expanded = !expanded)}>
        <Icon name={expanded ? "collapse-vertical" : "expand-vertical"} />
        {expanded
          ? "Show fewer repositories"
          : `Show ${hiddenCount} more ${utils.pluralize("repository", hiddenCount)}`}
      </button>
    {/if}
  {:else}
    <div class="container">
      <Placeholder
        iconName="desert"
        caption="This user doesn’t have any repositories on this node." />
    </div>
  {/if}
{:catch error}
  {router.push(handleError(error, baseUrl))}
{/await}
