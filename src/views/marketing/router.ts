import type { ComponentType } from "svelte";
import type { DocsPage } from "./types";

import { error } from "@sveltejs/kit";

export type {
  CliRoute,
  DesktopRoute,
  DocsPage,
  DocsRoute,
  GuidesRoute,
  InstallRoute,
  LandingRoute,
  LearnRoute,
  PrinciplesRoute,
} from "./types";

export { isDocsPage } from "./types";

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
  ["guides/getting-started", "Getting Started"],
  ["guides/protocol", "Protocol Guide"],
  ["guides/seeder", "Seeder Guide"],
  ["guides/user", "User Guide"],
]);

export function docsTitle(page: DocsPage): string[] {
  return [docsTitles.get(page) ?? "Docs", "Radicle"];
}

export async function loadDocsView(
  page: DocsPage,
): Promise<{ page: DocsPage; component: ComponentType }> {
  const loader = docsLoaders.get(page);
  if (!loader) {
    error(404, {
      message: "Page not found",
      variant: "notFound",
      title: "Page not found",
    });
  }
  const mod = await loader();
  return { page, component: mod.default };
}
