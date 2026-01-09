<script lang="ts">
  import type { BaseUrl, NodeStats } from "@http-client";

  import * as router from "@app/lib/router";
  import { baseUrlToString } from "@app/lib/utils";
  import { fetchRepoInfos } from "@app/components/RepoCard";
  import { handleError } from "@app/views/nodes/error";

  import Loading from "@app/components/Loading.svelte";
  import Placeholder from "@app/components/Placeholder.svelte";
  import RepoCard from "@app/components/RepoCard.svelte";

  export let baseUrl: BaseUrl;
  export let stats: NodeStats;

  let listState: "pinned" | "all" = "pinned";

  let page = 0;
  $: perPage = listState === "pinned" ? stats.repos.total : 24;
  $: totalPages = Math.ceil(stats.repos.total / perPage);

  function showPinned() {
    listState = "pinned";
    page = 0;
  }
  function showAll() {
    listState = "all";
  }
</script>

<style>
  .subtitle,
  .pagination {
    font-size: var(--font-size-small);
    color: var(--color-foreground-dim);
  }
  .pagination {
    display: flex;
    gap: 0.25rem;
    margin-left: auto;
  }
  .repos {
    margin-top: 0;
  }
  .repo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(21rem, 1fr));
    gap: 1rem;
  }
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    height: 35vh;
    font-size: var(--font-size-small);
  }
  .text-button {
    background: none;
    border: none;
    font: inherit;
    color: inherit;
    margin: 0;
    padding: 0;
  }
  .text-button:not(:disabled) {
    cursor: pointer;
  }
  .text-button:hover:not(:disabled) {
    text-decoration: underline;
  }
  .current-page {
    text-decoration: underline;
  }
  .footer {
    display: flex;
    gap: 0.5rem 1rem;
    margin-top: 1rem;
  }

  @media (max-width: 1010.98px) {
    .repos {
      margin-top: 3rem;
    }
    .footer {
      flex-direction: column;
    }
    .pagination {
      margin-left: 0;
    }
  }
</style>

<div class="repos">
  {#await fetchRepoInfos(baseUrl, { show: listState, perPage, page })}
    <div style:height="35vh">
      <Loading small center />
    </div>
  {:then repoInfos}
    {#if repoInfos.length > 0}
      <div class="repo-grid">
        {#each repoInfos as repoInfo}
          <RepoCard {baseUrl} {repoInfo} />
        {/each}
      </div>
      <div class="footer">
        {#if listState === "pinned"}
          <div class="subtitle">
            {repoInfos.length}
            pinned {repoInfos.length === 1 ? "repository" : "repositories"} ·
            <button class="text-button" on:click={showAll}>Browse all</button>
          </div>
        {:else}
          <div class="subtitle">
            {stats.repos.total.toLocaleString()}
            seeded {stats.repos.total === 1 ? "repository" : "repositories"} ·
            <button class="text-button" on:click={showPinned}>
              See pinned
            </button>
          </div>

          <div class="pagination">
            {#if page !== 0}
              <button class="text-button" on:click={() => (page = page - 1)}>
                Previous
              </button>
              ·
            {/if}

            {#each Array.from({ length: Math.min(totalPages, 7) }) as _, i}
              {@const startPage = Math.max(page - 3, 0)}
              {@const pageNumber = startPage + i}
              <button
                class="text-button"
                class:current-page={page === pageNumber}
                on:click={() => (page = pageNumber)}
                disabled={page === pageNumber}>
                {pageNumber + 1}
              </button>
            {/each}

            {#if page !== totalPages - 1}
              ·
              <button class="text-button" on:click={() => (page = page + 1)}>
                Next
              </button>
            {/if}
          </div>
        {/if}
      </div>
    {:else}
      <div class="empty-state">
        {#if listState === "pinned"}
          <Placeholder
            iconName="desert"
            caption="This node doesn't have any pinned repositories." />
        {:else}
          <Placeholder
            iconName="desert"
            caption="This node doesn't seed any repositories." />
        {/if}
      </div>
    {/if}
  {:catch error}
    {router.push(handleError(error, baseUrlToString(baseUrl)))}
  {/await}
</div>
