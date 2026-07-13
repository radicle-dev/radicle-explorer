<script lang="ts">
  import type { Route } from "@app/lib/routes";

  import { page } from "$app/stores";

  import { href } from "@app/lib/routes";

  const installRoute: Route = { resource: "install", params: undefined };
  const cliRoute: Route = { resource: "cli", params: undefined };
  const desktopRoute: Route = { resource: "desktop", params: undefined };
  const learnRoute: Route = { resource: "learn", params: undefined };

  const piRepoUrl =
    "https://radicle.network/nodes/hdh.radicle.garden/rad%3AzSM6rc7C18JjDxn4tj1r7PuP9QHc";
  const claudeRepoUrl =
    "https://radicle.network/nodes/seed.radicle.garden/rad:zvBj4kByGeQSrSy2c4H7fyK42cS8";
  const principlesRoute: Route = { resource: "principles", params: undefined };
  const guidesRoute: Route = { resource: "guides", params: undefined };
  const exploreRoute: Route = { resource: "explore", params: undefined };
  const faqRoute: Route = { resource: "docs", params: { page: "faq" } };
  const glossaryRoute: Route = {
    resource: "docs",
    params: { page: "glossary" },
  };

  $: pathname = $page.url.pathname;

  // Only show a section's sub-nav while the viewer is within that section.
  $: installOpen = ["/install", "/cli", "/desktop"].includes(pathname);
  $: learnOpen =
    ["/learn", "/principles", "/faq", "/glossary"].includes(pathname) ||
    pathname.startsWith("/guides");
</script>

<style>
  .sidebar {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 6rem 1.5rem 1.5rem 2rem;
    gap: 1rem;
    overflow-y: auto;
    /* Pin the sidebar so it stays put while the main content fades and slides
       beneath it; only the active-indicator dot animates within it. */
    view-transition-name: marketing-sidebar;
  }

  .top-section {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .nav-section {
    display: flex;
    flex-direction: column;
  }

  .section-header {
    font: var(--txt-bold-16);
    letter-spacing: -0.005em;
    color: var(--color-text-tertiary);
    text-decoration: none;
    position: relative;
  }

  .section-header:hover {
    color: var(--color-text-secondary);
  }

  .section-header.active {
    color: var(--color-text-primary);
  }

  .nav-links {
    display: flex;
    flex-direction: column;
  }

  .nav-link {
    font: var(--txt-bold-16);
    letter-spacing: -0.005em;
    color: var(--color-text-tertiary);
    text-decoration: none;
    padding-left: 0.5rem;
    margin-top: 0.5rem;
    position: relative;
  }

  .nav-link:hover {
    color: var(--color-text-secondary);
  }

  .nav-link.active {
    color: var(--color-text-primary);
  }

  .external-links {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .external-link {
    font: var(--txt-bold-16);
    letter-spacing: -0.005em;
    color: var(--color-text-tertiary);
    text-decoration: none;
  }

  .external-link:hover {
    color: var(--color-text-secondary);
  }

  /* A single active-indicator dot lives inside whichever nav item is active.
     Its `view-transition-name` lets the browser morph it between positions as
     the active item changes across navigation (see marketing.css for the
     enter/exit slide). */
  .dot {
    position: absolute;
    top: 50%;
    margin-top: -2.5px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: var(--color-accent-blue-500);
    view-transition-name: sidebar-dot;
  }

  .section-header .dot {
    left: -0.75rem;
  }

  .nav-link .dot {
    left: -0.25rem;
  }
</style>

<aside class="sidebar">
  <nav class="top-section">
    <div class="nav-section">
      <a
        href={href(installRoute)}
        class="section-header"
        class:active={pathname === "/install"}>
        {#if pathname === "/install"}
          <span class="dot"></span>
        {/if}
        Install
      </a>
      {#if installOpen}
        <div class="nav-links">
          <a
            href={href(cliRoute)}
            class="nav-link"
            class:active={pathname === "/cli"}>
            {#if pathname === "/cli"}
              <span class="dot"></span>
            {/if}
            CLI
          </a>
          <a
            href={href(desktopRoute)}
            class="nav-link"
            class:active={pathname === "/desktop"}>
            {#if pathname === "/desktop"}
              <span class="dot"></span>
            {/if}
            Desktop
          </a>
          <a
            href={piRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="nav-link arrow-link">
            Pi agent <span class="link-arrow link-arrow-up-right">↗</span>
          </a>
          <a
            href={claudeRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="nav-link arrow-link">
            Claude skill <span class="link-arrow link-arrow-up-right">↗</span>
          </a>
        </div>
      {/if}
    </div>

    <div class="nav-section">
      <a
        href={href(learnRoute)}
        class="section-header"
        class:active={pathname === "/learn"}>
        {#if pathname === "/learn"}
          <span class="dot"></span>
        {/if}
        Learn
      </a>
      {#if learnOpen}
        <div class="nav-links">
          <a
            href={href(principlesRoute)}
            class="nav-link"
            class:active={pathname === "/principles"}>
            {#if pathname === "/principles"}
              <span class="dot"></span>
            {/if}
            How it works
          </a>
          <a
            href={href(guidesRoute)}
            class="nav-link"
            class:active={pathname.startsWith("/guides")}>
            {#if pathname.startsWith("/guides")}
              <span class="dot"></span>
            {/if}
            Guides
          </a>
          <a
            href={href(faqRoute)}
            class="nav-link"
            class:active={pathname === "/faq"}>
            {#if pathname === "/faq"}
              <span class="dot"></span>
            {/if}
            FAQ
          </a>
          <a
            href={href(glossaryRoute)}
            class="nav-link"
            class:active={pathname === "/glossary"}>
            {#if pathname === "/glossary"}
              <span class="dot"></span>
            {/if}
            Glossary
          </a>
        </div>
      {/if}
    </div>

    <div class="external-links">
      <a href={href(exploreRoute)} class="external-link arrow-link">
        Explore <span class="link-arrow link-arrow-right">→</span>
      </a>
      <a
        href="https://radicle.garden"
        target="_blank"
        rel="noopener noreferrer"
        class="external-link arrow-link">
        Garden <span class="link-arrow link-arrow-up-right">↗</span>
      </a>
    </div>
  </nav>
</aside>
