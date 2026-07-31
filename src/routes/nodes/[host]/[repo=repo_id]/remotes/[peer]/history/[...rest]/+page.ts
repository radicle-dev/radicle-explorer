import type { PageLoad } from "./$types";

import { loadHistoryPage } from "@app/views/repos/loads";

export const load: PageLoad = async ({ params, parent }) => {
  return await loadHistoryPage(await parent(), params.peer, params.rest);
};
