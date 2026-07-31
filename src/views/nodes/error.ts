import type { BaseUrl } from "@http-client";
import type { LoadError } from "@app/lib/error";

import escape from "lodash/escape";
import { error } from "@sveltejs/kit";

import { ResponseParseError, ResponseError } from "@http-client/lib/fetcher";
import { baseUrlToString } from "@app/lib/utils";

export function handleError(err: unknown, baseUrl: BaseUrl): LoadError {
  const url = baseUrlToString(baseUrl);
  const safeUrl = escape(url);

  if (err instanceof ResponseParseError) {
    return {
      status: 500,
      body: {
        message: "Load failed",
        error: err,
        title: "Could not parse the request",
        description: err.description,
        baseUrl,
      },
    };
  } else if (err instanceof ResponseError) {
    return {
      status: 500,
      body: {
        message: "Load failed",
        error: err,
        title: "Could not load this node",
        description: `You’re trying to access a node that is not reachable, make sure the address <a href="${safeUrl}">${safeUrl}</a> is correct and the right ports are exposed if its your node.`,
        baseUrl,
      },
    };
  } else if (err instanceof TypeError && err.message === "Failed to fetch") {
    return {
      status: 404,
      body: {
        message: "Not Found",
        title: "Could not connect to",
        description:
          "The node may be offline or the address may be incorrect.\nSelect a different node to continue.",
        baseUrl,
      },
    };
  } else {
    return {
      status: 500,
      body: {
        message: "Load failed",
        error: err instanceof Error ? err : undefined,
        title: "Could not load this node",
        description:
          "You stumbled on an unknown error, we aren’t exactly sure what happened.",
        baseUrl,
      },
    };
  }
}

// Convert a caught load-time error into a thrown SvelteKit error, rendering
// the nearest `+error.svelte`.
export function raise(err: unknown, baseUrl: BaseUrl): never {
  const { status, body } = handleError(err, baseUrl);
  error(status, body);
}
