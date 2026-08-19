<script lang="ts">
  import type { CommitHeader } from "@http-client";

  import {
    absoluteTimestamp,
    formatTimestamp,
    gravatarURL,
  } from "@app/lib/utils";

  export let header: CommitHeader;
</script>

<style>
  .authorship {
    display: flex;
    font: var(--txt-body-m-regular);
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
  }
  .person {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    white-space: nowrap;
    gap: 0.5rem;
  }
  a.person {
    color: inherit;
    text-decoration: none;
  }
  a.person:hover {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
  }
  .avatar {
    width: 1rem;
    height: 1rem;
  }
</style>

<span class="authorship">
  {#if header.author.email === header.committer.email}
    <a class="person" href="mailto:{header.committer.email}">
      <img
        class="avatar"
        alt="avatar"
        src={gravatarURL(header.committer.email)} />
      {header.committer.name}
    </a>
    committed
    <slot />
    <span title={absoluteTimestamp(header.committer.time)}>
      {formatTimestamp(header.committer.time)}
    </span>
    <slot name="after-timestamp" />
  {:else}
    <a class="person" href="mailto:{header.author.email}">
      <img class="avatar" alt="avatar" src={gravatarURL(header.author.email)} />
      {header.author.name}
    </a>
    authored and
    <a class="person" href="mailto:{header.committer.email}">
      <img
        class="avatar"
        alt="avatar"
        src={gravatarURL(header.committer.email)} />
      {header.committer.name}
    </a>
    committed
    <slot />
    <span title={absoluteTimestamp(header.committer.time)}>
      {formatTimestamp(header.committer.time)}
    </span>
    <slot name="after-timestamp" />
  {/if}
</span>
