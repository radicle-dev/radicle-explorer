<script lang="ts">
  import type {
    BaseUrl,
    Issue,
    IssueState,
    Repo,
    SeedingPolicy,
  } from "@http-client";

  import capitalize from "lodash/capitalize";
  import { HttpdClient } from "@http-client";
  import { ISSUES_PER_PAGE } from "./router";
  import { baseUrlToString } from "@app/lib/utils";
  import { closeFocused } from "@app/components/Popover.svelte";

  import Button from "@app/components/Button.svelte";
  import DropdownList from "@app/components/DropdownList.svelte";
  import DropdownListItem from "@app/components/DropdownList/DropdownListItem.svelte";
  import ErrorMessage from "@app/components/ErrorMessage.svelte";
  import Icon from "@app/components/Icon.svelte";
  import IssueTeaser from "@app/views/repos/Issue/IssueTeaser.svelte";
  import Layout from "./Layout.svelte";
  import Link from "@app/components/Link.svelte";
  import List from "@app/components/List.svelte";
  import Loading from "@app/components/Loading.svelte";
  import Placeholder from "@app/components/Placeholder.svelte";
  import Popover from "@app/components/Popover.svelte";
  import Separator from "./Separator.svelte";
  import Share from "./Share.svelte";

  export let baseUrl: BaseUrl;
  export let seedingPolicy: SeedingPolicy;
  export let issues: Issue[];
  export let repo: Repo;
  export let status: IssueState["status"];
  export let nodeAvatarUrl: string | undefined;

  let loading = false;
  let page = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let error: any;
  let allIssues: Issue[];

  $: {
    allIssues = issues;
    page = 0;
  }

  const api = new HttpdClient(baseUrl);

  async function loadIssues(status: IssueState["status"]): Promise<void> {
    loading = true;
    page += 1;
    try {
      const response = await api.repo.getAllIssues(repo.rid, {
        status,
        page,
        perPage: ISSUES_PER_PAGE,
      });
      allIssues = [...allIssues, ...response];
    } catch (e) {
      error = e;
    } finally {
      loading = false;
    }
  }

  const stateOptions: IssueState["status"][] = ["open", "closed"];
  const stateColor: Record<IssueState["status"], string> = {
    open: "var(--color-text-open)",
    closed: "var(--color-text-merged)",
  };

  const stateBackground: Record<IssueState["status"], string> = {
    open: "var(--color-surface-open)",
    closed: "var(--color-surface-merged)",
  };

  $: showMoreButton =
    !loading &&
    !error &&
    allIssues.length < repo.payloads["xyz.radicle.project"].meta.issues[status];
</script>

<style>
  .header {
    display: flex;
    justify-content: space-between;
    padding: 1rem;
  }
  .more {
    margin-top: 2rem;
    min-height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .dropdown-button-counter {
    border-radius: var(--border-radius-sm);
    background-color: var(--color-surface-alpha-subtle);
    color: var(--color-text-primary);
    padding: 0 0.25rem;
  }
  .dropdown-list-counter {
    border-radius: var(--border-radius-sm);
    background-color: var(--color-surface-mid);
    color: var(--color-text-tertiary);
    padding: 0 0.25rem;
  }
  .selected {
    background-color: var(--color-surface-alpha-subtle);
    color: var(--color-text-tertiary);
  }
  .placeholder {
    height: calc(100% - 4rem);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  @media (max-width: 719.98px) {
    .placeholder {
      height: calc(100vh - 10rem);
    }
  }
</style>

<Layout {nodeAvatarUrl} {seedingPolicy} {baseUrl} {repo} activeTab="issues">
  <svelte:fragment slot="breadcrumb">
    <Separator />
    <Link
      route={{
        resource: "repo.issues",
        repo: repo.rid,
        node: baseUrl,
      }}>
      Issues
    </Link>
  </svelte:fragment>
  <div slot="header" class="header">
    <Popover
      popoverPadding="0"
      popoverPositionTop="2.5rem"
      popoverBorderRadius="var(--border-radius-md)">
      <Button
        let:expanded
        slot="toggle"
        let:toggle
        on:click={toggle}
        ariaLabel="filter-dropdown"
        title="Filter issues by state">
        <div
          style:color={stateColor[status]}
          style:background={stateBackground[status]}
          style:padding="0.25rem 0.25rem"
          style:border-radius="var(--border-radius-sm)">
          <Icon name={status === "closed" ? "issue-closed" : "issue"} />
        </div>
        {capitalize(status)}
        <div class="dropdown-button-counter">
          {repo.payloads["xyz.radicle.project"].meta.issues[status]}
        </div>
        <Icon name={expanded ? "chevron-up" : "chevron-down"} />
      </Button>

      <DropdownList slot="popover" items={stateOptions}>
        <Link
          on:afterNavigate={() => closeFocused()}
          slot="item"
          let:item
          route={{
            resource: "repo.issues",
            repo: repo.rid,
            node: baseUrl,
            status: item,
          }}>
          <DropdownListItem selected={item === status}>
            <div
              style:color={stateColor[item]}
              style:background={stateBackground[item]}
              style:padding="0.25rem 0.25rem"
              style:border-radius="var(--border-radius-sm)">
              <Icon name={item === "closed" ? "issue-closed" : "issue"} />
            </div>
            <div
              style="display: flex; gap: 1rem;justify-content: space-between; width: 100%;">
              {capitalize(item)}
              <div
                class="dropdown-list-counter"
                class:selected={item === status}>
                {repo.payloads["xyz.radicle.project"].meta.issues[item]}
              </div>
            </div>
          </DropdownListItem>
        </Link>
      </DropdownList>
    </Popover>

    <Share />
  </div>

  <List items={allIssues}>
    <IssueTeaser
      slot="item"
      let:item
      {baseUrl}
      repoId={repo.rid}
      issue={item} />
  </List>

  {#if error}
    <ErrorMessage
      title="Couldn't load issues"
      description="Please make sure you are able to connect to the seed <code>{baseUrlToString(
        api.baseUrl,
      )}</code>"
      {error} />
  {/if}

  {#if repo.payloads["xyz.radicle.project"].meta.issues[status] === 0}
    <div class="placeholder">
      <Placeholder iconName="no-issues" caption={`No ${status} issues`} />
    </div>
  {/if}

  {#if loading || showMoreButton}
    <div class="more">
      {#if loading}
        <Loading noDelay small={page !== 0} center />
      {/if}

      {#if showMoreButton}
        <Button
          size="large"
          variant="outline"
          on:click={() => loadIssues(status)}>
          More
        </Button>
      {/if}
    </div>
  {/if}
</Layout>
