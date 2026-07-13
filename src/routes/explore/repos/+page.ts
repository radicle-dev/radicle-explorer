import type { PageLoad } from "./$types";

import {
  exploreReposTitle,
  loadExploreReposView,
  parseExploreReposParams,
} from "@app/views/explore/router";

export const load: PageLoad = async ({ url }) => {
  const params = await loadExploreReposView(
    parseExploreReposParams(url.searchParams),
  );
  return { ...params, title: exploreReposTitle(params.sort).join(" · ") };
};
