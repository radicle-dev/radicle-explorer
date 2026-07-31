import { describe, expect, test, vi } from "vitest";
import { extractBaseUrl, retargetSeed, routeToPath } from "@app/lib/router";
import config from "@tests/support/config.js";

// Pin the homepage mode so these tests don't depend on a gitignored
// `config/local.json` override.
vi.mock("@app/lib/config", async importOriginal => {
  const original = await importOriginal<typeof import("@app/lib/config")>();
  return {
    default: {
      ...original.default,
      nodes: { ...original.default.nodes, homepage: "node" },
    },
  };
});

// Defining the window.origin value, since vitest doesn't provide one.
window.origin = "http://localhost:3000";

// URL parsing is handled by SvelteKit's file-based router (covered by the e2e
// router spec); these tests pin down the serialization side — the link
// builders every `<a href={routeToPath(...)}>` in the app relies on.
describe("routeToPath", () => {
  const node = {
    hostname: "example.node.tld",
    port: 8000,
    scheme: "http",
  };

  test("nodes", () => {
    expect(
      routeToPath({
        resource: "nodes",
        params: { repoPageIndex: 0, baseUrl: node },
      }),
    ).toEqual("/nodes/example.node.tld:8000");
  });

  test("nodes with default port omits the port", () => {
    expect(
      routeToPath({
        resource: "nodes",
        params: {
          repoPageIndex: 0,
          baseUrl: {
            hostname: "example.node.tld",
            port: config.nodes.defaultHttpdPort,
            scheme: config.nodes.defaultHttpdScheme,
          },
        },
      }),
    ).toEqual("/nodes/example.node.tld");
  });

  test("users", () => {
    expect(
      routeToPath({ resource: "users", baseUrl: node, did: "did:key:DID" }),
    ).toEqual("/nodes/example.node.tld:8000/users/did:key:DID");
  });

  test("explore", () => {
    expect(routeToPath({ resource: "explore", params: undefined })).toEqual(
      "/explore",
    );
  });

  test("explore.repos omits default params", () => {
    expect(
      routeToPath({
        resource: "explore.repos",
        params: { page: 0, sort: "seeding" },
      }),
    ).toEqual("/explore/repos");
    expect(
      routeToPath({
        resource: "explore.repos",
        params: { page: 2, sort: "activity" },
      }),
    ).toEqual("/explore/repos?sort=activity&page=2");
  });

  test("repo.source bare", () => {
    expect(
      routeToPath({
        resource: "repo.source",
        node,
        repo: "rad:zKtT7DmF9H34KkvcKj9PHW19WzjT",
        route: "",
      }),
    ).toEqual("/nodes/example.node.tld:8000/rad:zKtT7DmF9H34KkvcKj9PHW19WzjT");
  });

  test("repo.source with peer", () => {
    expect(
      routeToPath({
        resource: "repo.source",
        node,
        repo: "REPO",
        peer: "PEER",
        route: "",
      }),
    ).toEqual("/nodes/example.node.tld:8000/REPO/remotes/PEER");
  });

  test("repo.source with revision and path", () => {
    expect(
      routeToPath({
        resource: "repo.source",
        node,
        repo: "REPO",
        revision: "REVISION",
        path: "PATH",
      }),
    ).toEqual("/nodes/example.node.tld:8000/REPO/tree/REVISION/PATH");
  });

  test("repo.source with raw route remainder", () => {
    expect(
      routeToPath({
        resource: "repo.source",
        node,
        repo: "REPO",
        route: "REVISION/PATH",
      }),
    ).toEqual("/nodes/example.node.tld:8000/REPO/tree/REVISION/PATH");
  });

  test("repo.history", () => {
    expect(
      routeToPath({
        resource: "repo.history",
        node,
        repo: "REPO",
        revision: "",
      }),
    ).toEqual("/nodes/example.node.tld:8000/REPO/history");
    expect(
      routeToPath({
        resource: "repo.history",
        node,
        repo: "REPO",
        peer: "PEER",
        revision: "REVISION",
      }),
    ).toEqual(
      "/nodes/example.node.tld:8000/REPO/remotes/PEER/history/REVISION",
    );
  });

  test("repo.commit", () => {
    expect(
      routeToPath({
        resource: "repo.commit",
        node,
        repo: "REPO",
        commit: "COMMIT",
      }),
    ).toEqual("/nodes/example.node.tld:8000/REPO/commits/COMMIT");
  });

  test("repo.issues", () => {
    expect(
      routeToPath({ resource: "repo.issues", node, repo: "REPO" }),
    ).toEqual("/nodes/example.node.tld:8000/REPO/issues");
    expect(
      routeToPath({
        resource: "repo.issues",
        node,
        repo: "REPO",
        status: "closed",
      }),
    ).toEqual("/nodes/example.node.tld:8000/REPO/issues?status=closed");
  });

  test("repo.issue", () => {
    expect(
      routeToPath({ resource: "repo.issue", node, repo: "REPO", issue: "ID" }),
    ).toEqual("/nodes/example.node.tld:8000/REPO/issues/ID");
  });

  test("repo.patches passes the search string through", () => {
    expect(
      routeToPath({
        resource: "repo.patches",
        node,
        repo: "REPO",
        search: "status=merged",
      }),
    ).toEqual("/nodes/example.node.tld:8000/REPO/patches?status=merged");
  });

  test("repo.patch views", () => {
    const base = {
      resource: "repo.patch",
      node,
      repo: "REPO",
      patch: "PATCH",
    } as const;
    expect(routeToPath(base)).toEqual(
      "/nodes/example.node.tld:8000/REPO/patches/PATCH",
    );
    expect(routeToPath({ ...base, view: { name: "activity" } })).toEqual(
      "/nodes/example.node.tld:8000/REPO/patches/PATCH?tab=activity",
    );
    expect(
      routeToPath({
        ...base,
        view: { name: "changes", revision: "REVISION" },
      }),
    ).toEqual(
      "/nodes/example.node.tld:8000/REPO/patches/PATCH/REVISION?tab=changes",
    );
    expect(
      routeToPath({
        ...base,
        view: {
          name: "diff",
          fromCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          toCommit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
      }),
    ).toEqual(
      "/nodes/example.node.tld:8000/REPO/patches/PATCH?diff=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa..bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    );
  });

  test("marketing paths", () => {
    expect(routeToPath({ resource: "landing", params: undefined })).toEqual(
      "/",
    );
    expect(routeToPath({ resource: "learn", params: undefined })).toEqual(
      "/learn",
    );
    expect(
      routeToPath({ resource: "docs", params: { page: "guides/protocol" } }),
    ).toEqual("/guides/protocol");
  });
});

describe("retargetSeed", () => {
  const seed = {
    hostname: "seed.example",
    port: config.nodes.defaultHttpdPort,
    scheme: config.nodes.defaultHttpdScheme,
  };

  test("swaps the host segment on node URLs", () => {
    expect(
      retargetSeed(new URL("http://localhost:3000/nodes/old.host:8000"), seed),
    ).toEqual("/nodes/seed.example");
  });

  test("keeps the rest of the path and query", () => {
    expect(
      retargetSeed(
        new URL(
          "http://localhost:3000/nodes/old.host/REPO/issues?status=closed",
        ),
        seed,
      ),
    ).toEqual("/nodes/seed.example/REPO/issues?status=closed");
  });

  test("passes explore URLs through unchanged", () => {
    expect(
      retargetSeed(
        new URL("http://localhost:3000/explore/repos?sort=activity"),
        seed,
      ),
    ).toEqual("/explore/repos?sort=activity");
  });

  test("falls back to the seed's node page elsewhere", () => {
    expect(retargetSeed(new URL("http://localhost:3000/learn"), seed)).toEqual(
      "/nodes/seed.example",
    );
  });
});

describe("extractBaseUrl", () => {
  test("hostname with explicit port", () => {
    const result = extractBaseUrl("example.com:9000");
    expect(result).toEqual({
      hostname: "example.com",
      port: 9000,
      scheme: config.nodes.defaultHttpdScheme,
    });
  });

  test("hostname without port uses default port and scheme", () => {
    const result = extractBaseUrl("example.com");
    expect(result).toEqual({
      hostname: "example.com",
      port: config.nodes.defaultHttpdPort,
      scheme: config.nodes.defaultHttpdScheme,
    });
  });

  test("localhost without port uses local port and http scheme", () => {
    const result = extractBaseUrl("localhost");
    expect(result).toEqual({
      hostname: "localhost",
      port: config.nodes.defaultLocalHttpdPort,
      scheme: "http",
    });
  });

  test("localhost with explicit port uses http scheme", () => {
    const result = extractBaseUrl("localhost:3000");
    expect(result).toEqual({
      hostname: "localhost",
      port: 3000,
      scheme: "http",
    });
  });

  test("wildcard localhost domain without port uses local port and http scheme", () => {
    const result = extractBaseUrl("app.localhost");
    expect(result).toEqual({
      hostname: "app.localhost",
      port: config.nodes.defaultLocalHttpdPort,
      scheme: "http",
    });
  });

  test("127.0.0.1 without port uses local port and http scheme", () => {
    const result = extractBaseUrl("127.0.0.1");
    expect(result).toEqual({
      hostname: "127.0.0.1",
      port: config.nodes.defaultLocalHttpdPort,
      scheme: "http",
    });
  });

  test("127.0.0.1 with explicit port uses http scheme", () => {
    const result = extractBaseUrl("127.0.0.1:8080");
    expect(result).toEqual({
      hostname: "127.0.0.1",
      port: 8080,
      scheme: "http",
    });
  });

  test("onion domain without port uses default port and http scheme", () => {
    const result = extractBaseUrl("example.onion");
    expect(result).toEqual({
      hostname: "example.onion",
      port: config.nodes.defaultHttpdPort,
      scheme: "http",
    });
  });

  test("onion domain with explicit port uses http scheme", () => {
    const result = extractBaseUrl("example.onion:9050");
    expect(result).toEqual({
      hostname: "example.onion",
      port: 9050,
      scheme: "http",
    });
  });

  test("URL-encoded hostname is decoded", () => {
    const result = extractBaseUrl("example.com%3A8000");
    expect(result).toEqual({
      hostname: "example.com",
      port: 8000,
      scheme: config.nodes.defaultHttpdScheme,
    });
  });
});
