import type { BaseUrl } from "@http-client";
import type { LoadedRoute, Route } from "@app/lib/router/definitions";

import { get, writable } from "svelte/store";
import { tick } from "svelte";

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
import { determineSeed } from "@app/views/nodes/SeedSelector";
import { userRouteToPath, userTitle } from "@app/views/users/router";
import { exploreReposPath, exploreTitle } from "@app/views/explore/router";
import { docsTitle, marketingRoute } from "@app/views/marketing/router";

export { type Route };

const InitialStore = { resource: "booting" as const };

export const isLoading = writable<boolean>(true);
export const activeRouteStore = writable<LoadedRoute>(InitialStore);
export const activeUnloadedRouteStore = writable<Route>(InitialStore);

let currentUrl: URL | undefined;

// Scroll restoration. The browser's native restoration is unreliable for a
// client-side router whose content renders asynchronously, so we manage it
// ourselves: every history entry carries a `scrollKey`, and we remember the
// last scroll offset seen for each key. On a back/forward navigation we restore
// the destination entry's offset; on a fresh navigation we scroll to the top,
// or to the URL fragment if the destination carries one.
const HEADER_SCROLL_OFFSET = 80;
const scrollPositions = new Map<number, number>();
let nextScrollKey =
  typeof window !== "undefined"
    ? (readScrollKey(window.history.state) ?? 0)
    : 0;
let pendingRestoreScrollY: number | undefined;

function readScrollKey(state: unknown): number | undefined {
  if (
    state &&
    typeof (state as { scrollKey?: unknown }).scrollKey === "number"
  ) {
    return (state as { scrollKey: number }).scrollKey;
  }
  return undefined;
}

if (typeof window !== "undefined") {
  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }
  // Continuously record the current entry's scroll offset (throttled to one
  // write per frame) so back/forward always has an up-to-date value to restore.
  let scrollFrame = 0;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollFrame) {
        return;
      }
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        const key = readScrollKey(window.history.state);
        if (key !== undefined) {
          scrollPositions.set(key, window.scrollY);
        }
      });
    },
    { passive: true },
  );
}

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
    // Same path and query: the route is unchanged, so we skip reloading it. But
    // a back/forward navigation (popstate) sets `pendingRestoreScrollY`, and it
    // must be consumed here too. Otherwise it lingers and the next navigation
    // wrongly treats itself as a pop — restoring a stale offset and skipping the
    // outgoing entry's scroll save. This is reachable via native hash-only
    // history entries (in-page `#fragment` links, which bypass the router).
    // Restore the remembered offset now, matching the pop branch in `navigate`.
    if (pendingRestoreScrollY !== undefined) {
      window.scrollTo(0, pendingRestoreScrollY);
      pendingRestoreScrollY = undefined;
    }
    return;
  }

  const relativeUrl = pathname + url.search + (hash || "");
  url = new URL(relativeUrl, window.origin);
  const route = urlToRoute(url);

  if (route) {
    await navigate(action, route, hash);
  } else {
    await navigate(action, {
      resource: "notFound",
      params: { title: "Page not found" },
    });
  }
}

window.addEventListener("popstate", event => {
  const key = readScrollKey(event.state);
  pendingRestoreScrollY =
    key !== undefined ? (scrollPositions.get(key) ?? 0) : 0;
  void loadFromLocation();
});

const loadExecutor = mutexExecutor.create();

async function navigate(
  action: "push" | "replace",
  newRoute: Route,
  // Optional URL fragment to preserve, so links like `/faq#general` land on the
  // right section. `routeToPath` builds only the path, so the hash is appended
  // here and picked up by `restoreScroll` below once the view has rendered.
  hash: string = "",
): Promise<void> {
  isLoading.set(true);
  const path = routeToPath(newRoute) + hash;

  // A back/forward navigation sets `pendingRestoreScrollY` from the popstate
  // handler; consume it here so any concurrent push can't inherit it.
  const restoreScrollY = pendingRestoreScrollY;
  pendingRestoreScrollY = undefined;
  const isPop = restoreScrollY !== undefined;

  // Remember the outgoing entry's scroll before we leave it. Skipped on pop:
  // the browser has already made the destination the active entry, so reading
  // `history.state` here would return the destination's key, not the source's.
  if (!isPop) {
    const currentKey = readScrollKey(window.history.state);
    if (currentKey !== undefined) {
      scrollPositions.set(currentKey, window.scrollY);
    }
  }

  if (action === "push") {
    nextScrollKey += 1;
    window.history.pushState(
      { route: newRoute, scrollKey: nextScrollKey },
      "",
      path,
    );
  } else if (action === "replace") {
    let key = readScrollKey(window.history.state);
    if (key === undefined) {
      nextScrollKey += 1;
      key = nextScrollKey;
    }
    window.history.replaceState({ route: newRoute, scrollKey: key }, "");
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

  let applied = false;
  const apply = () => {
    if (applied) {
      return;
    }
    applied = true;
    setTitle(loadedRoute);
    activeRouteStore.set(loadedRoute);
    activeUnloadedRouteStore.set(newRoute);
    isLoading.set(false);
  };

  // Restore the remembered offset on back/forward; otherwise scroll to the
  // destination's fragment, or to the top for a plain navigation. Runs after
  // the new view is in the DOM (post-`tick`) so the target element exists.
  const restoreScroll = () => {
    if (isPop) {
      window.scrollTo(0, restoreScrollY ?? 0);
      return;
    }
    if (hash.length > 1) {
      const el = document.querySelector(hash);
      if (el) {
        const top =
          el.getBoundingClientRect().top +
          window.scrollY -
          HEADER_SCROLL_OFFSET;
        window.scrollTo(0, Math.max(0, top));
        return;
      }
    }
    window.scrollTo(0, 0);
  };

  if (
    shouldAnimateRouteTransition(currentLoadedRoute, loadedRoute) &&
    typeof document.startViewTransition === "function"
  ) {
    const transition = document.startViewTransition(async () => {
      apply();
      await tick();
      restoreScroll();
    });
    // Safety net: the view-transition update callback can be skipped or
    // abandoned when the DOM mutates concurrently (e.g. the header search
    // closing its dropdown as it navigates). If that happens the callback
    // above never runs `apply()`, leaving the route unchanged and the loading
    // indicator stuck. Apply directly in that case so navigation always
    // completes; `apply()` is idempotent so the normal path is unaffected.
    transition.updateCallbackDone.catch(() => {
      apply();
      restoreScroll();
    });
  } else {
    apply();
    await tick();
    restoreScroll();
  }
}

function shouldAnimateRouteTransition(
  previous: LoadedRoute,
  next: LoadedRoute,
): boolean {
  const isRepo = (r: LoadedRoute) => r.resource.startsWith("repo.");
  // Run the global page transition (fade + slide, see index.css) on every
  // client-side navigation, except:
  // - the initial load, where `previous` is still the "booting" placeholder;
  //   the first page should paint instantly rather than slide in.
  // - navigation between two repo pages (e.g. switching tabs within a repo),
  //   where a full-page slide would be distracting.
  if (previous.resource === "booting") {
    return false;
  }
  return !(isRepo(previous) && isRepo(next));
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
  } else if (
    loadedRoute.resource === "explore" ||
    loadedRoute.resource === "explore.repos"
  ) {
    title.push(...exploreTitle(loadedRoute));
  } else if (loadedRoute.resource === "landing") {
    title.push("Radicle");
  } else if (loadedRoute.resource === "learn") {
    title.push("Learn", "Radicle");
  } else if (loadedRoute.resource === "install") {
    title.push("Install", "Radicle");
  } else if (loadedRoute.resource === "guides") {
    title.push("Guides", "Radicle");
  } else if (loadedRoute.resource === "desktop") {
    title.push("Desktop", "Radicle");
  } else if (loadedRoute.resource === "cli") {
    title.push("CLI", "Radicle");
  } else if (loadedRoute.resource === "principles") {
    title.push("How it works", "Radicle");
  } else if (loadedRoute.resource === "docs") {
    title.push(...docsTitle(loadedRoute.params.page));
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

/// Return a copy of `route` with any baseUrl-bearing field replaced by
/// `baseUrl`. Used by the SeedPicker so that selecting a different seed
/// from e.g. an "unreachable node" error view retries the same logical
/// page (repo, user, node) on the new seed instead of looping on the
/// original bad host. A not-found page is tied to a specific node/repo, so
/// it retries the node view on the chosen seed. Error and booting routes
/// carry no logical page to preserve, so they return to the app's home
/// (the marketing landing for `homepage: "landing"`, otherwise the node page),
/// which resolves the just-selected seed via `selectedSeed`. Explore routes have
/// no baseUrl field and resolve the active seed via `selectedSeed`, so they
/// pass through unchanged.
export function withBaseUrl(route: Route, baseUrl: BaseUrl): Route {
  switch (route.resource) {
    case "nodes":
      return {
        ...route,
        params: { baseUrl, repoPageIndex: route.params?.repoPageIndex ?? 0 },
      };
    case "users":
      return { ...route, baseUrl };
    case "repo.source":
    case "repo.history":
    case "repo.commit":
    case "repo.issues":
    case "repo.issue":
    case "repo.patches":
    case "repo.patch":
      return { ...route, node: baseUrl };
    case "notFound":
      return {
        resource: "nodes",
        params: { baseUrl, repoPageIndex: 0 },
      };
    case "error":
    case "booting":
      return homeRoute();
    default:
      return route;
  }
}

/// Resolve the route that backs the `/` URL. Deployments default to the node
/// page for the user's selected (or default) seed; `homepage: "landing"` opts
/// into the full marketing site instead.
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

function urlToRoute(url: URL): Route | null {
  // Normalize a trailing slash (`/guides/protocol/` → `/guides/protocol`) so
  // both the strict marketing resolver and the lenient repo resolver agree.
  // Without this the residual empty segment makes marketing routes 404 while
  // repo routes silently absorb it. `|| "/"` keeps the root path intact.
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const segments = pathname.substring(1).split("/");

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
    case "explore": {
      const sub = segments.shift();
      if (sub === undefined) {
        return { resource: "explore", params: undefined };
      }
      if (sub === "repos") {
        const page = Number(url.searchParams.get("page") ?? "0");
        const sortParam = url.searchParams.get("sort");
        const sort =
          sortParam === "activity"
            ? "activity"
            : sortParam === "rid"
              ? "rid"
              : "seeding";
        return {
          resource: "explore.repos",
          params: {
            page: Number.isFinite(page) && page > 0 ? page : 0,
            sort,
          },
        };
      }
      return null;
    }
    case "learn":
    case "install":
    case "faq":
    case "glossary":
    case "download":
    case "guides":
    case "desktop":
    case "cli":
    case "principles": {
      // The marketing site is only served when the deployment opts in via
      // `homepage: "landing"`. On node deployments these paths are not found.
      if (config.nodes.homepage !== "landing") {
        return null;
      }
      return marketingRoute(resource, segments);
    }
    case "": {
      return homeRoute();
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

export const testExports = { urlToRoute, routeToPath, extractBaseUrl };
