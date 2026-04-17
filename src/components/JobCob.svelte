<script context="module" lang="ts">
  import type { BaseUrl, Job } from "@http-client";

  import { LRUCache } from "lru-cache";

  import { HttpdClient } from "@http-client";

  const inFlightJobs = new LRUCache<string, Promise<Job[]>>({ max: 50 });

  function fetchJobs(
    baseUrl: BaseUrl,
    rid: string,
    commit: string,
  ): Promise<Job[]> {
    const key = `${baseUrl.scheme}://${baseUrl.hostname}:${baseUrl.port}/${rid}/${commit}`;
    let promise = inFlightJobs.get(key);
    if (!promise) {
      promise = new HttpdClient(baseUrl).repo.getJobsByCommit(rid, commit);
      promise.catch(() => inFlightJobs.delete(key));
      inFlightJobs.set(key, promise);
    }
    return promise;
  }
</script>

<script lang="ts">
  import HoverPopover from "@app/components/HoverPopover.svelte";
  import Icon from "@app/components/Icon.svelte";
  import NodeId from "@app/components/NodeId.svelte";

  import Badge from "./Badge.svelte";
  import ExternalLink from "./ExternalLink.svelte";
  import Loading from "./Loading.svelte";

  export let baseUrl: BaseUrl;
  export let commit: string;
  export let rid: string;
  export let stylePopoverPositionBottom: string | undefined = undefined;
  export let stylePopoverPositionLeft: string | undefined = undefined;
  export let stylePopoverPositionTop: string | undefined = undefined;

  $: jobsPromise = fetchJobs(baseUrl, rid, commit);

  type JobStatus = "succeeded" | "failed" | "mixed";

  function computeStatus(jobs: Job[]): JobStatus | undefined {
    if (jobs.length === 0) return undefined;

    const allSucceeded = jobs.every(j =>
      j.runs.every(r => r.status === "succeeded"),
    );
    const allFailed = jobs.every(j => j.runs.every(r => r.status === "failed"));

    if (allSucceeded) return "succeeded";
    if (allFailed) return "failed";
    return "mixed";
  }
</script>

<style>
  .status {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    white-space: nowrap;
    font: var(--txt-body-m-regular);
  }
  .status.succeeded {
    color: var(--color-text-open);
  }
  .status.failed {
    color: var(--color-feedback-error-text);
  }
  .status.mixed {
    color: var(--color-text-tertiary);
  }
  .popover-grid {
    display: grid;
    grid-template-columns: auto auto auto;
    align-items: center;
    gap: 0.5rem;
    font: var(--txt-body-m-regular);
  }
</style>

{#await jobsPromise}
  <div style:padding-left="0.5rem">
    <Loading small noDelay />
  </div>
{:then jobs}
  {@const jobStatus = computeStatus(jobs)}
  {#if jobStatus}
    <HoverPopover
      canMouseOver
      {stylePopoverPositionBottom}
      {stylePopoverPositionLeft}
      {stylePopoverPositionTop}>
      <div
        class="global-flex-item"
        slot="toggle"
        style:cursor="default"
        role="status">
        {#if jobStatus === "succeeded"}
          <span class="status succeeded" title="All CI jobs passed">
            <Icon name="checkmark" /> All passed
          </span>
        {:else if jobStatus === "failed"}
          <span class="status failed" title="All CI jobs failed">
            <Icon name="close" /> All failed
          </span>
        {:else}
          <span class="status mixed" title="CI jobs have mixed results">
            <Icon name="warning" /> Mixed
          </span>
        {/if}
      </div>

      <div slot="popover" class="popover-grid">
        {#each jobs as job (job.jobId)}
          {#each job.runs as run (run.runId)}
            {#if run.status === "started"}
              <Badge variant="foreground" title="Job started">
                <Icon name="hourglass" /> Started
              </Badge>
            {:else if run.status === "failed"}
              <Badge variant="negative" title="Job failed">
                <Icon name="close" /> Failed
              </Badge>
            {:else if run.status === "succeeded"}
              <Badge variant="positive" title="Job passed">
                <Icon name="checkmark" /> Passed
              </Badge>
            {/if}
            <NodeId {baseUrl} nodeId={run.node.id} alias={run.node.alias} />
            <ExternalLink href={run.log}>logs</ExternalLink>
          {/each}
        {/each}
      </div>
    </HoverPopover>
  {/if}
{:catch}
  <!-- Silently ignore errors from old nodes without the jobs endpoint. -->
{/await}
