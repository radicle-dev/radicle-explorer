import type { PageLoad } from "./$types";

import { extractBaseUrl } from "@app/lib/router";
import { loadCommitPage } from "@app/views/repos/loads";

export const load: PageLoad = async ({ params }) => {
  return await loadCommitPage(
    extractBaseUrl(params.host),
    params.repo,
    params.sha,
  );
};
