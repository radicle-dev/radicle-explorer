import type { BaseUrl, Node, NodeStats } from "@http-client";

import config from "@app/lib/config";
import { HttpdClient } from "@http-client";
import { handleError } from "@app/views/nodes/error";
import { determineSeed } from "./SeedSelector";

export interface NodeViewParams {
  baseUrl: BaseUrl;
  stats: NodeStats;
  node: Node;
}

export function nodePath(baseUrl: BaseUrl) {
  const port = baseUrl.port ?? config.nodes.defaultHttpdPort;

  if (port === config.nodes.defaultHttpdPort) {
    return `/nodes/${baseUrl.hostname}`;
  } else {
    return `/nodes/${baseUrl.hostname}:${port}`;
  }
}

export async function loadNodeView(
  baseUrl: BaseUrl | undefined,
): Promise<NodeViewParams> {
  const resolvedBaseUrl = baseUrl ?? determineSeed();
  const api = new HttpdClient(resolvedBaseUrl);

  try {
    const [node, stats] = await Promise.all([api.getNode(), api.getStats()]);

    return {
      baseUrl: resolvedBaseUrl,
      node,
      stats,
    };
  } catch (err) {
    handleError(err, resolvedBaseUrl);
  }
}
