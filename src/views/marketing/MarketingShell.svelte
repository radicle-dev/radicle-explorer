<script lang="ts">
  import Header from "@app/components/Header.svelte";

  import Footer from "./Footer.svelte";
  import Sidebar from "./Sidebar.svelte";
</script>

<style>
  .layout {
    display: grid;
    grid-template-columns: 18rem 1fr;
    max-width: 86rem;
    margin: 0 auto;
  }

  .layout :global(.sidebar) {
    position: sticky;
    top: var(--global-header-height);
    height: calc(100vh - var(--global-header-height));
  }

  .main-content {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
  }

  @media (max-width: 90rem) {
    .layout {
      grid-template-columns: 14rem 1fr;
    }
  }

  @media (max-width: 56rem) {
    .layout {
      grid-template-columns: 1fr;
    }

    .layout :global(.sidebar) {
      display: none;
    }
  }
</style>

<Header variant="marketing" />

<div class="marketing">
  <div class="layout">
    <Sidebar />
    <div class="main-content">
      <slot />
      <Footer />
    </div>
  </div>
</div>
