import type { LayoutLoad } from "./$types";

import { error } from "@sveltejs/kit";

import config from "@app/lib/config";

// The marketing site is only served when the deployment opts in via
// `homepage: "landing"`. On node deployments these paths are not found.
export const load: LayoutLoad = () => {
  if (config.nodes.homepage !== "landing") {
    error(404, {
      message: "Page not found",
      variant: "notFound",
      title: "Page not found",
    });
  }
};
