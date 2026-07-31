import type { BaseUrl } from "@http-client";

import config from "@app/lib/config";

export type NodesRouteParams =
  | {
      baseUrl: BaseUrl;
      repoPageIndex: number;
    }
  | undefined;

export interface NodesRoute {
  resource: "nodes";
  params: NodesRouteParams;
}

export function nodePath(baseUrl: BaseUrl) {
  const port = baseUrl.port ?? config.nodes.defaultHttpdPort;

  if (port === config.nodes.defaultHttpdPort) {
    return `/nodes/${baseUrl.hostname}`;
  } else {
    return `/nodes/${baseUrl.hostname}:${port}`;
  }
}
