import { describe, expect, test } from "vitest";
import { extractBaseUrl, href } from "@app/lib/routes";
import config from "@tests/support/config.js";

// Defining the window.origin value, since vitest doesn't provide one.
window.origin = "http://localhost:3000";

// URL parsing is SvelteKit's file-based router now, covered by the e2e
// router suite. These tests pin the serialized shape of every linkable
// route so hrefs stay stable.
describe("href", () => {
  const node = {
    hostname: "example.node.tld",
    port: 8000,
    scheme: "http",
  };

  test("nodes without params", () => {
    expect(href({ resource: "nodes", params: undefined })).toEqual("/");
  });

  test("nodes", () => {
    expect(href({ resource: "nodes", params: { baseUrl: node } })).toEqual(
      "/nodes/example.node.tld:8000",
    );
  });

  test("nodes with default port", () => {
    expect(
      href({
        resource: "nodes",
        params: {
          baseUrl: {
            hostname: "example.node.tld",
            port: config.nodes.defaultHttpdPort,
            scheme: "https",
          },
        },
      }),
    ).toEqual("/nodes/example.node.tld");
  });

  test("users", () => {
    expect(
      href({ resource: "users", baseUrl: node, did: "did:key:z6Mk" }),
    ).toEqual("/nodes/example.node.tld:8000/users/did:key:z6Mk");
  });

  test("explore", () => {
    expect(href({ resource: "explore", params: undefined })).toEqual(
      "/explore",
    );
  });

  test("explore.repos default sort", () => {
    expect(
      href({ resource: "explore.repos", params: { page: 0, sort: "seeding" } }),
    ).toEqual("/explore/repos");
  });

  test("explore.repos with page and sort", () => {
    expect(
      href({
        resource: "explore.repos",
        params: { page: 2, sort: "activity" },
      }),
    ).toEqual("/explore/repos?sort=activity&page=2");
  });

  test("marketing routes", () => {
    expect(href({ resource: "landing", params: undefined })).toEqual("/");
    expect(href({ resource: "learn", params: undefined })).toEqual("/learn");
    expect(href({ resource: "install", params: undefined })).toEqual(
      "/install",
    );
    expect(href({ resource: "guides", params: undefined })).toEqual("/guides");
    expect(href({ resource: "desktop", params: undefined })).toEqual(
      "/desktop",
    );
    expect(href({ resource: "cli", params: undefined })).toEqual("/cli");
    expect(href({ resource: "principles", params: undefined })).toEqual(
      "/principles",
    );
    expect(href({ resource: "docs", params: { page: "faq" } })).toEqual("/faq");
    expect(
      href({ resource: "docs", params: { page: "guides/protocol" } }),
    ).toEqual("/guides/protocol");
  });

  test("repo.source", () => {
    expect(
      href({
        resource: "repo.source",
        node,
        repo: "rad:zKtT7DmF9H34KkvcKj9PHW19WzjT",
      }),
    ).toEqual("/nodes/example.node.tld:8000/rad:zKtT7DmF9H34KkvcKj9PHW19WzjT");
  });

  test("repo.source with revision and path", () => {
    expect(
      href({
        resource: "repo.source",
        node,
        repo: "REPO",
        revision: "REVISION",
        path: "PATH",
      }),
    ).toEqual("/nodes/example.node.tld:8000/REPO/tree/REVISION/PATH");
  });

  test("repo.source with peer", () => {
    expect(
      href({
        resource: "repo.source",
        node,
        repo: "REPO",
        peer: "PEER",
        revision: "REVISION",
      }),
    ).toEqual("/nodes/example.node.tld:8000/REPO/remotes/PEER/tree/REVISION");
  });

  test("repo.history", () => {
    expect(href({ resource: "repo.history", node, repo: "REPO" })).toEqual(
      "/nodes/example.node.tld:8000/REPO/history",
    );
    expect(
      href({ resource: "repo.history", node, repo: "REPO", revision: "REV" }),
    ).toEqual("/nodes/example.node.tld:8000/REPO/history/REV");
  });

  test("repo.commit", () => {
    expect(
      href({ resource: "repo.commit", node, repo: "REPO", commit: "COMMIT" }),
    ).toEqual("/nodes/example.node.tld:8000/REPO/commits/COMMIT");
  });

  test("repo.issues", () => {
    expect(href({ resource: "repo.issues", node, repo: "REPO" })).toEqual(
      "/nodes/example.node.tld:8000/REPO/issues",
    );
    expect(
      href({ resource: "repo.issues", node, repo: "REPO", status: "closed" }),
    ).toEqual("/nodes/example.node.tld:8000/REPO/issues?status=closed");
  });

  test("repo.issue", () => {
    expect(
      href({ resource: "repo.issue", node, repo: "REPO", issue: "ISSUE" }),
    ).toEqual("/nodes/example.node.tld:8000/REPO/issues/ISSUE");
  });

  test("repo.patches", () => {
    expect(
      href({ resource: "repo.patches", node, repo: "REPO", search: "S" }),
    ).toEqual("/nodes/example.node.tld:8000/REPO/patches?S");
  });

  test("repo.patch views", () => {
    const base = { resource: "repo.patch", node, repo: "REPO" } as const;
    expect(href({ ...base, patch: "PATCH" })).toEqual(
      "/nodes/example.node.tld:8000/REPO/patches/PATCH",
    );
    expect(
      href({ ...base, patch: "PATCH", view: { name: "activity" } }),
    ).toEqual("/nodes/example.node.tld:8000/REPO/patches/PATCH?tab=activity");
    expect(
      href({
        ...base,
        patch: "PATCH",
        view: { name: "changes", revision: "REVISION" },
      }),
    ).toEqual(
      "/nodes/example.node.tld:8000/REPO/patches/PATCH/REVISION?tab=changes",
    );
    expect(
      href({
        ...base,
        patch: "PATCH",
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
