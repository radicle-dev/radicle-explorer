import type { PageLoad } from "./$types";

import { loadHistoryView, repoTitle } from "@app/views/repos/router";

export const load: PageLoad = async ({ params, parent }) => {
  const loaded = await loadHistoryView(
    await parent(),
    params.peer,
    params.rest || undefined,
  );
  return { ...loaded.params, title: repoTitle(loaded).join(" · ") };
};
