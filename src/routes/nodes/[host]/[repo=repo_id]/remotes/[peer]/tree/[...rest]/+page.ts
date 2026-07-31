import type { PageLoad } from "./$types";

import { loadSourcePage } from "@app/views/repos/loads";

export const load: PageLoad = async ({ params, parent }) => {
  return await loadSourcePage(await parent(), params.peer, params.rest);
};
