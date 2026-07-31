import type { BaseUrl } from "@http-client";
import type { RepoRoute } from "@app/views/repos/router";
import type { UserRoute } from "@app/views/users/router";
import type { NodesRoute } from "@app/views/nodes/router";
import type {
  ExploreReposRoute,
  ExploreRoute,
} from "@app/views/explore/router";
import type {
  CliRoute,
  DesktopRoute,
  DocsRoute,
  GuidesRoute,
  InstallRoute,
  LandingRoute,
  LearnRoute,
  PrinciplesRoute,
} from "@app/marketing/types";

import * as utils from "@app/lib/utils";
import config from "@app/lib/config";
import { repoRouteToPath } from "@app/views/repos/router";
import { nodePath } from "@app/views/nodes/router";
import { determineSeed } from "@app/views/nodes/SeedSelector";
import { userRouteToPath } from "@app/views/users/router";
import { exploreReposPath } from "@app/views/explore/router";

// A `Route` is a typed link descriptor: a structured value describing a
// location in the app. Navigation itself is handled by SvelteKit; this type
// and `routeToPath` exist so links can be built type-safely instead of by
// string concatenation.
export type Route =
  | UserRoute
  | RepoRoute
  | NodesRoute
  | ExploreRoute
  | ExploreReposRoute
  | LandingRoute
  | LearnRoute
  | InstallRoute
  | GuidesRoute
  | DesktopRoute
  | CliRoute
  | PrinciplesRoute
  | DocsRoute;

// Resolve the route that backs the `/` URL. Deployments default to the node
// page for the user's selected (or default) seed; `homepage: "landing"` opts
// into the full marketing site instead.
export function homeRoute(): Route {
  if (config.nodes.homepage === "landing") {
    return { resource: "landing", params: undefined };
  }
  return {
    resource: "nodes",
    params: { baseUrl: determineSeed(), repoPageIndex: 0 },
  };
}

export function extractBaseUrl(hostAndPort: string): BaseUrl {
  const [hostname, portString] = decodeURIComponent(hostAndPort).split(":");

  let port;

  if (portString !== undefined) {
    port = Number(portString);
  } else if (globalThis.__PLAYWRIGHT__ === true) {
    port = config.nodes.defaultHttpdPort;
  } else {
    port = utils.isLocal(hostname)
      ? config.nodes.defaultLocalHttpdPort
      : config.nodes.defaultHttpdPort;
  }

  const scheme =
    utils.isLocal(hostname) || utils.isOnion(hostname)
      ? "http"
      : config.nodes.defaultHttpdScheme;

  return {
    hostname,
    port,
    scheme,
  };
}

export function routeToPath(route: Route): string {
  if (route.resource === "nodes") {
    if (route.params === undefined) {
      return "/";
    } else {
      return nodePath(route.params.baseUrl);
    }
  } else if (route.resource === "users") {
    return userRouteToPath(route);
  } else if (route.resource === "explore") {
    return "/explore";
  } else if (route.resource === "explore.repos") {
    return exploreReposPath(route.params.page, route.params.sort);
  } else if (route.resource === "landing") {
    return "/";
  } else if (route.resource === "learn") {
    return "/learn";
  } else if (route.resource === "install") {
    return "/install";
  } else if (route.resource === "guides") {
    return "/guides";
  } else if (route.resource === "desktop") {
    return "/desktop";
  } else if (route.resource === "cli") {
    return "/cli";
  } else if (route.resource === "principles") {
    return "/principles";
  } else if (route.resource === "docs") {
    return `/${route.params.page}`;
  } else if (
    route.resource === "repo.source" ||
    route.resource === "repo.history" ||
    route.resource === "repo.commit" ||
    route.resource === "repo.issues" ||
    route.resource === "repo.issue" ||
    route.resource === "repo.patches" ||
    route.resource === "repo.patch"
  ) {
    return repoRouteToPath(route);
  } else {
    return utils.unreachable(route);
  }
}

// Return the path of the same logical page on a different seed. Used by the
// SeedPicker so that selecting a different seed from e.g. an "unreachable
// node" error view retries the same page (repo, user, node) on the new seed
// instead of looping on the original bad host. Explore routes resolve the
// active seed at load time via `selectedSeed`, so their URL passes through
// unchanged. Anything else returns to the app's home (the marketing landing
// for `homepage: "landing"`, otherwise the node page of the chosen seed).
export function retargetSeed(url: URL, seed: BaseUrl): string {
  const segments = (url.pathname.replace(/\/+$/, "") || "/")
    .substring(1)
    .split("/");

  if (segments[0] === "nodes" || segments[0] === "seeds") {
    const rest = segments.slice(2);
    return [nodePath(seed), ...rest].join("/") + url.search;
  }
  if (segments[0] === "explore") {
    return url.pathname + url.search;
  }
  if (config.nodes.homepage === "landing") {
    return "/";
  }
  return nodePath(seed);
}
