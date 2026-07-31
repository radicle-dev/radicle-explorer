import type { BaseUrl } from "@http-client";

import isEqual from "lodash/isEqual";
import { error } from "@sveltejs/kit";
import { get } from "svelte/store";

import {
  clearSeedFailure,
  failedSeeds,
  markSeedFailed,
  seedCandidates,
} from "@app/views/nodes/SeedSelector";

const SEED_ATTEMPT_TIMEOUT_MS = 10000;

// Run `fn` against the configured seeds until one responds. Used by the
// explore page loads, which resolve their seed at load time rather than from
// the URL.
export async function tryWithFailover<T>(
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

export function noReachableSeed(): never {
  error(503, {
    message: "Service Unavailable",
    title: "Unable to reach any seed",
    description:
      "We tried every configured seed node and none of them responded. Please try again later.",
  });
}

export interface ExploreRoute {
  resource: "explore";
  params: undefined;
}

export type ExploreReposSort = "rid" | "activity" | "seeding";

export interface ExploreReposRoute {
  resource: "explore.repos";
  params: {
    page: number;
    sort: ExploreReposSort;
  };
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

// Parse the `?page` and `?sort` query params with the same coercion rules the
// previous router used: non-finite or non-positive pages collapse to 0 and
// unknown sorts to "seeding".
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

export function exploreReposTitle(sort: ExploreReposSort): string[] {
  const heading =
    sort === "activity"
      ? "Recently active"
      : sort === "seeding"
        ? "Most seeded"
        : "All repos";
  return [heading, "Explore", "Radicle"];
}
