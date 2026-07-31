import type { BaseUrl, NodeIdentity } from "@http-client";

import * as utils from "@app/lib/utils";
import { nodePath } from "@app/views/nodes/router";

export interface UserRoute {
  resource: "users";
  baseUrl: BaseUrl;
  did: string;
}

export function userRouteToPath(route: UserRoute): string {
  return [nodePath(route.baseUrl), "users", route.did].join("/");
}

export function userTitle(
  node: NodeIdentity,
  did: { prefix: string; pubkey: string },
): string[] {
  if (node.alias) {
    return [node.alias, utils.formatDid(did)];
  }
  return [utils.formatDid(did)];
}
