import type { PageLoad } from "./$types";

import { loadSourcePage } from "@app/views/repos/loads";

export const load: PageLoad = async ({ parent }) => {
  return await loadSourcePage(await parent(), undefined, "");
};
