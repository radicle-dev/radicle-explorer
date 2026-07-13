<script lang="ts">
  import type { BaseUrl, Patch, Revision } from "@http-client";

  import { cachedGetDiff } from "@app/views/repos/router";
  import { formatCommit } from "@app/lib/utils";
  import { href } from "@app/lib/routes";

  import DiffStatBadge from "@app/components/DiffStatBadge.svelte";
  import Loading from "@app/components/Loading.svelte";

  export let repoId: string;
  export let baseUrl: BaseUrl;
  export let patch: Patch;
  export let latestRevision: Revision;
</script>

{#await cachedGetDiff(baseUrl, repoId, latestRevision.base, latestRevision.oid)}
  <Loading small />
{:then { diff }}
  <a
    title="Compare {formatCommit(latestRevision.base)}..{formatCommit(
      latestRevision.oid,
    )}"
    href={href({
      resource: "repo.patch",
      repo: repoId,
      node: baseUrl,
      patch: patch.id,
      view: {
        name: "diff",
        fromCommit: latestRevision.base,
        toCommit: latestRevision.oid,
      },
    })}>
    <DiffStatBadge
      hoverable
      insertions={diff.stats.insertions}
      deletions={diff.stats.deletions} />
  </a>
{/await}
