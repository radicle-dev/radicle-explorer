import type { PageLoad } from "./$types";

import { extractBaseUrl } from "@app/lib/router";
import { loadPatchPage, parsePatchView } from "@app/views/repos/loads";

export const load: PageLoad = async ({ params, url, parent }) => {
  // The patch itself comes from the patch layout above, so this load has to
  // wait for `parent()`; the patch fetch already runs in parallel with the
  // repo layout load.
  const { patch } = await parent();
  const requestedView = parsePatchView(url.searchParams, params.revision);
  return await loadPatchPage(
    extractBaseUrl(params.host),
    params.repo,
    patch,
    requestedView,
  );
};
