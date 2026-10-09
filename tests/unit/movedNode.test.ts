import type { BaseUrl } from "@http-client";

import { afterEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import * as z from "zod";

import {
  Fetcher,
  forgetMovedNodes,
  movedNode,
  redirectTarget,
} from "@http-client/lib/fetcher";
import { bookmarkedSeeds, explicitSeed } from "@app/views/nodes/SeedSelector";

const oldNode: BaseUrl = {
  scheme: "https",
  hostname: "seed.old.tld",
  port: 443,
};
const newNode: BaseUrl = {
  scheme: "https",
  hostname: "seed.new.tld",
  port: 443,
};

function stubFetch(finalUrl: (url: string) => string) {
  const fetch = vi.fn(async (input: string | URL | Request) => {
    const url = input.toString();
    const response = new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
    const final = finalUrl(url);
    Object.defineProperty(response, "url", { value: final });
    Object.defineProperty(response, "redirected", { value: final !== url });
    return response;
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
  forgetMovedNodes();
  explicitSeed.set(undefined);
  bookmarkedSeeds.set([]);
});

describe("redirectTarget", () => {
  const requestUrl = "https://seed.old.tld:443/api/v1/node?x=1";

  test.each([
    ["moved host", "https://seed.new.tld/api/v1/node?x=1", newNode],
    [
      "moved host with port",
      "https://seed.new.tld:8443/api/v1/node?x=1",
      { ...newNode, port: 8443 },
    ],
    ["same origin", "https://seed.old.tld/api/v1/node?x=1", undefined],
    ["other path", "https://seed.new.tld/api/v2/node?x=1", undefined],
    ["dropped query", "https://seed.new.tld/api/v1/node", undefined],
    ["downgrade to http", "http://seed.new.tld/api/v1/node?x=1", undefined],
    ["credentials", "https://u:p@seed.new.tld/api/v1/node?x=1", undefined],
  ])("%s", (_, finalUrl, expected) => {
    expect(
      redirectTarget(requestUrl, { redirected: true, url: finalUrl }),
    ).toEqual(expected);
  });

  test("not redirected", () => {
    expect(
      redirectTarget(requestUrl, {
        redirected: false,
        url: "https://seed.new.tld/api/v1/node?x=1",
      }),
    ).toBeUndefined();
  });

  test("plain http to plain http", () => {
    expect(
      redirectTarget("http://127.0.0.1:8080/api/v1", {
        redirected: true,
        url: "http://127.0.0.2:8080/api/v1",
      }),
    ).toEqual({ scheme: "http", hostname: "127.0.0.2", port: 8080 });
  });
});

describe("Fetcher", () => {
  test("remembers a moved node and requests its new address", async () => {
    const fetch = stubFetch(url => url.replace("seed.old.tld", "seed.new.tld"));
    const fetcher = new Fetcher(oldNode);

    await fetcher.fetchOk({ method: "GET", path: "node" }, z.unknown());
    expect(movedNode(oldNode)).toEqual(newNode);

    await fetcher.fetchOk({ method: "GET", path: "stats" }, z.unknown());
    expect(fetch.mock.calls[1][0]).toMatch(
      /^https:\/\/seed\.new\.tld:443\/api\/v1\/stats/,
    );
  });

  test("ignores a redirect to another path", async () => {
    stubFetch(url => url.replace("seed.old.tld/", "seed.new.tld/login/"));
    await new Fetcher(oldNode).fetchOk(
      { method: "GET", path: "node" },
      z.unknown(),
    );
    expect(movedNode(oldNode)).toBeUndefined();
  });

  test("collapses a node that moved twice", async () => {
    const newest = { ...newNode, hostname: "seed.newest.tld" };
    stubFetch(url => url.replace("seed.old.tld", "seed.new.tld"));
    await new Fetcher(oldNode).fetchOk({ method: "GET" }, z.unknown());
    stubFetch(url => url.replace("seed.new.tld", "seed.newest.tld"));
    await new Fetcher(oldNode).fetchOk({ method: "GET" }, z.unknown());
    expect(movedNode(oldNode)).toEqual(newest);
    expect(movedNode(newNode)).toEqual(newest);
  });

  test("updates the picked and bookmarked seeds", async () => {
    explicitSeed.set(oldNode);
    bookmarkedSeeds.set([oldNode, newNode]);
    stubFetch(url => url.replace("seed.old.tld", "seed.new.tld"));
    await new Fetcher(oldNode).fetchOk({ method: "GET" }, z.unknown());
    expect(get(explicitSeed)).toEqual(newNode);
    expect(get(bookmarkedSeeds)).toEqual([newNode]);
  });
});
