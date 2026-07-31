import type { PageLoad } from "./$types";

import { error } from "@sveltejs/kit";

import * as utils from "@app/lib/utils";
import { HttpdClient } from "@http-client";
import { extractBaseUrl } from "@app/lib/router";
import { raise } from "@app/views/nodes/error";

export const load: PageLoad = async ({ params }) => {
  const baseUrl = extractBaseUrl(params.host);
  const parsedDid = utils.parseNodeId(decodeURIComponent(params.did));
  if (!parsedDid) {
    error(400, {
      message: "Invalid DID",
      title: "Invalid user DID provided",
      description:
        "The provided DID is invalid. Please review the identifier for any errors and try again.",
      error: new Error(`invalid user DID provided: ${params.did}`),
    });
  }

  const api = new HttpdClient(baseUrl);
  try {
    const [stats, node, user] = await Promise.all([
      api.getStats(),
      api.getNode(),
      api.getNodeIdentity(parsedDid.pubkey),
    ]);

    return {
      did: parsedDid,
      baseUrl,
      node: user,
      nodeId: node.id,
      nodeAvatarUrl: node.avatarUrl,
      stats,
    };
  } catch (err) {
    console.error(err);
    raise(err, baseUrl);
  }
};
