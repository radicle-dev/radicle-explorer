import type { PageLoad } from "./$types";

import { error } from "@sveltejs/kit";

import {
  docsTitle,
  isDocsPage,
  loadDocsView,
} from "@app/views/marketing/router";

export const load: PageLoad = async ({ params }) => {
  const page = `guides/${params.guide}`;
  if (!isDocsPage(page)) {
    error(404, {
      message: "Page not found",
      variant: "notFound",
      title: "Page not found",
    });
  }
  const docs = await loadDocsView(page);
  return { ...docs, title: docsTitle(docs.page).join(" · ") };
};
