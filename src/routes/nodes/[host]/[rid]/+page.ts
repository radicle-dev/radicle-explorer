import type { PageLoad } from "./$types";

import { loadTreeView, repoTitle } from "@app/views/repos/router";

export const load: PageLoad = async ({ parent }) => {
  const loaded = await loadTreeView(await parent(), undefined, "");
  return { ...loaded.params, title: repoTitle(loaded).join(" · ") };
};
