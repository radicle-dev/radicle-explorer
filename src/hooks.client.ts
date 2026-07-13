import { Buffer } from "buffer";

import * as modal from "@app/lib/modal";

// Make global 'Buffer' available to legacy modules.
window.Buffer = Buffer;

// Global hotkeys. Registered at client startup — before the initial page
// load has finished — so that key presses landing during boot aren't lost;
// the modal store is picked up by FullscreenModalPortal once it mounts.
window.addEventListener("keydown", (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    modal.hide();
    return;
  }

  switch (event.key) {
    case "?":
      void import("@app/modals/HotkeysModal.svelte").then(mod => {
        modal.toggle({ component: mod.default, props: {} });
      });
      break;
    case "d":
      if (import.meta.env.PROD) {
        return;
      }
      void import("@app/modals/DesignSystemModal.svelte").then(mod => {
        modal.toggle({ component: mod.default, props: {} });
      });
      break;
  }
});
