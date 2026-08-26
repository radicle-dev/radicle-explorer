import type {
  ActivityItem,
  BaseUrl,
  ContributionDay,
  NodeIdentity,
  NodeStats,
  UserRepo,
} from "@http-client";
import type { ErrorRoute, NotFoundRoute } from "@app/lib/router/definitions";

import * as utils from "@app/lib/utils";
import { HttpdClient } from "@http-client";
import { ResponseError, ResponseParseError } from "@http-client/lib/fetcher";
import { handleError } from "@app/views/nodes/error";
import { nodePath } from "@app/views/nodes/router";
import { unreachableError } from "@app/views/repos/error";

// A profile's feed is the main thing worth scrolling on the page, so it opens
// with a deep page rather than a teaser and grows from there.
export const USER_ACTIVITY_TAKE = 50;

export interface UserRoute {
  resource: "users";
  baseUrl: BaseUrl;
  did: string;
}

export interface UserLoadedRoute {
  resource: "users";
  params: {
    did: { prefix: string; pubkey: string };
    baseUrl: BaseUrl;
    node: NodeIdentity;
    nodeId: string;
    nodeAvatarUrl: string | undefined;
    stats: NodeStats;
    // The three below are undefined on a node that predates the endpoints
    // behind them, in which case the page renders what it did before: the
    // repos this user delegates, and nothing else.
    repos: UserRepo[] | undefined;
    activity: ActivityItem[] | undefined;
    calendar: ContributionDay[] | undefined;
  };
}

export async function loadUserRoute({
  did,
  baseUrl,
}: UserRoute): Promise<UserLoadedRoute | NotFoundRoute | ErrorRoute> {
  const parsedDid = utils.parseNodeId(decodeURIComponent(did));
  if (!parsedDid) {
    return {
      resource: "error",
      params: {
        title: "Invalid user DID provided",
        description:
          "The provided DID is invalid. Please review the identifier for any errors and try again.",
        error: new Error(`invalid user DID provided: ${did}`),
      },
    };
  }

  const api = new HttpdClient(baseUrl);
  const formattedDid = utils.formatDid(parsedDid);
  try {
    const [stats, node, user] = await Promise.all([
      api.getStats(),
      api.getNode(),
      api.getNodeIdentity(parsedDid.pubkey),
    ]);

    // Older nodes answer these with a 404. The profile is still worth showing
    // without them, so a failure here is not a failure of the route.
    const optional = <T>(what: string, request: Promise<T>) =>
      request.catch((error: unknown) => {
        if (import.meta.env.DEV) {
          console.warn(`could not load ${what} for ${formattedDid}`, error);
        }
        return undefined;
      });

    const [repos, activity, calendar] = await Promise.all([
      optional(
        "repositories",
        api.getUserRepos(formattedDid, { perPage: stats.repos.total }),
      ),
      optional(
        "activity",
        api.getUserActivity(formattedDid, { limit: USER_ACTIVITY_TAKE }),
      ),
      // Every year the calendar can offer, in one request; the node clamps
      // this to its own maximum span.
      optional(
        "contributions",
        api.getUserContributions(formattedDid, { days: 3650 }),
      ),
    ]);

    return {
      resource: "users",
      params: {
        did: parsedDid,
        baseUrl,
        node: user,
        nodeId: node.id,
        nodeAvatarUrl: node.avatarUrl,
        stats,
        repos,
        activity,
        calendar,
      },
    };
  } catch (error) {
    console.error(error);
    if (
      error instanceof Error ||
      error instanceof ResponseError ||
      error instanceof ResponseParseError
    ) {
      return handleError(error, api.baseUrl);
    } else {
      return unreachableError();
    }
  }
}

export function userRouteToPath(route: UserRoute): string {
  return [nodePath(route.baseUrl), "users", route.did].join("/");
}

export function userTitle(route: UserLoadedRoute): string[] {
  if (route.params.node.alias) {
    return [route.params.node.alias, utils.formatDid(route.params.did)];
  }
  return [utils.formatDid(route.params.did)];
}
