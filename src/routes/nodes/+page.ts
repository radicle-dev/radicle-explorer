import { redirect } from "@sveltejs/kit";

import { determineSeed } from "@app/views/nodes/SeedSelector";
import { nodePath } from "@app/views/nodes/router";

// Hostless `/nodes` resolves to the user's selected (or default) seed.
export const load = () => {
  redirect(307, nodePath(determineSeed()));
};
