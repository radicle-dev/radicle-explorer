import type { PageLoad } from "./$types";

import { extractBaseUrl } from "@app/lib/router";
import { loadPatchesPage } from "@app/views/repos/loads";

export const load: PageLoad = async ({ params, url }) => {
  return await loadPatchesPage(
    extractBaseUrl(params.host),
    params.repo,
    url.searchParams,
  );
};
