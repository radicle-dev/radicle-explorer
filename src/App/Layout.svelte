<script lang="ts">
  import Footer from "@app/App/Footer.svelte";
  import MobileFooter from "@app/App/MobileFooter.svelte";
  import Link from "@app/components/Link.svelte";
</script>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .header {
    border-bottom: 1px solid var(--color-border-subtle);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    padding: 0.5rem 0.5rem 0.5rem 1rem;
    height: 3.5rem;
    justify-content: flex-end;
  }
  .content {
    height: 100%;
    overflow-y: scroll;
  }

  .logo {
    height: var(--button-regular-height);
    margin: 0 0.5rem;
  }
  @media (max-width: 719.98px) {
    .app {
      display: grid;
      grid-template-rows: 1fr auto;
      height: 100%;
    }
    .content {
      overflow-y: scroll;
    }
  }
</style>

<div class="app">
  <div class="global-hide-on-mobile-down header">
    <Link
      style="display: flex; align-items: center;"
      route={{ resource: "nodes", params: undefined }}>
      <img
        width="24"
        height="24"
        class="logo"
        alt="Radicle logo"
        src="/radicle.svg" />
    </Link>
  </div>
  <div class="content">
    <slot />
  </div>
  <div style:margin-top="auto">
    <div class="global-hide-on-mobile-down">
      <Footer />
    </div>
    <div class="global-hide-on-small-desktop-up">
      <MobileFooter />
    </div>
  </div>
</div>
