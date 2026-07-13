import type { BaseUrl } from "@http-client";

import { error, isHttpError, isRedirect } from "@sveltejs/kit";

import { baseUrlToString } from "@app/lib/utils";
import { ResponseParseError, ResponseError } from "@http-client/lib/fetcher";

export type RepoErrorSubject = "Commit" | "Issue" | "Patch" | "Repository";

export function handleError(
  err: unknown,
  baseUrl: BaseUrl,
  subject: RepoErrorSubject,
): never {
  // Errors thrown by SvelteKit's `error()` or `redirect()` are already routed
  // responses and must pass through untouched.
  if (isHttpError(err) || isRedirect(err)) {
    throw err;
  }

  const url = baseUrlToString(baseUrl);

  if (err instanceof ResponseError && err.status === 404) {
    error(404, {
      message: `${subject} not found`,
      variant: "notFound",
      title: `${subject} not found`,
    });
  } else if (err instanceof ResponseError) {
    error(err.status >= 400 && err.status <= 599 ? err.status : 502, {
      message: "Could not load this repository",
      variant: "error",
      title: "Could not load this repository",
      description: `Make sure you are able to connect to the seed <a href="${url}">${url}</a>.`,
      cause: err,
    });
  } else if (err instanceof ResponseParseError) {
    error(500, {
      message: "Could not parse the request",
      variant: "error",
      title: "Could not parse the request",
      description: err.description,
      cause: err,
    });
  } else if (err instanceof TypeError && err.message === "Failed to fetch") {
    error(503, {
      message: "Could not connect to",
      variant: "notFound",
      title: "Could not connect to",
      description:
        "The node may be offline or the address may be incorrect.\nSelect a different node to continue.",
      baseUrl,
    });
  } else {
    error(500, {
      message: "Could not load this repository",
      variant: "error",
      title: "Could not load this repository",
      description:
        "You stumbled on an unknown error, we aren’t exactly sure what happened.",
      cause: err instanceof Error ? err : undefined,
    });
  }
}
