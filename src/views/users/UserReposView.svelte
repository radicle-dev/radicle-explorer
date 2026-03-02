<script lang="ts">
  import type { BaseUrl, NodeIdentity, NodeStats } from "@http-client";

  import * as router from "@app/lib/router";
  import * as utils from "@app/lib/utils";
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
</script>

<style>
  .repo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(32rem, 1fr));
    gap: 0;
  }
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    height: 35vh;
    font: var(--txt-body-m-regular);
  }
  .subtitle {
    font: var(--txt-body-m-regular);
    color: var(--color-text-tertiary);
    margin: 1rem;
  }

  @media (max-width: 1010.98px) {
    .repo-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

{#await fetchRepoInfos(baseUrl, { show: "all", perPage: stats.repos.total }, utils.formatDid(did))}
  <div style:height="35vh">
    <Loading small center />
  </div>
{:then repos}
  {#if repos.length > 0}
    <div class="repo-grid">
      {#each repos as repoInfo}
        <RepoCard {repoInfo} {baseUrl}>
          <svelte:fragment slot="delegate">
            <Badge
              title={`${user.alias || utils.formatNodeId(did.pubkey)} is a delegate of this repository`}
              round
              variant="delegate"
              size="tiny"
              style="padding: 0 0.372rem; gap: 0.125rem;">
              <Icon name="badge" />
            </Badge>
          </svelte:fragment>
        </RepoCard>
      {/each}
    </div>
    <div class="subtitle">
      {repos.length}
      {repos.length === 1 ? "repository" : "repositories"}
    </div>
  {:else}
    <div class="empty-state">
      <Placeholder
        iconName="desert"
        caption="This user doesn't have any repositories on this node." />
    </div>
  {/if}
{:catch error}
  {router.push(handleError(error, utils.baseUrlToString(baseUrl)))}
{/await}
