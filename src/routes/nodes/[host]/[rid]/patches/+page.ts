import type { PageLoad } from "./$types";

import { loadPatchesView, repoTitle } from "@app/views/repos/router";

export const load: PageLoad = async ({ url, parent }) => {
  const loaded = await loadPatchesView(
    await parent(),
    url.search.replace(/^\?/, ""),
  );
  return { ...loaded.params, title: repoTitle(loaded).join(" · ") };
};
