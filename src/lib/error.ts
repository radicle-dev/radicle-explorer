import type {
  ResponseError,
  ResponseParseError,
} from "@http-client/lib/fetcher";

import { writable } from "svelte/store";

export type ErrorParam = Error | ResponseParseError | ResponseError | undefined;

export interface LoadError {
  status: number;
  body: App.Error;
}

// Full-page error state raised by components that fetch outside of route load
// functions (e.g. progressively loaded repo listings). While set, the root
// layout renders the error view in place of the page; it is cleared on the
// next navigation.
export const pageError = writable<LoadError | undefined>(undefined);
