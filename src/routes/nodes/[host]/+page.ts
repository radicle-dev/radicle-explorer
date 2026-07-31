import type { PageLoad } from "./$types";

import { HttpdClient } from "@http-client";
import { extractBaseUrl } from "@app/lib/router";
import { raise } from "@app/views/nodes/error";

export const load: PageLoad = async ({ params }) => {
  const baseUrl = extractBaseUrl(params.host);
  const api = new HttpdClient(baseUrl);

  try {
    const [node, stats] = await Promise.all([api.getNode(), api.getStats()]);

    return { baseUrl, node, stats };
  } catch (err) {
    raise(err, baseUrl);
  }
};
