import type {
  BaseUrl,
  Blob,
  CommitBlob,
  CommitHeader,
  Diff,
  DiffBlob,
  PeerRefs,
  Remote,
  Repo,
} from "@http-client";

import * as Syntax from "@app/lib/syntax";
import { HttpdClient } from "@http-client";
import { cached } from "@app/lib/cache";
import { nodePath } from "@app/views/nodes/router";
import { unreachable } from "@app/lib/utils";

export const PATCHES_PER_PAGE = 10;
export const ISSUES_PER_PAGE = 10;

export function peerHasBranches(peer: PeerRefs): boolean {
  return Object.keys(peer.refs).some(name => name.startsWith("refs/heads/"));
}

export function remoteToPeerRefs(remote: Remote): PeerRefs {
  if (remote.refs) {
    return {
      id: remote.id,
      alias: remote.alias,
      delegate: remote.delegate,
      refs: remote.refs,
    };
  }

  const refs: Record<string, string> = {};

  for (const [name, oid] of Object.entries(remote.heads)) {
    refs[`refs/heads/${name}`] = oid;
  }

  return {
    id: remote.id,
    alias: remote.alias,
    delegate: remote.delegate,
    refs,
  };
}

// `repo` on each route is the repo path segment the user navigated in with:
// an alias when one was used, otherwise the canonical RID. In-repo links are
// built from it so the alias/RID form is preserved across navigation. The
// httpd resolves either form.
export type RepoRoute =
  | RepoTreeRoute
  | RepoHistoryRoute
  | RepoCommitRoute
  | RepoIssuesRoute
  | RepoIssueRoute
  | RepoPatchesRoute
  | RepoPatchRoute;

export interface RepoCommitRoute {
  resource: "repo.commit";
  node: BaseUrl;
  repo: string;
  commit: string;
}

export interface RepoIssuesRoute {
  resource: "repo.issues";
  node: BaseUrl;
  repo: string;
  status?: "open" | "closed";
}

export interface RepoIssueRoute {
  resource: "repo.issue";
  node: BaseUrl;
  repo: string;
  issue: string;
}

export interface RepoTreeRoute {
  resource: "repo.source";
  node: BaseUrl;
  repo: string;
  path?: string;
  peer?: string;
  revision?: string;
  route?: string;
}

export interface RepoHistoryRoute {
  resource: "repo.history";
  node: BaseUrl;
  repo: string;
  peer?: string;
  revision?: string;
}

export interface RepoPatchRoute {
  resource: "repo.patch";
  node: BaseUrl;
  repo: string;
  patch: string;
  view?:
    | {
        name: "activity";
      }
    | {
        name: "changes";
        revision?: string;
      }
    | {
        name: "diff";
        fromCommit: string;
        toCommit: string;
      };
}

export interface RepoPatchesRoute {
  resource: "repo.patches";
  node: BaseUrl;
  repo: string;
  search?: string;
}

export type BlobResult =
  | { ok: true; blob: Blob; highlighted: Syntax.Root | undefined }
  | { ok: false; error: { status?: number; message: string; path: string } };

export type PatchView =
  | {
      name: "activity";
      revision: string;
    }
  | {
      name: "changes";
      revision: string;
      oid: string;
      diff: Diff;
      commits: CommitHeader[];
      files: Record<string, CommitBlob>;
    }
  | {
      name: "diff";
      diff: Diff;
      files: Record<string, DiffBlob>;
      fromCommit: string;
      toCommit: string;
    };

export function projectName(repo: Repo): string {
  return repo.payloads["xyz.radicle.project"]?.data.name ?? repo.rid;
}

export function sourceTitle(repo: Repo): string[] {
  const project = repo.payloads["xyz.radicle.project"];
  if (!project) {
    return [repo.rid];
  }
  if (project.data.description.length > 0) {
    return [project.data.name, project.data.description];
  }
  return [project.data.name];
}

// Check whether the input is a SHA1 commit.
export function isOid(input: string): boolean {
  return /^[a-fA-F0-9]{40}$/.test(input);
}

export const cachedGetDiff = cached(
  async (baseUrl: BaseUrl, rid: string, base: string, oid: string) => {
    const api = new HttpdClient(baseUrl);
    return await api.repo.getDiff(rid, base, oid);
  },
  (...args) => JSON.stringify(args),
  { max: 200 },
);

export const cachedGetDiffStats = cached(
  async (baseUrl: BaseUrl, rid: string, base: string, oid: string) => {
    const api = new HttpdClient(baseUrl);
    return await api.repo.getDiffStats(rid, base, oid);
  },
  (...args) => JSON.stringify(args),
  { max: 200 },
);

export function repoRouteToPath(route: RepoRoute): string {
  const node = nodePath(route.node);

  const pathSegments = [node, route.repo];

  if (route.resource === "repo.source") {
    if (route.peer) {
      pathSegments.push("remotes", route.peer);
    }

    pathSegments.push("tree");
    let omitTree = true;

    if (route.route && route.route !== "/") {
      pathSegments.push(route.route);
      omitTree = false;
    } else {
      if (route.revision) {
        pathSegments.push(route.revision);
        omitTree = false;
      }

      if (route.path && route.path !== "/") {
        pathSegments.push(route.path);
        omitTree = false;
      }
    }
    if (omitTree) {
      pathSegments.pop();
    }

    return pathSegments.join("/");
  } else if (route.resource === "repo.history") {
    if (route.peer) {
      pathSegments.push("remotes", route.peer);
    }

    pathSegments.push("history");

    if (route.revision) {
      pathSegments.push(route.revision);
    }
    return pathSegments.join("/");
  } else if (route.resource === "repo.commit") {
    return [...pathSegments, "commits", route.commit].join("/");
  } else if (route.resource === "repo.issues") {
    let url = [...pathSegments, "issues"].join("/");
    const searchParams = new URLSearchParams();
    if (route.status) {
      searchParams.set("status", route.status);
    }
    if (searchParams.size > 0) {
      url += `?${searchParams}`;
    }
    return url;
  } else if (route.resource === "repo.issue") {
    return [...pathSegments, "issues", route.issue].join("/");
  } else if (route.resource === "repo.patches") {
    let url = [...pathSegments, "patches"].join("/");
    if (route.search) {
      url += `?${route.search}`;
    }
    return url;
  } else if (route.resource === "repo.patch") {
    return patchRouteToPath(route);
  } else {
    return unreachable(route);
  }
}

function patchRouteToPath(route: RepoPatchRoute): string {
  const node = nodePath(route.node);

  const pathSegments = [node, route.repo];

  pathSegments.push("patches", route.patch);
  if (route.view?.name === "changes") {
    if (route.view.revision) {
      pathSegments.push(route.view.revision);
    }
  }

  let url = pathSegments.join("/");
  if (!route.view) {
    return url;
  } else {
    const searchParams = new URLSearchParams();

    if (route.view.name === "diff") {
      searchParams.set(
        "diff",
        `${route.view.fromCommit}..${route.view.toCommit}`,
      );
    } else {
      searchParams.set("tab", route.view.name);
    }
    url += `?${searchParams.toString()}`;
    return url;
  }
}

export const testExports = { isOid };
