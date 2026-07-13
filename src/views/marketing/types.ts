export interface LandingRoute {
  resource: "landing";
  params: undefined;
}

export interface LearnRoute {
  resource: "learn";
  params: undefined;
}

export interface InstallRoute {
  resource: "install";
  params: undefined;
}

export interface GuidesRoute {
  resource: "guides";
  params: undefined;
}

export interface DesktopRoute {
  resource: "desktop";
  params: undefined;
}

export interface CliRoute {
  resource: "cli";
  params: undefined;
}

export interface PrinciplesRoute {
  resource: "principles";
  params: undefined;
}

export type DocsPage =
  | "faq"
  | "glossary"
  | "download"
  | "guides/getting-started"
  | "guides/protocol"
  | "guides/seeder"
  | "guides/user";

const docsPages: DocsPage[] = [
  "faq",
  "glossary",
  "download",
  "guides/getting-started",
  "guides/protocol",
  "guides/seeder",
  "guides/user",
];

export function isDocsPage(page: string): page is DocsPage {
  return (docsPages as string[]).includes(page);
}

export interface DocsRoute {
  resource: "docs";
  params: { page: DocsPage };
}
