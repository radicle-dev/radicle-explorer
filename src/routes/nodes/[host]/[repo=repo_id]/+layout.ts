import type { LayoutLoad } from "./$types";

import { extractBaseUrl } from "@app/lib/router";
import { loadRepoLayout } from "@app/views/repos/loads";

export const load: LayoutLoad = async ({ params, depends }) => {
  // Reruns only when the host or repo params change; navigation within a repo
  // reuses the result. Routes that need fresh repo metadata (e.g. issue and
  // patch counts) trigger a background refresh via this dependency token.
  depends("repo:layout");
  return await loadRepoLayout(extractBaseUrl(params.host), params.repo);
};
