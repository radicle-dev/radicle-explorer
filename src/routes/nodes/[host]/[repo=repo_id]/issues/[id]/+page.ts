import type { PageLoad } from "./$types";

import { extractBaseUrl } from "@app/lib/router";
import { loadIssuePage } from "@app/views/repos/loads";

export const load: PageLoad = async ({ params }) => {
  return await loadIssuePage(
    extractBaseUrl(params.host),
    params.repo,
    params.id,
  );
};
