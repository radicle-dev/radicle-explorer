import type { PageLoad } from "./$types";

import { error } from "@sveltejs/kit";

// A bare `/nodes/:host/users` URL (without a DID) is not a page.
export const load: PageLoad = () => {
  error(404, {
    message: "Page not found",
    variant: "notFound",
    title: "Page not found",
  });
};
