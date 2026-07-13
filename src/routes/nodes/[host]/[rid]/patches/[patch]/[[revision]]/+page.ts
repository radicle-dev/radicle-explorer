import type { PageLoad } from "./$types";

import {
  loadPatchView,
  parsePatchView,
  repoTitle,
} from "@app/views/repos/router";

export const load: PageLoad = async ({ params, url, parent }) => {
  const view = parsePatchView(url.searchParams, params.revision);
  const loaded = await loadPatchView(await parent(), params.patch, view);
  return { ...loaded.params, title: repoTitle(loaded).join(" · ") };
};
