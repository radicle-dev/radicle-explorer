import type { PageLoad } from "./$types";

import { loadIssuesView, repoTitle } from "@app/views/repos/router";

export const load: PageLoad = async ({ url, parent }) => {
  const loaded = await loadIssuesView(
    await parent(),
    url.searchParams.get("status"),
  );
  return { ...loaded.params, title: repoTitle(loaded).join(" · ") };
};
