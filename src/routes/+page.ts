import type { PageLoad } from "./$types";

import config from "@app/lib/config";
import { loadNodeView } from "@app/views/nodes/router";

// Deployments default to the node page for the user's selected (or default)
// seed, rendered directly at `/`; `homepage: "landing"` opts into the full
// marketing site instead.
export const load: PageLoad = async () => {
  if (config.nodes.homepage === "landing") {
    return { kind: "landing" as const };
  }
  const viewParams = await loadNodeView(undefined);
  return {
    kind: "nodes" as const,
    ...viewParams,
    title: viewParams.baseUrl.hostname,
  };
};
