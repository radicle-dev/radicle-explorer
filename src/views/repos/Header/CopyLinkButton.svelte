<script lang="ts">
  import type { BaseUrl } from "@http-client";

  import config from "@app/lib/config";
  import debounce from "lodash/debounce";
  import { routeToPath } from "@app/lib/router";
  import { toClipboard } from "@app/lib/utils";

  import Button from "@app/components/Button.svelte";
  import Icon from "@app/components/Icon.svelte";

  export let baseUrl: BaseUrl;
  export let repoId: string;

  let shareIcon: "link" | "checkmark" = "link";

  const restoreIcon = debounce(() => {
    shareIcon = "link";
  }, 1000);

  async function copyLink() {
    const origin = new URL(config.nodes.fallbackPublicExplorer).origin;
    await toClipboard(
      origin.concat(
        routeToPath({
          resource: "repo.source",
          repo: repoId,
          node: baseUrl,
          path: "/",
        }),
      ),
    );
    shareIcon = "checkmark";
    restoreIcon();
  }
</script>

<Button variant="outline" size="regular" on:click={copyLink}>
  <Icon name={shareIcon} />
  <span class="global-hide-on-small-desktop-down">Copy link</span>
</Button>
