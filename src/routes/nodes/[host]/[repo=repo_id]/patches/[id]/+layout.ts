import type { LayoutLoad } from "./$types";

import { extractBaseUrl } from "@app/lib/router";
import { loadPatchLayout } from "@app/views/repos/loads";

export const load: LayoutLoad = async ({ params }) => {
  return await loadPatchLayout(
    extractBaseUrl(params.host),
    params.repo,
    params.id,
  );
};
