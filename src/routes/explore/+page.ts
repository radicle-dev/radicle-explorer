import type { PageLoad } from "./$types";

import { exploreTitle, loadExploreView } from "@app/views/explore/router";

export const load: PageLoad = async () => {
  const params = await loadExploreView();
  return { ...params, title: exploreTitle().join(" · ") };
};
