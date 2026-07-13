import type { Reroute } from "@sveltejs/kit";

// `/seeds/*` is a legacy alias for `/nodes/*`. Resolve it to the same route
// tree while keeping the original path in the address bar.
export const reroute: Reroute = ({ url }) => {
  if (url.pathname === "/seeds" || url.pathname.startsWith("/seeds/")) {
    return url.pathname.replace(/^\/seeds/, "/nodes");
  }
};
