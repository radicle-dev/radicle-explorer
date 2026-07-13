import type { PageLoad } from "./$types";

import { extractBaseUrl } from "@app/lib/routes";
import { loadUserView, userTitle } from "@app/views/users/router";

export const load: PageLoad = async ({ params }) => {
  const viewParams = await loadUserView(
    extractBaseUrl(params.host),
    params.did,
  );
  return { ...viewParams, title: userTitle(viewParams).join(" · ") };
};
