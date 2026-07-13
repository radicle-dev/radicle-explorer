import type { BaseUrl, NodeIdentity, NodeStats } from "@http-client";

import { error } from "@sveltejs/kit";

import * as utils from "@app/lib/utils";
import { HttpdClient } from "@http-client";
import { handleError } from "@app/views/nodes/error";
import { nodePath } from "@app/views/nodes/router";

export interface UserRoute {
  resource: "users";
  baseUrl: BaseUrl;
  did: string;
}

export interface UserViewParams {
  did: { prefix: string; pubkey: string };
  baseUrl: BaseUrl;
  node: NodeIdentity;
  nodeId: string;
  nodeAvatarUrl: string | undefined;
  stats: NodeStats;
}

export async function loadUserView(
  baseUrl: BaseUrl,
  did: string,
): Promise<UserViewParams> {
  const parsedDid = utils.parseNodeId(decodeURIComponent(did));
  if (!parsedDid) {
    error(400, {
      message: "Invalid user DID provided",
      variant: "error",
      title: "Invalid user DID provided",
      description:
        "The provided DID is invalid. Please review the identifier for any errors and try again.",
      cause: new Error(`invalid user DID provided: ${did}`),
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
    handleError(err, api.baseUrl);
  }
}

export function userRouteToPath(route: UserRoute): string {
  return [nodePath(route.baseUrl), "users", route.did].join("/");
}

export function userTitle(params: UserViewParams): string[] {
  if (params.node.alias) {
    return [params.node.alias, utils.formatDid(params.did)];
  }
  return [utils.formatDid(params.did)];
}
