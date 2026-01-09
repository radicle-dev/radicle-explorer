import type { BaseUrl } from "@http-client";
import type { LoadedRoute, Route } from "@app/lib/router/definitions";

import { get, writable } from "svelte/store";

import * as mutexExecutor from "@app/lib/mutexExecutor";
import * as utils from "@app/lib/utils";
import config from "@app/lib/config";
import {
  repoRouteToPath,
  repoTitle,
  resolveRepoRoute,
} from "@app/views/repos/router";
import { loadRoute } from "@app/lib/router/definitions";
import { nodePath } from "@app/views/nodes/router";
import { userRouteToPath, userTitle } from "@app/views/users/router";

export { type Route };

const InitialStore = { resource: "booting" as const };

export const isLoading = writable<boolean>(true);
export const activeRouteStore = writable<LoadedRoute>(InitialStore);
export const activeUnloadedRouteStore = writable<Route>(InitialStore);

let currentUrl: URL | undefined;

export function useDefaultNavigation(event: MouseEvent) {
  return (
    event.button !== 0 ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  );
}

export async function loadFromLocation(): Promise<void> {
  await navigateToUrl("replace", new URL(window.location.href));
}

export async function navigateToUrl(
  action: "push" | "replace",
  url: URL,
): Promise<void> {
  const { pathname, hash } = url;

  if (url.origin !== window.origin) {
    throw new Error("Cannot navigate to other origin");
  }

  if (
    currentUrl &&
    currentUrl.pathname === pathname &&
    currentUrl.search === url.search
  ) {
    return;
  }

  const relativeUrl = pathname + url.search + (hash || "");
  url = new URL(relativeUrl, window.origin);
  const route = urlToRoute(url);

  if (route) {
    await navigate(action, route);
  } else {
    await navigate(action, {
      resource: "notFound",
      params: { title: "Page not found" },
    });
  }
}

window.addEventListener("popstate", () => loadFromLocation());

const loadExecutor = mutexExecutor.create();

async function navigate(
  action: "push" | "replace",
  newRoute: Route,
): Promise<void> {
  isLoading.set(true);
  const path = routeToPath(newRoute);

  if (action === "push") {
    window.history.pushState(newRoute, "", path);
  } else if (action === "replace") {
    window.history.replaceState(newRoute, "");
  }
  currentUrl = new URL(window.location.href);
  const currentLoadedRoute = get(activeRouteStore);

  const loadedRoute = await loadExecutor.run(async () => {
    return loadRoute(newRoute, currentLoadedRoute);
  });

  // Only let the last request through.
  if (loadedRoute === undefined) {
    return;
  }

  setTitle(loadedRoute);
  activeRouteStore.set(loadedRoute);
  activeUnloadedRouteStore.set(newRoute);
  isLoading.set(false);
}

function setTitle(loadedRoute: LoadedRoute) {
  const title: string[] = [];

  if (loadedRoute.resource === "booting") {
    title.push("Radicle");
  } else if (loadedRoute.resource === "error") {
    title.push("Error");
    title.push("Radicle");
  } else if (loadedRoute.resource === "users") {
    title.push(...userTitle(loadedRoute));
  } else if (loadedRoute.resource === "notFound") {
    title.push("Page not found");
    title.push("Radicle");
  } else if (
    loadedRoute.resource === "repo.source" ||
    loadedRoute.resource === "repo.history" ||
    loadedRoute.resource === "repo.commit" ||
    loadedRoute.resource === "repo.issue" ||
    loadedRoute.resource === "repo.issues" ||
    loadedRoute.resource === "repo.patches" ||
    loadedRoute.resource === "repo.patch"
  ) {
    title.push(...repoTitle(loadedRoute));
  } else if (loadedRoute.resource === "nodes") {
    title.push(loadedRoute.params.baseUrl.hostname);
  } else {
    utils.unreachable(loadedRoute);
  }

  document.title = title.join(" · ");
}

export async function push(newRoute: Route): Promise<void> {
  await navigate("push", newRoute);
}

export async function replace(newRoute: Route): Promise<void> {
  await navigate("replace", newRoute);
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

function urlToRoute(url: URL): Route | null {
  const segments = url.pathname.substring(1).split("/");

  const resource = segments.shift();
  switch (resource) {
    case "nodes":
    case "seeds": {
      const hostAndPort = segments.shift();
      if (hostAndPort) {
        const baseUrl = extractBaseUrl(hostAndPort);
        const id = segments.shift();
        if (id === "users") {
          const did = segments.shift();
          if (did) {
            return { resource: "users", baseUrl, did };
          }
          return null;
        } else if (id) {
          return resolveRepoRoute(baseUrl, id, segments, url.search);
        } else {
          return {
            resource: "nodes",
            params: { baseUrl, repoPageIndex: 0 },
          };
        }
      } else {
        return {
          resource: "nodes",
          params: undefined,
        };
      }
    }
    case "": {
      return { resource: "nodes", params: undefined };
    }
    default: {
      return null;
    }
  }
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
  } else if (
    route.resource === "booting" ||
    route.resource === "notFound" ||
    route.resource === "error"
  ) {
    return "";
  } else {
    return utils.unreachable(route);
  }
}

export const testExports = { urlToRoute, routeToPath };
