import { error } from "@sveltejs/kit";

import config from "@app/lib/config";

// The marketing site is only served when the deployment opts in via
// `homepage: "landing"`. On node deployments these paths are not found.
export const load = () => {
  if (config.nodes.homepage !== "landing") {
    error(404, { message: "Not Found", title: "Page not found" });
  }
  return { fullWidth: false, marketing: true };
};
