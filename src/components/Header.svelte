<script lang="ts" context="module">
  import type { BaseUrl } from "@http-client";

  import { HttpdClient } from "@http-client";

  // Cache of `searchAvailable` per seed so navigating within a seed (which
  // remounts the Header) doesn't refetch /info and flicker the search bar.
  const searchAvailableCache: Record<string, boolean> = {};

  function seedKey(baseUrl: BaseUrl): string {
    return `${baseUrl.scheme}://${baseUrl.hostname}:${baseUrl.port}`;
  }
</script>

<script lang="ts">
  import { page } from "$app/stores";

  import { homeRoute, routeToPath } from "@app/lib/router";
  import { isRepoRouteId } from "@app/lib/routeId";
  import { pageError } from "@app/lib/error";
  import config from "@app/lib/config";
  import { isMobile } from "@app/lib/media";
  import { determineSeed, selectedSeed } from "@app/views/nodes/SeedSelector";

  import Settings from "@app/App/Settings.svelte";
  import Help from "@app/App/Help.svelte";
  import Button from "@app/components/Button.svelte";
  import Icon from "@app/components/Icon.svelte";
  import IconButton from "@app/components/IconButton.svelte";
  import Logo from "@app/components/Logo.svelte";
  import Popover from "@app/components/Popover.svelte";
  import HeaderSearch from "@app/views/explore/HeaderSearch.svelte";
  import MobileNav from "@app/marketing/MobileNav.svelte";
  import RepoSearch from "@app/views/explore/RepoSearch.svelte";
  import SeedPicker from "@app/views/explore/SeedPicker.svelte";

  const isNodeHomepage = config.nodes.homepage === "node";
  const isLandingDeployment = config.nodes.homepage === "landing";

  // The current error, whether raised by a route load (`$page.error`) or by a
  // component outside of load functions (`$pageError`). Error pages use the
  // plain full-width header regardless of which route they surfaced on.
  $: appError = $page.error ?? $pageError?.body;
  $: errorStatus = $pageError?.status ?? $page.status;

  $: hideLogo = isNodeHomepage && !appError && isRepoRouteId($page.route.id);
  // The marketing pages carry their own calls to action, so the header's
  // "Get started" button is hidden there. Which pages count as marketing is
  // declared by the routes themselves via layout data.
  $: isMarketingRoute = !appError && $page.data.marketing === true;
  // Pages declare their header layout via layout data: the narrow, centered
  // header (fixed, constrained width, inline search) on marketing and explore
  // pages, and the full-width header on repo and node views. Error pages
  // always use the full-width header.
  $: isConstrainedHeader = !appError && $page.data.fullWidth === false;

  // Seed selection lives in Settings now, so the header no longer shows a
  // general seed picker. It's kept only on error pages as an escape hatch to
  // a working seed, using the error's seed when known and otherwise falling
  // back to the currently selected one. (The notFound view renders its own
  // inline picker, so 404s are excluded here.)
  $: seedPickerBaseUrl =
    appError && errorStatus !== 404
      ? (appError.baseUrl ?? determineSeed())
      : undefined;

  // Search always queries the selected explore seed, regardless of which seed
  // the current page (e.g. a repo view) was served from.
  $: searchSeed = $selectedSeed ?? determineSeed();

  // The explore routes already resolved /info during load; reuse it, but only
  // when it describes the same seed we're about to search.
  $: routeSearchAvailable =
    !appError &&
    typeof $page.data.searchAvailable === "boolean" &&
    $page.data.baseUrl &&
    seedKey($page.data.baseUrl) === seedKey(searchSeed)
      ? $page.data.searchAvailable
      : undefined;

  let searchAvailable = false;
  $: void resolveSearchAvailable(searchSeed, routeSearchAvailable);

  async function resolveSearchAvailable(
    seed: BaseUrl,
    known: boolean | undefined,
  ) {
    const key = seedKey(seed);
    if (known !== undefined) {
      searchAvailableCache[key] = known;
      searchAvailable = known;
      return;
    }
    if (key in searchAvailableCache) {
      searchAvailable = searchAvailableCache[key];
      return;
    }
    searchAvailable = false;
    try {
      const info = await new HttpdClient(seed).getInfo();
      searchAvailableCache[key] = info.httpd.searchAvailable;
    } catch {
      // Older nodes without /info (or an unreachable seed) have no search.
      searchAvailableCache[key] = false;
    }
    if (seedKey(searchSeed) === key) {
      searchAvailable = searchAvailableCache[key];
    }
  }

  // Inline bar only on the explore/marketing routes at desktop widths;
  // everywhere else (mobile, or a repo/node route) the search collapses into a
  // button.
  $: collapsedSearch = $isMobile || !isConstrainedHeader;
  // Search is offered on every route whose seed exposes the search backend;
  // `booting` renders no header at all, so it needs no explicit exclusion.
  $: showSearch = searchAvailable;
</script>

<style>
  .header-container {
    background-color: var(--color-surface-base);
    border-bottom: 1px solid var(--color-border-subtle);
    height: var(--global-header-height);
    width: 100%;
    position: relative;
    z-index: 200;
    /* Pin the header across navigations: giving it its own transition group
       lifts it out of the root snapshot so it stays put instead of fading and
       sliding with the page content (which briefly flashed the bar). Its named
       children still morph independently within it. */
    view-transition-name: header;
  }
  .header-container.fixed {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
  }
  .header-spacer {
    height: var(--global-header-height);
  }
  .header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    width: 100%;
    padding: 0 1rem;
    position: relative;
  }
  .header-inner.constrained {
    max-width: 86rem;
    margin: 0 auto;
    padding: 0 2rem;
  }
  .left-section {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    height: 100%;
  }
  .left-divider {
    width: 1px;
    height: 1.25rem;
    background-color: var(--color-border-subtle);
  }
  .right-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: flex-end;
  }
  .divider {
    height: 1px;
    width: 100%;
    background-color: var(--color-border-subtle);
  }
  .header-logo {
    display: inline-flex;
    align-items: center;
    view-transition-name: header-logo;
  }
  .get-started {
    text-decoration: none;
    view-transition-name: header-get-started;
  }
  .header-settings {
    display: inline-flex;
    align-items: center;
    view-transition-name: header-settings;
  }
  .header-search {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    width: clamp(18rem, 30vw, 34rem);
  }

  @media (max-width: 720px) {
    .get-started {
      display: none;
    }
    .header-inner.constrained {
      padding: 0 1rem;
    }
    /* The breadcrumbs (e.g. the node/repo trail on repo pages) are hidden on
       mobile for lack of space, so drop the divider that precedes them too. */
    .left-divider {
      display: none;
    }
  }
</style>

<div class="header-container" class:fixed={isConstrainedHeader}>
  <div class="header-inner" class:constrained={isConstrainedHeader}>
    <div class="left-section">
      {#if !hideLogo}
        <a
          aria-label="Radicle"
          href={routeToPath(homeRoute())}
          style="height: 1rem; display: flex; align-items: center;">
          <span class="header-logo"><Logo /></span>
        </a>
      {/if}
      {#if $$slots.breadcrumbs && !hideLogo}
        <div class="left-divider"></div>
      {/if}
      <slot name="breadcrumbs" />
    </div>

    {#if showSearch && !collapsedSearch}
      <div class="header-search">
        <RepoSearch baseUrl={searchSeed} />
      </div>
    {/if}

    <div class="right-section">
      {#if showSearch && collapsedSearch}
        <HeaderSearch baseUrl={searchSeed} />
      {/if}
      {#if seedPickerBaseUrl}
        <SeedPicker baseUrl={seedPickerBaseUrl} />
      {/if}
      {#if isMarketingRoute}
        <span class="get-started">
          <a href={routeToPath({ resource: "install", params: undefined })}>
            <Button variant="foreground">Get started</Button>
          </a>
        </span>
      {:else if isLandingDeployment}
        <span class="get-started">
          <a href={routeToPath({ resource: "install", params: undefined })}>
            <Button variant="outline">Get started</Button>
          </a>
        </span>
      {:else}
        <a
          class="get-started"
          href="https://radicle.dev"
          target="_blank"
          rel="noreferrer">
          <Button variant="outline">Get started</Button>
        </a>
      {/if}
      <Popover
        popoverPositionTop="2.5rem"
        popoverPositionRight="0"
        popoverFullWidthOnMobile>
        <IconButton
          slot="toggle"
          let:toggle
          on:click={toggle}
          inline
          ariaLabel="Settings">
          <span class="header-settings"><Icon name="settings" /></span>
        </IconButton>

        <div
          slot="popover"
          style:display="flex"
          style:flex-direction="column"
          style:gap="0.75rem"
          style:align-items="stretch">
          <Settings />
          <div class="divider"></div>
          <Help />
        </div>
      </Popover>
      {#if isMarketingRoute}
        <MobileNav />
      {/if}
    </div>
  </div>
</div>
{#if isConstrainedHeader}
  <div class="header-spacer"></div>
{/if}
