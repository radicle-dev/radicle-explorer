import type { BaseUrl } from "@http-client";

declare global {
  namespace App {
    interface Error {
      message: string;
      variant?: "error" | "notFound";
      title?: string;
      description?: string;
      baseUrl?: BaseUrl;
      icon?: string;
      cause?: unknown;
    }
  }
}

export {};
