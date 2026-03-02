<script lang="ts">
  import { createIcon } from "@app/lib/blockies";

  export let nodeId: string;
  export let variant: "small" | "large";

  function createContainer(source: string) {
    source = source.replace("did:key:", "");
    const seed = source.toLowerCase();
    const avatar = createIcon({
      seed,
      size: 8,
      scale: 16,
    });
    return avatar.toDataURL();
  }
</script>

<style>
  .avatar {
    display: block;
    box-shadow: 0 0 0 1px var(--color-border-subtle);
    width: inherit;
    object-fit: cover;
    background-size: cover;
    background-repeat: no-repeat;
  }
  .small {
    width: 1rem;
    border-radius: var(--border-radius-full);
  }
  .large {
    width: 4rem;
    border-radius: var(--border-radius-md);
  }
</style>

<img
  title={nodeId}
  src={createContainer(nodeId)}
  class="avatar"
  class:small={variant === "small"}
  class:large={variant === "large"}
  alt="avatar" />
