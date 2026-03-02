<script lang="ts" context="module">
  export type ActiveTab = "source" | "issues" | "patches" | undefined;
</script>

<script lang="ts">
  import type { BaseUrl, Repo } from "@http-client";

  import Link from "@app/components/Link.svelte";
  import Button from "@app/components/Button.svelte";
  import Icon from "@app/components/Icon.svelte";

  export let baseUrl: BaseUrl;
  export let activeTab: ActiveTab = undefined;
  export let repo: Repo;
</script>

<style>
  .container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .counter {
    border-radius: var(--border-radius-sm);
    background-color: var(--color-surface-mid);
    color: var(--color-text-tertiary);
    padding: 0 0.25rem;
  }

  .selected {
    background-color: var(--color-surface-alpha-subtle);
    color: var(--color-text-primary);
  }

  .hover {
    background-color: var(--color-surface-strong);
    color: var(--color-text-primary);
  }

  .title-counter {
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
    width: 100%;
  }
</style>

<div class="container">
  <Link
    route={{
      resource: "repo.source",
      repo: repo.rid,
      node: baseUrl,
      path: "/",
    }}>
    <Button
      size="large"
      styleWidth="100%"
      styleJustifyContent="flex-start"
      variant={activeTab === "source" ? "gray" : "background"}>
      <Icon name="chevron-left-right" />
      Source
    </Button>
  </Link>
  <Link
    route={{
      resource: "repo.issues",
      repo: repo.rid,
      node: baseUrl,
    }}>
    <Button
      let:hover
      size="large"
      styleJustifyContent="flex-start"
      styleWidth="100%"
      variant={activeTab === "issues" ? "gray" : "background"}>
      <Icon name="issue" />
      <div class="title-counter">
        Issues
        <span
          class="counter"
          class:selected={activeTab === "issues"}
          class:hover={hover && activeTab !== "issues"}>
          {repo.payloads["xyz.radicle.project"].meta.issues.open}
        </span>
      </div>
    </Button>
  </Link>

  <Link
    route={{
      resource: "repo.patches",
      repo: repo.rid,
      node: baseUrl,
    }}>
    <Button
      let:hover
      size="large"
      styleWidth="100%"
      styleJustifyContent="flex-start"
      variant={activeTab === "patches" ? "gray" : "background"}>
      <Icon name="patch" />
      <div class="title-counter">
        Patches
        <span
          class="counter"
          class:hover={hover && activeTab !== "patches"}
          class:selected={activeTab === "patches"}>
          {repo.payloads["xyz.radicle.project"].meta.patches.open}
        </span>
      </div>
    </Button>
  </Link>
</div>
