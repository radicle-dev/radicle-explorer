import type { BaseUrl } from "@http-client";

import isEqual from "lodash/isEqual";
import storedWritable from "@app/lib/localStore";
import * as z from "zod";
import { get } from "svelte/store";

import config from "@app/lib/config";

const seedSchema = z.object({
  hostname: z.string(),
  port: z.number(),
  scheme: z.string(),
});

// Seed that is opened on cold app start on the landing page.
export const selectedSeed = storedWritable<BaseUrl | undefined>(
  "selectedSeed",
  seedSchema,
  undefined,
  !window.localStorage,
);

// A list of seeds that the user has explicitly bookmarked.
export const bookmarkedSeeds = storedWritable<BaseUrl[]>(
  "bookmarkedSeeds",
  z.array(seedSchema),
  [],
  !window.localStorage,
);

export function removeBookmark(seed: BaseUrl) {
  bookmarkedSeeds.update(previous => previous.filter(x => !isEqual(x, seed)));
}

export function addBookmark(seed: BaseUrl) {
  bookmarkedSeeds.update(previous => [...previous, seed]);
}

// First, try using a seed that was selected by the user previously,
// if that fails fall back to the first configured seed,
// if no seeds are configured, fall back to a hardcoded seed.
export function determineSeed() {
  return (
    get(selectedSeed) ??
    config.preferredSeeds[0] ?? {
      schema: "https",
      hostname: "iris.radicle.xyz",
      port: 443,
    }
  );
}
