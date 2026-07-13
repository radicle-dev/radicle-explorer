import type { PageLoad } from "./$types";

import { extractBaseUrl } from "@app/lib/routes";
import { loadNodeView } from "@app/views/nodes/router";

export const load: PageLoad = async ({ params }) => {
  const viewParams = await loadNodeView(extractBaseUrl(params.host));
  return { ...viewParams, title: viewParams.baseUrl.hostname };
};
