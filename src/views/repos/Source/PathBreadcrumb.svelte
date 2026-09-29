<script lang="ts">
  import type { BaseUrl } from "@http-client";

  import { tick } from "svelte";

  import Link from "@app/components/Link.svelte";

  export let baseUrl: BaseUrl;
  export let path: string;
  export let peer: string | undefined;
  export let repoId: string;
  export let repoName: string;
  export let revision: string | undefined;

  let scroller: HTMLElement | undefined = undefined;
  let fadeLeft = false;
  let fadeRight = false;

  function updateFade() {
    if (!scroller) {
      return;
    }
    const overflow = scroller.scrollWidth - scroller.clientWidth;
    const offset = Math.abs(scroller.scrollLeft);
    fadeLeft = overflow > 1 && offset < overflow - 1;
    fadeRight = overflow > 1 && offset > 1;
  }

  async function scrollToEnd() {
    await tick();
    if (scroller) {
      scroller.scrollLeft = 0;
    }
    updateFade();
  }

  $: segments = path.split("/");
  $: if (path) {
    void scrollToEnd();
  }
</script>

<style>
  .scroller {
    direction: rtl;
    overflow-x: auto;
    scrollbar-width: none;
    mask-image: linear-gradient(
      to right,
      transparent,
      black var(--fade-left),
      black calc(100% - var(--fade-right)),
      transparent
    );
  }
  .scroller::-webkit-scrollbar {
    display: none;
  }
  .path {
    direction: ltr;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    width: max-content;
    min-width: 100%;
    white-space: nowrap;
    font: var(--txt-body-m-regular);
    color: var(--color-text-secondary);
  }
  .path :global(a:hover) {
    color: var(--color-text-primary);
  }
  .separator {
    color: var(--color-text-quaternary);
  }
  .current {
    color: var(--color-text-primary);
    font: var(--txt-body-m-semibold);
  }
</style>

<svelte:window on:resize={updateFade} />

<div
  class="scroller"
  style:--fade-left={fadeLeft ? "2rem" : "0px"}
  style:--fade-right={fadeRight ? "2rem" : "0px"}
  bind:this={scroller}
  on:scroll={updateFade}>
  <nav class="path" aria-label="File path">
    <Link
      route={{
        resource: "repo.source",
        node: baseUrl,
        repo: repoId,
        path: "/",
        peer,
        revision,
      }}>
      {repoName}
    </Link>
    {#each segments as segment, index}
      <span class="separator">/</span>
      {#if index === segments.length - 1}
        <span class="current">{segment}</span>
      {:else}
        <Link
          route={{
            resource: "repo.source",
            node: baseUrl,
            repo: repoId,
            path: segments.slice(0, index + 1).join("/"),
            peer,
            revision,
          }}>
          {segment}
        </Link>
      {/if}
    {/each}
  </nav>
</div>
