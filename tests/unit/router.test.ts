import { describe, expect, test } from "vitest";
import { testExports, type Route } from "@app/lib/router";
import config from "@tests/support/config.js";

// Defining the window.origin value, since vitest doesn't provide one.
window.origin = "http://localhost:3000";

describe("route invariant when parsed", () => {
  const origin = "http://localhost:3000";
  const node = {
    hostname: "example.node.tld",
    port: 8000,
    scheme: "http",
  };

  test("nodes", () => {
    expectParsingInvariant({
      resource: "nodes",
      params: {
        // TODO: This only works with the value 0. The value is not actually
        // extract.
        repoPageIndex: 0,
        baseUrl: node,
      },
    });
  });
  test("repos.tree", () => {
    expectParsingInvariant({
      resource: "repo.source",
      node,
      repo: "rad:zKtT7DmF9H34KkvcKj9PHW19WzjT",
      route: "",
    });
  });

  test("repos.tree with peer", () => {
    expectParsingInvariant({
      resource: "repo.source",
      node,
      repo: "REPO",
      peer: "PEER",
      route: "",
    });
  });

  test("repos.tree with peer and revision", () => {
    const route: Route = {
      resource: "repo.source",
      node,
      repo: "REPO",
      peer: "PEER",
      revision: "REVISION",
      route: "",
    };
    const path = testExports.routeToPath(route);
    route.revision = undefined;
    route.route = "REVISION";
    expect(testExports.urlToRoute(new URL(path, origin))).toEqual(route);
  });

  test("repos.tree with peer and revision and path", () => {
    const route: Route = {
      resource: "repo.source",
      node,
      repo: "REPO",
      peer: "PEER",
      path: "PATH",
      revision: "REVISION",
      route: "",
    };
    const path = testExports.routeToPath(route);
    route.revision = undefined;
    route.path = undefined;
    route.route = "REVISION/PATH";
    expect(testExports.urlToRoute(new URL(path, origin))).toEqual(route);
  });

  test("repos.history", () => {
    expectParsingInvariant({
      resource: "repo.history",
      node,
      repo: "REPO",
      revision: "",
    });
  });

  test("repos.history with revision", () => {
    expectParsingInvariant({
      resource: "repo.history",
      node,
      repo: "REPO",
      revision: "REVISION",
    });
  });

  test("repos.commits", () => {
    expectParsingInvariant({
      resource: "repo.commit",
      node,
      repo: "REPO",
      commit: "COMMIT",
    });
  });

  test("repos.issues", () => {
    expectParsingInvariant({
      resource: "repo.issues",
      node,
      repo: "REPO",
    });
  });

  test("repos.issues with status", () => {
    expectParsingInvariant({
      resource: "repo.issues",
      node,
      repo: "REPO",
      status: "closed",
    });
  });

  test("repos.issue", () => {
    expectParsingInvariant({
      resource: "repo.issue",
      node,
      repo: "REPO",
      issue: "ISSUE",
    });
  });

  test("repos.patches", () => {
    expectParsingInvariant({
      resource: "repo.patches",
      node,
      repo: "REPO",
      search: "SEARCH",
    });
  });

  test("repos.patches with search", () => {
    expectParsingInvariant({
      resource: "repo.patches",
      node,
      repo: "REPO",
      search: "SEARCH",
    });
  });

  test("repos.patch default view", () => {
    expectParsingInvariant({
      resource: "repo.patch",
      node,
      repo: "REPO",
      patch: "PATCH",
    });
  });

  test("repos.patch activity", () => {
    expectParsingInvariant({
      resource: "repo.patch",
      node,
      repo: "REPO",
      patch: "PATCH",
      view: { name: "activity" },
    });
  });

  test("repos.patch changes", () => {
    expectParsingInvariant({
      resource: "repo.patch",
      node,
      repo: "REPO",
      patch: "PATCH",
      view: { name: "changes" },
    });
  });

  test("repos.patch changes with revision", () => {
    expectParsingInvariant({
      resource: "repo.patch",
      node,
      repo: "REPO",
      patch: "PATCH",
      view: { name: "changes", revision: "REVISION" },
    });
  });

  test("repos.patch diff", () => {
    expectParsingInvariant({
      resource: "repo.patch",
      node,
      repo: "REPO",
      patch: "PATCH",
      view: {
        name: "diff",
        fromCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        toCommit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      },
    });
  });

  function expectParsingInvariant(route: Route) {
    const path = testExports.routeToPath(route);
    expect(testExports.urlToRoute(new URL(path, origin))).toEqual(route);
  }
});

describe("pathToRoute", () => {
  test("non-existent", () => {
    expectPathToRoute("/foo/baz/bar", null);
  });

  test("nodes", () => {
    expectPathToRoute("/nodes/example.node.tld", {
      resource: "nodes",
      params: {
        baseUrl: {
          hostname: "example.node.tld",
          scheme: "http",
          port: config.nodes.defaultHttpdPort,
        },
        repoPageIndex: 0,
      },
    });
  });

  test("repo with trailing slash", () => {
    expectPathToRoute(
      "/nodes/example.node.tld/rad:zKtT7DmF9H34KkvcKj9PHW19WzjT/",
      {
        resource: "repo.source",
        node: {
          hostname: "example.node.tld",
          scheme: "http",
          port: config.nodes.defaultHttpdPort,
        },
        repo: "rad:zKtT7DmF9H34KkvcKj9PHW19WzjT",
        route: "",
      },
    );
  });

  test("repo without trailing slash", () => {
    expectPathToRoute(
      "/nodes/example.node.tld/rad:zKtT7DmF9H34KkvcKj9PHW19WzjT",
      {
        resource: "repo.source",
        node: {
          hostname: "example.node.tld",
          scheme: "http",
          port: config.nodes.defaultHttpdPort,
        },
        repo: "rad:zKtT7DmF9H34KkvcKj9PHW19WzjT",
        route: "",
      },
    );
  });

  test("non-existent repo route", () => {
    expectPathToRoute(
      "/nodes/example.node.tld/rad:zKtT7DmF9H34KkvcKj9PHW19WzjT/nope",
      null,
    );
  });

  function expectPathToRoute(relativeUrl: string, route: Route | null) {
    expect(
      testExports.urlToRoute(new URL(relativeUrl, "http://localhost/")),
    ).toEqual(route);
  }
});
