import type { PageLoad } from "./$types";

import { HttpdClient, ResponseError } from "@http-client";
import {
  noReachableSeed,
  parseExploreReposParams,
  tryWithFailover,
} from "@app/views/explore/router";

export const load: PageLoad = async ({ url }) => {
  const { page, sort } = parseExploreReposParams(url.searchParams);

  const attempt = await tryWithFailover(async (seed, signal) => {
    const api = new HttpdClient(seed);
    const stats = await api.getStats({ abort: signal });
    // Prefer /info to learn whether the seed has a search backend.
    // Only swallow 404/405 (older httpd without /info); any other
    // failure rethrows so the seed gets marked failed.
    try {
      const info = await api.getInfo({ abort: signal });
      return { stats, searchAvailable: info.httpd.searchAvailable };
    } catch (err) {
      if (
        err instanceof ResponseError &&
        (err.status === 404 || err.status === 405)
      ) {
        return { stats, searchAvailable: false };
      }
      throw err;
    }
  });

  if (!attempt) {
    noReachableSeed();
  }

  return {
    baseUrl: attempt.baseUrl,
    stats: attempt.result.stats,
    page,
    sort,
    searchAvailable: attempt.result.searchAvailable,
  };
};
