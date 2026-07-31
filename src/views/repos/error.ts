import type { BaseUrl } from "@http-client";
import type { LoadError } from "@app/lib/error";

import { error } from "@sveltejs/kit";

import { baseUrlToString } from "@app/lib/utils";
import { ResponseParseError, ResponseError } from "@http-client/lib/fetcher";

export type RepoErrorSubject = "Commit" | "Issue" | "Patch" | "Repository";

export function handleError(
  err: unknown,
  baseUrl: BaseUrl,
  subject: RepoErrorSubject = "Repository",
): LoadError {
  const url = baseUrlToString(baseUrl);

  if (err instanceof ResponseError && err.status === 404) {
    return {
      status: 404,
      body: { message: "Not Found", title: `${subject} not found` },
    };
  } else if (err instanceof ResponseError) {
    return {
      status: 500,
      body: {
        message: "Load failed",
        error: err,
        title: "Could not load this repository",
        description: `Make sure you are able to connect to the seed <a href="${url}">${url}</a>.`,
      },
    };
  } else if (err instanceof ResponseParseError) {
    return {
      status: 500,
      body: {
        message: "Load failed",
        error: err,
        title: "Could not parse the request",
        description: err.description,
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
        title: "Could not load this repository",
        description:
          "You stumbled on an unknown error, we aren’t exactly sure what happened.",
      },
    };
  }
}

// Convert a caught load-time error into a thrown SvelteKit error, rendering
// the nearest `+error.svelte`.
export function raise(
  err: unknown,
  baseUrl: BaseUrl,
  subject: RepoErrorSubject = "Repository",
): never {
  const { status, body } = handleError(err, baseUrl, subject);
  error(status, body);
}
