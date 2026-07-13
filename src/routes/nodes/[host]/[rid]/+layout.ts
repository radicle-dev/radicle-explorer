import type { LayoutLoad } from "./$types";

import { extractBaseUrl } from "@app/lib/routes";
import { loadRepoContext } from "@app/views/repos/router";

// Data shared by all repo pages. Referencing `url` makes this load rerun on
// every navigation, matching the previous router which refetched the repo
// and node identity per navigation — repo metadata like COB counts in the
// tab bar must not go stale while browsing within a repo.
export const load: LayoutLoad = async ({ params, url }) => {
  void url.pathname;
  return await loadRepoContext(extractBaseUrl(params.host), params.rid);
};
