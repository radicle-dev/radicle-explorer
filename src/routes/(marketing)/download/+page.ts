import type { PageLoad } from "./$types";

import { docsTitle, loadDocsView } from "@app/views/marketing/router";

export const load: PageLoad = async () => {
  const docs = await loadDocsView("download");
  return { ...docs, title: docsTitle(docs.page).join(" · ") };
};
