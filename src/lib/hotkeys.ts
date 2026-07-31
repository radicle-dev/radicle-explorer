import * as modal from "@app/lib/modal";

import DesignSystemModal from "@app/modals/DesignSystemModal.svelte";
import HotkeysModal from "@app/modals/HotkeysModal.svelte";

// Installed from `hooks.client.ts` so the hotkeys are active as soon as the
// app scripts run, before the first page load completes.
export function installHotkeys(): void {
  window.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      modal.hide();
      return;
    }

    switch (event.key) {
      case "?":
        modal.toggle({ component: HotkeysModal, props: {} });
        break;
      case "d":
        if (import.meta.env.PROD) {
          return;
        }
        modal.toggle({ component: DesignSystemModal, props: {} });
        break;
    }
  });
}
