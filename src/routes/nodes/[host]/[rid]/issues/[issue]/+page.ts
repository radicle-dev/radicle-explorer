import type { PageLoad } from "./$types";

import { loadIssueView, repoTitle } from "@app/views/repos/router";

export const load: PageLoad = async ({ params, parent }) => {
  const loaded = await loadIssueView(await parent(), params.issue);
  return { ...loaded.params, title: repoTitle(loaded).join(" · ") };
};
