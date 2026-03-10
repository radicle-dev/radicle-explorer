<script lang="ts">
  import type { Node } from "@http-client";

  import { truncateId } from "@app/lib/utils";
  import Id from "@app/components/Id.svelte";

  export let node: Node;

  $: externalAddress = node.config?.externalAddresses?.[0];
  $: clipboard = externalAddress ? `${node.id}@${externalAddress}` : node.id;
</script>

<style>
  .address {
    display: flex;
    flex-direction: column;
    min-width: 0;
    width: 100%;
  }

  .line {
    display: block;
    min-width: 0;
    white-space: nowrap;
  }

  .address-line {
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>

<div class="address">
  <Id
    ariaLabel="node-id"
    shorten={false}
    id={clipboard}
    styleWidth="100%"
    title={clipboard}>
    <div class="address">
      <span class="line">{truncateId(node.id)}</span>
      {#if externalAddress}
        <span class="line address-line">@{externalAddress}</span>
      {/if}
    </div>
  </Id>
</div>
