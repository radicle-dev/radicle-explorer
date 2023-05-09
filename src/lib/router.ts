import type { LoadedRoute, Route } from "@app/lib/router/definitions";

import { writable } from "svelte/store";

import * as mutexExecutor from "@app/lib/mutexExecutor";
import { loadRoute } from "@app/lib/router/definitions";
import { unreachable } from "@app/lib/utils";
import {
  resolveProjectRoute,
  updateProjectRoute,
} from "@app/views/projects/router";

// Only used by Safari.
const DOCUMENT_TITLE = "Radicle Interface";

export const isLoading = writable<boolean>(true);
export const activeRouteStore = writable<LoadedRoute>({
  resource: "booting",
});

export function useDefaultNavigation(event: MouseEvent) {
  return (
    event.button !== 0 ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  );
}

export const base = import.meta.env.VITE_HASH_ROUTING ? "./" : "/";

export async function loadFromLocation(): Promise<void> {
  const { pathname, search, hash } = window.location;
  const url = pathname + search + hash;
  const route = pathToRoute(url);

  if (route) {
    await replace(route);
  } else {
    await replace({ resource: "notFound", params: { url } });
  }
}

window.addEventListener("popstate", () => loadFromLocation());

// Gets triggered when clicking on an anchor hash tag e.g. <a href="#header"/>
// Allows the jump to a anchor hash.
window.addEventListener("hashchange", async (event: HashChangeEvent) => {
  const route = pathToRoute(event.newURL);
  if (route?.resource === "projects" && route.params.hash) {
    if (route.params.hash.match(/^L\d+$/)) {
      await updateProjectRoute({ line: route.params.hash });
    } else {
      await updateProjectRoute({ hash: route.params.hash });
    }
  }
});

const loadExecutor = mutexExecutor.create();

async function navigate(
  action: "push" | "replace",
  newRoute: Route,
): Promise<void> {
  isLoading.set(true);

  const loadedRoute = await loadExecutor.run(async () => {
    return loadRoute(newRoute);
  });

  // Only let the last request through.
  if (loadedRoute === undefined) {
    return;
  }

  activeRouteStore.set(loadedRoute);
  isLoading.set(false);

  const path = import.meta.env.VITE_HASH_ROUTING
    ? "#" + routeToPath(newRoute)
    : routeToPath(newRoute);

  if (action === "push") {
    window.history.pushState(newRoute, DOCUMENT_TITLE, path);
  } else if (action === "replace") {
    window.history.replaceState(newRoute, DOCUMENT_TITLE, path);
  }
}

export async function push(newRoute: Route): Promise<void> {
  await navigate("push", newRoute);
}

export async function replace(newRoute: Route): Promise<void> {
  await navigate("replace", newRoute);
}

function pathToRoute(path: string): Route | null {
  // This matches e.g. an empty string
  if (!path) {
    return null;
  }

  const url = new URL(path, window.origin);
  const segments = import.meta.env.VITE_HASH_ROUTING
    ? url.hash.substring(2).split("#")[0].split("/") // Try to remove any additional hashes at the end of the URL.
    : url.pathname.substring(1).split("/");

  const resource = segments.shift();
  switch (resource) {
    case "seeds": {
      const hostnamePort = segments.shift();
      if (hostnamePort) {
        const id = segments.shift();
        if (id) {
          // Allows project paths with or without trailing slash
          if (
            segments.length === 0 ||
            (segments.length === 1 && segments[0] === "")
          ) {
            return {
              resource: "projects",
              params: {
                view: { resource: "tree" },
                id,
                peer: undefined,
                hostnamePort,
              },
            };
          }
          const params = resolveProjectRoute(url, hostnamePort, id, segments);
          if (params) {
            return {
              resource: "projects",
              params: {
                ...params,
                hostnamePort,
                id,
              },
            };
          }
          return null;
        }
        return {
          resource: "seeds",
          params: { hostnamePort, projectPageIndex: 0 },
        };
      }
      return null;
    }
    case "session": {
      const id = segments.shift();
      if (id) {
        return {
          resource: "session",
          params: {
            id,
            signature: url.searchParams.get("sig") ?? "",
            publicKey: url.searchParams.get("pk") ?? "",
          },
        };
      }
      return { resource: "home" };
    }
    case "": {
      return { resource: "home" };
    }
    default: {
      return null;
    }
  }
}

export function routeToPath(route: Route) {
  if (route.resource === "home") {
    return "/";
  } else if (route.resource === "session") {
    return `/session?id=${route.params.id}&sig=${route.params.signature}&pk=${route.params.publicKey}`;
  } else if (route.resource === "seeds") {
    return `/seeds/${route.params.hostnamePort}`;
  } else if (route.resource === "loadError") {
    return "";
  } else if (route.resource === "projects") {
    const hostnamePortPrefix = `/seeds/${route.params.hostnamePort}`;
    const content = `/${route.params.view.resource}`;

    let peer = "";
    if (route.params.peer) {
      peer = `/remotes/${route.params.peer}`;
    }

    let suffix = "";
    if (route.params.route) {
      suffix = `/${route.params.route}`;
    } else {
      if (
        (route.params.view.resource === "tree" ||
          route.params.view.resource === "commits" ||
          route.params.view.resource === "history") &&
        route.params.revision
      ) {
        suffix = `/${route.params.revision}`;
      }
      if (route.params.path && route.params.path !== "/") {
        suffix += `/${route.params.path}`;
      }
    }

    if (route.params.search) {
      suffix += `?${route.params.search}`;
    }
    if (route.params.line) {
      suffix += `#${route.params.line}`;
    } else if (route.params.hash) {
      suffix += `#${route.params.hash}`;
    }

    if (route.params.view.resource === "tree") {
      if (suffix) {
        return `${hostnamePortPrefix}/${route.params.id}${peer}/tree${suffix}`;
      }
      return `${hostnamePortPrefix}/${route.params.id}${peer}`;
    } else if (route.params.view.resource === "commits") {
      return `${hostnamePortPrefix}/${route.params.id}${peer}/commits${suffix}`;
    } else if (route.params.view.resource === "history") {
      return `${hostnamePortPrefix}/${route.params.id}${peer}/history${suffix}`;
    } else if (
      route.params.view.resource === "issues" &&
      route.params.view.params?.view.resource === "new"
    ) {
      return `${hostnamePortPrefix}/${route.params.id}${peer}/issues/new${suffix}`;
    } else if (route.params.view.resource === "issues") {
      return `${hostnamePortPrefix}/${route.params.id}${peer}/issues${suffix}`;
    } else if (route.params.view.resource === "issue") {
      return `${hostnamePortPrefix}/${route.params.id}${peer}/issues/${route.params.view.params.issue}`;
    } else if (route.params.view.resource === "patches") {
      return `${hostnamePortPrefix}/${route.params.id}${peer}/patches${suffix}`;
    } else if (route.params.view.resource === "patch") {
      if (route.params.view.params.revision) {
        return `${hostnamePortPrefix}/${route.params.id}${peer}/patches/${route.params.view.params.patch}/${route.params.view.params.revision}${suffix}`;
      }
      return `${hostnamePortPrefix}/${route.params.id}${peer}/patches/${route.params.view.params.patch}${suffix}`;
    } else {
      return `${hostnamePortPrefix}/${route.params.id}${peer}${content}`;
    }
  } else if (route.resource === "booting") {
    return "";
  } else if (route.resource === "notFound") {
    return route.params.url;
  } else {
    unreachable(route);
  }
}

export const testExports = { pathToRoute };
