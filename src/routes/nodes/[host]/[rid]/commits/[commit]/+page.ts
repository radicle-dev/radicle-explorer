import type { PageLoad } from "./$types";

import { loadCommitView, repoTitle } from "@app/views/repos/router";

export const load: PageLoad = async ({ params, parent }) => {
  const loaded = await loadCommitView(await parent(), params.commit);
  return { ...loaded.params, title: repoTitle(loaded).join(" · ") };
};
