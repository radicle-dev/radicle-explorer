import type { PageLoad } from "./$types";

import { loadTreeView, repoTitle } from "@app/views/repos/router";

export const load: PageLoad = async ({ params, parent }) => {
  const loaded = await loadTreeView(await parent(), params.peer, params.rest);
  return { ...loaded.params, title: repoTitle(loaded).join(" · ") };
};
