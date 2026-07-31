import type { BaseUrl } from "@http-client";
import type {
  ResponseError,
  ResponseParseError,
} from "@http-client/lib/fetcher";
import type { ComponentProps } from "svelte";
import type IconLarge from "@app/components/IconLarge.svelte";

declare global {
  namespace App {
    interface Error {
      message: string;
      title: string;
      description?: string;
      error?: globalThis.Error | ResponseParseError | ResponseError;
      icon?: ComponentProps<IconLarge>["name"];
      baseUrl?: BaseUrl;
    }

    interface PageData {
      // Header layout: pages with the constrained, centered header (marketing,
      // explore) set this to false via their area's layout data; the root
      // layout defaults it to true.
      fullWidth?: boolean;
      // Marketing pages get the marketing header variant (mobile nav menu,
      // emphasized call to action).
      marketing?: boolean;
    }
  }
}

export {};
