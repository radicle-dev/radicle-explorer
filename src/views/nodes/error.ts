import type { BaseUrl } from "@http-client";

import escape from "lodash/escape";
import { error, isHttpError, isRedirect } from "@sveltejs/kit";

import { ResponseParseError, ResponseError } from "@http-client/lib/fetcher";
import { baseUrlToString } from "@app/lib/utils";

export function toNodeAppError(
  err: unknown,
  baseUrl: BaseUrl,
): { status: number } & App.Error {
  const url = baseUrlToString(baseUrl);
  const safeUrl = escape(url);

  if (err instanceof ResponseParseError) {
    return {
      status: 500,
      message: "Could not parse the request",
      variant: "error",
      title: "Could not parse the request",
      description: err.description,
      baseUrl,
      cause: err,
    };
  } else if (err instanceof ResponseError) {
    return {
      status: err.status >= 400 && err.status <= 599 ? err.status : 502,
      message: "Could not load this node",
      variant: "error",
      title: "Could not load this node",
      description: `You’re trying to access a node that is not reachable, make sure the address <a href="${safeUrl}">${safeUrl}</a> is correct and the right ports are exposed if its your node.`,
      baseUrl,
      cause: err,
    };
  } else if (err instanceof TypeError && err.message === "Failed to fetch") {
    return {
      status: 503,
      message: "Could not connect to",
      variant: "notFound",
      title: "Could not connect to",
      description:
        "The node may be offline or the address may be incorrect.\nSelect a different node to continue.",
      baseUrl,
    };
  } else {
    return {
      status: 500,
      message: "Could not load this node",
      variant: "error",
      title: "Could not load this node",
      description:
        "You stumbled on an unknown error, we aren’t exactly sure what happened.",
      baseUrl,
      cause: err instanceof Error ? err : undefined,
    };
  }
}

export function handleError(err: unknown, baseUrl: BaseUrl): never {
  // Errors thrown by SvelteKit's `error()` or `redirect()` are already routed
  // responses and must pass through untouched.
  if (isHttpError(err) || isRedirect(err)) {
    throw err;
  }

  const { status, ...appError } = toNodeAppError(err, baseUrl);
  error(status, appError);
}
