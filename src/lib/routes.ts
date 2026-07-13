import type { BaseUrl } from "@http-client";
import type { RepoRoute } from "@app/views/repos/router";
import type { UserRoute } from "@app/views/users/router";
import type { ExploreReposSort } from "@app/views/explore/router";
import type {
  CliRoute,
  DesktopRoute,
  DocsRoute,
  GuidesRoute,
  InstallRoute,
  LandingRoute,
  LearnRoute,
  PrinciplesRoute,
} from "@app/views/marketing/types";

import * as utils from "@app/lib/utils";
import config from "@app/lib/config";
import { exploreReposPath } from "@app/views/explore/router";
import { nodePath } from "@app/views/nodes/router";
import { repoRouteToPath } from "@app/views/repos/router";
import { userRouteToPath } from "@app/views/users/router";

export interface NodesRoute {
  resource: "nodes";
  params: { baseUrl: BaseUrl } | undefined;
}

export interface ExploreRoute {
  resource: "explore";
  params: undefined;
}

export interface ExploreReposRoute {
  resource: "explore.repos";
  params: {
    page: number;
    sort: ExploreReposSort;
  };
}

// The linkable routes of the app. Unlike the pre-SvelteKit router this union
// carries no loading or error states — it exists purely so internal links can
// be constructed type-safely and serialized with `href`.
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

export function href(route: Route): string {
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

/// Return the path the app should navigate to when the user picks a different
/// seed while on the given page. Pages under `/nodes/:host` (node, user and
/// repo views — including their error states, where the attempted URL is
/// preserved) retry the same logical page on the new seed by swapping the host
/// segment. Explore pages resolve the active seed through `selectedSeed`, so
/// they reload unchanged. Error pages without a host in the URL (e.g. an
/// unmatched path) fall back to the new seed's node view, and everything else
/// reloads in place.
export function hrefWithBaseUrl(
  page: { url: URL; error: App.Error | null },
  baseUrl: BaseUrl,
): string {
  const { pathname, search } = page.url;

  if (pathname === "/explore" || pathname.startsWith("/explore/")) {
    return pathname + search;
  }

  const hostMatch = pathname.match(/^\/(?:nodes|seeds)\/[^/]+(\/.*)?$/);
  if (hostMatch) {
    return nodePath(baseUrl) + (hostMatch[1] ?? "") + search;
  }

  if (page.error) {
    return nodePath(baseUrl);
  }

  return pathname + search;
}
