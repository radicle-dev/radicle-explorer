import type {
  ResponseError,
  ResponseParseError,
} from "@http-client/lib/fetcher";

export type ErrorParam = Error | ResponseParseError | ResponseError | undefined;
