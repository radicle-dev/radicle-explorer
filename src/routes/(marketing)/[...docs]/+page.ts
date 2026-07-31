import type { PageLoad } from "./$types";

import { loadDocsPage } from "@app/marketing/router";

// Serves the mdsvex docs (`/faq`, `/glossary`, `/download`, `/guides/<page>`).
// As the lowest-priority rest route this is also the global catch-all:
// anything that isn't a known docs page renders the 404 page.
export const load: PageLoad = async ({ params }) => {
  return await loadDocsPage(params.docs);
};
