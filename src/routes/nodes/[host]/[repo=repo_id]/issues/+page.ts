import type { PageLoad } from "./$types";

import { extractBaseUrl } from "@app/lib/router";
import { loadIssuesPage } from "@app/views/repos/loads";

export const load: PageLoad = async ({ params, url }) => {
  const raw = url.searchParams.get("status");
  const status = raw === "open" || raw === "closed" ? raw : "open";
  return await loadIssuesPage(extractBaseUrl(params.host), params.repo, status);
};
