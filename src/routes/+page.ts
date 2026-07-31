import { HttpdClient } from "@http-client";
import config from "@app/lib/config";
import { determineSeed } from "@app/views/nodes/SeedSelector";
import { raise } from "@app/views/nodes/error";

// `/` serves the marketing landing on `homepage: "landing"` deployments and
// the node view of the user's selected (or default) seed everywhere else —
// in both cases at the `/` URL itself.
export const load = async () => {
  if (config.nodes.homepage === "landing") {
    return { homepage: "landing" as const, fullWidth: false, marketing: true };
  }

  const baseUrl = determineSeed();
  const api = new HttpdClient(baseUrl);

  try {
    const [node, stats] = await Promise.all([api.getNode(), api.getStats()]);

    return { homepage: "node" as const, baseUrl, node, stats };
  } catch (err) {
    raise(err, baseUrl);
  }
};
