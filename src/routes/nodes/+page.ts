import type { PageLoad } from "./$types";

import { loadNodeView } from "@app/views/nodes/router";

export const load: PageLoad = async () => {
  const params = await loadNodeView(undefined);
  return { ...params, title: params.baseUrl.hostname };
};
