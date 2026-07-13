import type { BaseUrl, NodeStats } from "@http-client";

import isEqual from "lodash/isEqual";
import { error } from "@sveltejs/kit";
import { get } from "svelte/store";

import { HttpdClient, ResponseError } from "@http-client";
import {
  clearSeedFailure,
  failedSeeds,
  markSeedFailed,
  seedCandidates,
} from "@app/views/nodes/SeedSelector";

const SEED_ATTEMPT_TIMEOUT_MS = 10000;

async function tryWithFailover<T>(
  fn: (baseUrl: BaseUrl, signal: AbortSignal) => Promise<T>,
): Promise<{ baseUrl: BaseUrl; result: T } | undefined> {
  // Re-order so seeds that already failed this session are tried last.
  // They stay in the list so a stale failure can't permanently lock the
  // user out — but a healthy seed gets the first 10s of every attempt.
  const failed = get(failedSeeds);
  const isFailed = (s: BaseUrl) => failed.some(f => isEqual(f, s));
  const candidates = seedCandidates();
  const ordered = [
    ...candidates.filter(s => !isFailed(s)),
    ...candidates.filter(s => isFailed(s)),
  ];
  for (const seed of ordered) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEED_ATTEMPT_TIMEOUT_MS);
    try {
      const result = await fn(seed, controller.signal);
      clearTimeout(timer);
      clearSeedFailure(seed);
      return { baseUrl: seed, result };
    } catch (err) {
      clearTimeout(timer);
      markSeedFailed(seed);
      console.warn(`Seed ${seed.hostname} unreachable:`, err);
    }
  }
  return undefined;
}

function noReachableSeed(): never {
  error(503, {
    message: "Unable to reach any seed",
    variant: "error",
    title: "Unable to reach any seed",
    description:
      "We tried every configured seed node and none of them responded. Please try again later.",
  });
}

export type ExploreReposSort = "rid" | "activity" | "seeding";

export interface ExploreViewParams {
  baseUrl: BaseUrl;
  searchAvailable: boolean;
}

export interface ExploreReposViewParams {
  baseUrl: BaseUrl;
  stats: NodeStats;
  page: number;
  sort: ExploreReposSort;
  searchAvailable: boolean;
}

export function explorePath(): string {
  return "/explore";
}

export function exploreReposPath(
  page: number = 0,
  sort: ExploreReposSort = "seeding",
): string {
  const params = new URLSearchParams();
  if (sort !== "seeding") {
    params.set("sort", sort);
  }
  if (page > 0) {
    params.set("page", String(page));
  }
  const qs = params.toString();
  return qs ? `/explore/repos?${qs}` : "/explore/repos";
}

// Parse the `?page=` and `?sort=` search params of the explore repos view.
export function parseExploreReposParams(searchParams: URLSearchParams): {
  page: number;
  sort: ExploreReposSort;
} {
  const page = Number(searchParams.get("page") ?? "0");
  const sortParam = searchParams.get("sort");
  const sort =
    sortParam === "activity"
      ? "activity"
      : sortParam === "rid"
        ? "rid"
        : "seeding";
  return {
    page: Number.isFinite(page) && page > 0 ? page : 0,
    sort,
  };
}

export function exploreTitle(): string[] {
  return ["Explore", "Radicle"];
}

export function exploreReposTitle(sort: ExploreReposSort): string[] {
  const heading =
    sort === "activity"
      ? "Recently active"
      : sort === "seeding"
        ? "Most seeded"
        : "All repos";
  return [heading, "Explore", "Radicle"];
}

export async function loadExploreView(): Promise<ExploreViewParams> {
  const attempt = await tryWithFailover(async (seed, signal) => {
    const api = new HttpdClient(seed);
    // Prefer /info — it tells us whether the seed has a search backend
    // configured. Only fall back to /node on a 404/405 (older httpd that
    // doesn't ship /info yet). Any other failure — network error, abort,
    // 5xx — rethrows so the caller can mark the seed failed and try the
    // next one, instead of silently masking outages as "no search".
    try {
      const info = await api.getInfo({ abort: signal });
      return { searchAvailable: info.httpd.searchAvailable };
    } catch (err) {
      if (
        err instanceof ResponseError &&
        (err.status === 404 || err.status === 405)
      ) {
        await api.getNode({ abort: signal });
        return { searchAvailable: false };
      }
      throw err;
    }
  });

  if (!attempt) {
    noReachableSeed();
  }

  return {
    baseUrl: attempt.baseUrl,
    searchAvailable: attempt.result.searchAvailable,
  };
}

export async function loadExploreReposView(params: {
  page: number;
  sort: ExploreReposSort;
}): Promise<ExploreReposViewParams> {
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
    page: params.page,
    sort: params.sort,
    searchAvailable: attempt.result.searchAvailable,
  };
}
