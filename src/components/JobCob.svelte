<script lang="ts">
  import type { BaseUrl, Job } from "@http-client";
  import { Client } from "@http-client/lib/repo.js";

  import HoverPopover from "@app/components/HoverPopover.svelte";
  import Icon from "@app/components/Icon.svelte";
  import NodeId from "@app/components/NodeId.svelte";

  import Badge from "./Badge.svelte";
  import ExternalLink from "./ExternalLink.svelte";
  import Loading from "./Loading.svelte";

  interface Props {
    baseUrl: BaseUrl;
    repoClient: InstanceType<typeof Client>;
    commit: string;
    rid: string;
    stylePopoverPositionBottom?: string;
    stylePopoverPositionLeft?: string;
    stylePopoverPositionTop?: string;
  }

  const {
    baseUrl,
    repoClient,
    commit,
    rid,
    stylePopoverPositionBottom,
    stylePopoverPositionLeft,
    stylePopoverPositionTop,
  }: Props = $props();

  let jobs: Job[] = $state([]);

  const jobsPromise = repoClient.getJobsByCommit(rid, commit).then(result => {
    jobs = result;
    return result;
  });

  type JobStatus = "success" | "failed" | "mixed";

  const jobStatus = $derived.by((): JobStatus | null => {
    if (jobs.length === 0) return null;

    const allSucceeded = jobs.every(j =>
      j.runs.every(r => r.status === "succeeded"),
    );
    const allFailed = jobs.every(j => j.runs.every(r => r.status === "failed"));

    if (allSucceeded) return "success";
    if (allFailed) return "failed";
    return "mixed";
  });
</script>

{#await jobsPromise}
  <Loading small noDelay />
{:then}
  {#if jobs.length > 0 && jobStatus}
    <HoverPopover
      canMouseOver
      {stylePopoverPositionBottom}
      {stylePopoverPositionLeft}
      {stylePopoverPositionTop}>
      <div slot="toggle" style:cursor="default" role="status">
        {#if jobStatus === "success"}
          <Badge variant="positive" title="All CI jobs passed">
            <Icon name="checkmark" /> All passed
          </Badge>
        {:else if jobStatus === "failed"}
          <Badge variant="negative" title="All CI jobs failed">
            <Icon name="cross" /> All failed
          </Badge>
        {:else}
          <Badge variant="foreground" title="CI jobs have mixed results">
            <Icon name="info" /> Mixed
          </Badge>
        {/if}
      </div>

      <div
        slot="popover"
        class="global-flex-item"
        style:flex-direction="column"
        style:align-items="flex-start"
        style:width="100%"
        style:gap="0.5rem">
        {#each jobs as job (job.jobId)}
          {#each job.runs as run (run.runId)}
            <div class="global-flex-item txt-small" style:width="100%">
              {#if run.status === "started"}
                <Badge variant="foreground" title="Job started">
                  <Icon name="ellipsis" /> Started
                </Badge>
              {:else if run.status === "failed"}
                <Badge variant="negative" title="Job failed">
                  <Icon name="cross" /> Failed
                </Badge>
              {:else if run.status === "succeeded"}
                <Badge variant="positive" title="Job passed">
                  <Icon name="checkmark" /> Passed
                </Badge>
              {/if}
              <NodeId {baseUrl} nodeId={run.node.id} alias={run.node.alias} />
              <div style:margin-left="auto" style:padding-left="1rem">
                <ExternalLink href={run.log}>logs</ExternalLink>
              </div>
            </div>
          {/each}
        {/each}
      </div>
    </HoverPopover>
  {/if}
{/await}
