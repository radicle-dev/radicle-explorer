import type { BaseUrl } from "@http-client";
import type {
  ResponseError,
  ResponseParseError,
} from "@http-client/lib/fetcher";
import type { RepoLoadedRoute, RepoRoute } from "@app/views/repos/router";
import type { UserLoadedRoute, UserRoute } from "@app/views/users/router";
import type { NodesRoute, NodesLoadedRoute } from "@app/views/nodes/router";
import { loadRepoRoute } from "@app/views/repos/router";
import { loadUserRoute } from "@app/views/users/router";
import { loadNodeRoute } from "@app/views/nodes/router";

interface BootingRoute {
  resource: "booting";
}

export interface NotFoundRoute {
  resource: "notFound";
  params: { title: string; description?: string; baseUrl?: BaseUrl };
}

export type ErrorParam = Error | ResponseParseError | ResponseError | undefined;

export interface ErrorRoute {
  resource: "error";
  params: {
    title: string;
    description: string;
    error?: ErrorParam;
  };
}

export type Route =
  | BootingRoute
  | UserRoute
  | ErrorRoute
  | NotFoundRoute
  | RepoRoute
  | NodesRoute;

export type LoadedRoute =
  | BootingRoute
  | UserLoadedRoute
  | ErrorRoute
  | NotFoundRoute
  | RepoLoadedRoute
  | NodesLoadedRoute;

export async function loadRoute(
  route: Route,
  previousLoaded: LoadedRoute,
): Promise<LoadedRoute> {
  if (route.resource === "nodes") {
    return await loadNodeRoute(route.params);
  } else if (route.resource === "users") {
    return await loadUserRoute(route);
  } else if (
    route.resource === "repo.source" ||
    route.resource === "repo.history" ||
    route.resource === "repo.commit" ||
    route.resource === "repo.issues" ||
    route.resource === "repo.issue" ||
    route.resource === "repo.patches" ||
    route.resource === "repo.patch"
  ) {
    return await loadRepoRoute(route, previousLoaded);
  } else {
    return route;
  }
}
