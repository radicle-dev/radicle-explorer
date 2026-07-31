import type { HandleClientError } from "@sveltejs/kit";

import { Buffer } from "buffer";

import { installHotkeys } from "@app/lib/hotkeys";

// Make global 'Buffer' available to legacy modules.
window.Buffer = Buffer;

installHotkeys();

export const handleError: HandleClientError = ({ error, message }) => {
  console.error(error);

  return {
    message,
    title: "Could not load this route",
    description: "Check your browser's console logs for details.",
    error: error instanceof Error ? error : undefined,
  };
};
