<script lang="ts">
  import type { BaseUrl, Repo } from "@http-client";

  import { tick } from "svelte";

  import Link from "@app/components/Link.svelte";

  export let active:
    "files" | "commits" | "issues" | "patches" | "releases" | undefined =
    undefined;
  export let baseUrl: BaseUrl;
  export let commitCount: number | undefined = undefined;
  export let peer: string | undefined = undefined;
  export let repo: Repo;
  export let repoId: string;
  export let revision: string | undefined = undefined;

  let nav: HTMLElement | undefined = undefined;
  let fadeLeft = false;
  let fadeRight = false;

  function updateFade() {
    if (!nav) {
      return;
    }
    const overflow = nav.scrollWidth - nav.clientWidth;
    fadeLeft = overflow > 1 && nav.scrollLeft > 1;
    fadeRight = overflow > 1 && nav.scrollLeft < overflow - 1;
  }

  async function revealActive() {
    await tick();
    const item = nav?.querySelector<HTMLElement>(".item.active");
    if (!nav || !item) {
      updateFade();
      return;
    }
    const inset = parseFloat(getComputedStyle(nav).paddingLeft);
    const itemEnd = item.offsetLeft + item.offsetWidth + inset;
    if (itemEnd > nav.scrollLeft + nav.clientWidth) {
      nav.scrollLeft = itemEnd - nav.clientWidth;
    } else if (item.offsetLeft < nav.scrollLeft) {
      nav.scrollLeft = item.offsetLeft - inset;
    }
    updateFade();
  }

  $: meta = repo.payloads["xyz.radicle.project"].meta;
  $: if (active) {
    void revealActive();
  } else {
    void tick().then(updateFade);
  }
</script>

<style>
  .nav {
    position: relative;
    display: flex;
    margin: 0 -1rem;
    padding: 0 1rem;
    align-items: center;
    gap: 0.25rem;
    overflow-x: auto;
    scrollbar-width: none;
    white-space: nowrap;
    mask-image: linear-gradient(
      to right,
      transparent,
      black var(--fade-left),
      black calc(100% - var(--fade-right)),
      transparent
    );
  }
  .nav::-webkit-scrollbar {
    display: none;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 2rem;
    padding: 0 0.625rem;
    border-radius: var(--border-radius-sm);
    font: var(--txt-body-m-regular);
    color: var(--color-text-secondary);
  }
  .item.active {
    background-color: var(--color-surface-mid);
    color: var(--color-text-primary);
    font: var(--txt-body-m-semibold);
  }
  .counter {
    border-radius: var(--border-radius-sm);
    background-color: var(--color-surface-mid);
    color: var(--color-text-tertiary);
    padding: 0 0.25rem;
    font: var(--txt-body-s-regular);
  }
  .active .counter {
    background-color: var(--color-surface-alpha-subtle);
    color: var(--color-text-primary);
  }
  .divider {
    flex-shrink: 0;
    width: 1px;
    height: 1.25rem;
    margin: 0 0.25rem;
    background-color: var(--color-border-subtle);
  }
</style>

<svelte:window on:resize={updateFade} />

<nav
  class="nav"
  aria-label="Repository"
  style:--fade-left={fadeLeft ? "2rem" : "0px"}
  style:--fade-right={fadeRight ? "2rem" : "0px"}
  bind:this={nav}
  on:scroll={updateFade}>
  <Link
    route={{
      resource: "repo.source",
      repo: repoId,
      node: baseUrl,
      peer,
      revision,
    }}>
    <span class="item" class:active={active === "files"}>Files</span>
  </Link>
  <Link
    route={{
      resource: "repo.history",
      repo: repoId,
      node: baseUrl,
      peer,
      revision,
    }}>
    <span class="item" class:active={active === "commits"}>
      Commits
      {#if commitCount !== undefined}
        <span class="counter">{commitCount}</span>
      {/if}
    </span>
  </Link>
  <div class="divider"></div>
  <Link route={{ resource: "repo.issues", repo: repoId, node: baseUrl }}>
    <span class="item" class:active={active === "issues"}>
      Issues
      <span class="counter">{meta.issues.open}</span>
    </span>
  </Link>
  <Link route={{ resource: "repo.patches", repo: repoId, node: baseUrl }}>
    <span class="item" class:active={active === "patches"}>
      Patches
      <span class="counter">{meta.patches.open}</span>
    </span>
  </Link>
  {#if meta.releases !== undefined}
    <Link route={{ resource: "repo.releases", repo: repoId, node: baseUrl }}>
      <span class="item" class:active={active === "releases"}>
        Releases
        <span class="counter">{meta.releases}</span>
      </span>
    </Link>
  {/if}
</nav>
