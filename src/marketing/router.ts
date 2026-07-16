import type { ComponentType } from "svelte";
import type { DocsLoadedRoute, DocsPage, DocsRoute } from "./types";

import { isDocsPage } from "./types";

export type {
  CliRoute,
  DesktopRoute,
  DocsLoadedRoute,
  DocsPage,
  DocsRoute,
  GuidesRoute,
  InstallRoute,
  LandingRoute,
  LearnRoute,
  PrinciplesRoute,
} from "./types";

// Dynamic imports use static specifiers so Vite can bundle each doc as its own
// chunk. The `.md` files are compiled to Svelte components by mdsvex.
const docsLoaders = new Map<
  DocsPage,
  () => Promise<{ default: ComponentType }>
>([
  ["faq", () => import("./docs/faq.md")],
  ["glossary", () => import("./docs/glossary.md")],
  ["download", () => import("./docs/download.md")],
  ["guides/getting-started", () => import("./docs/guides/getting-started.md")],
  ["guides/protocol", () => import("./docs/guides/protocol.md")],
  ["guides/seeder", () => import("./docs/guides/seeder.md")],
  ["guides/user", () => import("./docs/guides/user.md")],
]);

const docsTitles = new Map<DocsPage, string>([
  ["faq", "FAQ"],
  ["glossary", "Glossary"],
  ["download", "Download"],
  ["guides/getting-started", "Getting started"],
  ["guides/protocol", "Protocol guide"],
  ["guides/seeder", "Seeder guide"],
  ["guides/user", "User guide"],
]);

export function docsTitle(page: DocsPage): string[] {
  return [docsTitles.get(page) ?? "Docs", "Radicle"];
}

// Resolve a marketing sub-route from its leading path segment and remainder.
// Gating (only available when `homepage === "landing"`) is enforced by the
// caller in the core router.
export function marketingRoute(
  resource: string,
  segments: string[],
):
  | { resource: "learn"; params: undefined }
  | { resource: "install"; params: undefined }
  | { resource: "guides"; params: undefined }
  | { resource: "desktop"; params: undefined }
  | { resource: "cli"; params: undefined }
  | { resource: "principles"; params: undefined }
  | DocsRoute
  | null {
  switch (resource) {
    case "learn":
      return segments.length === 0
        ? { resource: "learn", params: undefined }
        : null;
    case "install":
      return segments.length === 0
        ? { resource: "install", params: undefined }
        : null;
    case "desktop":
      return segments.length === 0
        ? { resource: "desktop", params: undefined }
        : null;
    case "cli":
      return segments.length === 0
        ? { resource: "cli", params: undefined }
        : null;
    case "principles":
      return segments.length === 0
        ? { resource: "principles", params: undefined }
        : null;
    case "faq":
    case "glossary":
    case "download":
      return segments.length === 0
        ? { resource: "docs", params: { page: resource } }
        : null;
    case "guides": {
      // Bare `/guides` is the all-guides index; `/guides/<page>` is a doc.
      if (segments.length === 0) {
        return { resource: "guides", params: undefined };
      }
      const guide = segments.shift();
      const page = guide ? `guides/${guide}` : undefined;
      if (page && isDocsPage(page) && segments.length === 0) {
        return { resource: "docs", params: { page } };
      }
      return null;
    }
    default:
      return null;
  }
}

export async function loadDocsRoute(
  params: DocsRoute["params"],
): Promise<DocsLoadedRoute> {
  const loader = docsLoaders.get(params.page);
  if (!loader) {
    throw new Error(`Unknown docs page: ${params.page}`);
  }
  const mod = await loader();
  return {
    resource: "docs",
    params: { page: params.page, component: mod.default },
  };
}
