import type {
  ErrorRoute,
  LoadedRoute,
  NotFoundRoute,
} from "@app/lib/router/definitions";
import type {
  BaseUrl,
  Blob,
  Commit,
  CommitBlob,
  CommitHeader,
  Diff,
  DiffBlob,
  Issue,
  IssueState,
  Node,
  Patch,
  PatchState,
  Repo,
  Remote,
  Revision,
  SeedingPolicy,
  Tree,
} from "@http-client";

import * as Syntax from "@app/lib/syntax";
import config from "@app/lib/config";
import { HttpdClient } from "@http-client";
import { ResponseError, ResponseParseError } from "@http-client/lib/fetcher";
import { cached } from "@app/lib/cache";
import { handleError, unreachableError } from "@app/views/repos/error";
import { unreachable } from "@app/lib/utils";
import { nodePath } from "@app/views/nodes/router";

export const PATCHES_PER_PAGE = 10;
export const ISSUES_PER_PAGE = 10;

export type RepoRoute =
  | RepoTreeRoute
  | RepoHistoryRoute
  | {
      resource: "repo.commit";
      node: BaseUrl;
      repo: string;
      commit: string;
    }
  | RepoIssuesRoute
  | RepoIssueRoute
  | RepoPatchesRoute
  | RepoPatchRoute;

interface RepoIssuesRoute {
  resource: "repo.issues";
  node: BaseUrl;
  repo: string;
  status?: "open" | "closed";
}

interface RepoIssueRoute {
  resource: "repo.issue";
  node: BaseUrl;
  repo: string;
  issue: string;
}

interface RepoTreeRoute {
  resource: "repo.source";
  node: BaseUrl;
  repo: string;
  path?: string;
  peer?: string;
  revision?: string;
  route?: string;
}

interface RepoHistoryRoute {
  resource: "repo.history";
  node: BaseUrl;
  repo: string;
  peer?: string;
  revision?: string;
}

interface RepoPatchRoute {
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

interface RepoPatchesRoute {
  resource: "repo.patches";
  node: BaseUrl;
  repo: string;
  search?: string;
}

export type RepoLoadedRoute =
  | {
      resource: "repo.source";
      params: {
        baseUrl: BaseUrl;
        seedingPolicy: SeedingPolicy;
        commit: string;
        repo: Repo;
        peers: Remote[];
        peer: string | undefined;
        revision: string | undefined;
        tree: Tree;
        path: string;
        rawPath: (commit?: string) => string;
        blobResult: BlobResult;
        nodeAvatarUrl: string | undefined;
      };
    }
  | {
      resource: "repo.history";
      params: {
        baseUrl: BaseUrl;
        seedingPolicy: SeedingPolicy;
        commit: string;
        repo: Repo;
        peers: Remote[];
        peer: string | undefined;
        revision: string | undefined;
        tree: Tree;
        commitHeaders: CommitHeader[];
        nodeAvatarUrl: string | undefined;
      };
    }
  | {
      resource: "repo.commit";
      params: {
        baseUrl: BaseUrl;
        seedingPolicy: SeedingPolicy;
        repo: Repo;
        commit: Commit;
        nodeAvatarUrl: string | undefined;
      };
    }
  | {
      resource: "repo.issue";
      params: {
        baseUrl: BaseUrl;
        seedingPolicy: SeedingPolicy;
        repo: Repo;
        rawPath: (commit?: string) => string;
        issue: Issue;
        nodeAvatarUrl: string | undefined;
      };
    }
  | {
      resource: "repo.issues";
      params: {
        baseUrl: BaseUrl;
        seedingPolicy: SeedingPolicy;
        repo: Repo;
        issues: Issue[];
        status: IssueState["status"];
        nodeAvatarUrl: string | undefined;
      };
    }
  | {
      resource: "repo.patches";
      params: {
        baseUrl: BaseUrl;
        seedingPolicy: SeedingPolicy;
        repo: Repo;
        patches: Patch[];
        status: PatchState["status"];
        nodeAvatarUrl: string | undefined;
      };
    }
  | {
      resource: "repo.patch";
      params: {
        baseUrl: BaseUrl;
        seedingPolicy: SeedingPolicy;
        repo: Repo;
        rawPath: (commit?: string) => string;
        patch: Patch;
        stats: Diff["stats"];
        view: PatchView;
        nodeAvatarUrl: string | undefined;
      };
    };

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

// Check whether the input is a SHA1 commit.
function isOid(input: string): boolean {
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

function parseRevisionToOid(
  revision: string | undefined,
  defaultBranch: string,
  branches: Record<string, string>,
): string {
  if (revision) {
    if (isOid(revision)) {
      return revision;
    } else {
      const oid = branches[revision];
      if (oid) {
        return oid;
      } else {
        throw new Error(`Revision ${revision} not found`);
      }
    }
  } else {
    return branches[defaultBranch];
  }
}

export async function loadRepoRoute(
  route: RepoRoute,
  previousLoaded: LoadedRoute,
): Promise<RepoLoadedRoute | ErrorRoute | NotFoundRoute> {
  const api = new HttpdClient(route.node);

  try {
    if (route.resource === "repo.source") {
      return await loadTreeView(route, previousLoaded);
    } else if (route.resource === "repo.history") {
      return await loadHistoryView(route, previousLoaded);
    } else if (route.resource === "repo.commit") {
      const [repo, commit, seedingPolicy, node] = await Promise.all([
        api.repo.getByRid(route.repo),
        api.repo.getCommitBySha(route.repo, route.commit),
        api.getPolicyByRid(route.repo),
        api.getNode(),
      ]);

      return {
        resource: "repo.commit",
        params: {
          baseUrl: route.node,
          seedingPolicy,
          repo,
          commit,
          nodeAvatarUrl: node.avatarUrl,
        },
      };
    } else if (route.resource === "repo.issue") {
      return await loadIssueView(route);
    } else if (route.resource === "repo.patch") {
      return await loadPatchView(route, previousLoaded);
    } else if (route.resource === "repo.issues") {
      return await loadIssuesView(route);
    } else if (route.resource === "repo.patches") {
      return await loadPatchesView(route);
    } else {
      return unreachable(route);
    }
  } catch (error) {
    if (
      error instanceof Error ||
      error instanceof ResponseError ||
      error instanceof ResponseParseError
    ) {
      return handleError(error, route);
    } else {
      return unreachableError();
    }
  }
}

async function loadPatchesView(
  route: RepoPatchesRoute,
): Promise<RepoLoadedRoute> {
  const api = new HttpdClient(route.node);
  const searchParams = new URLSearchParams(route.search || "");
  const status = (searchParams.get("status") as PatchState["status"]) || "open";

  const [repo, patches, seedingPolicy, node] = await Promise.all([
    api.repo.getByRid(route.repo),
    api.repo.getAllPatches(route.repo, {
      status,
      page: 0,
      perPage: PATCHES_PER_PAGE,
    }),
    api.getPolicyByRid(route.repo),
    api.getNode(),
  ]);

  return {
    resource: "repo.patches",
    params: {
      baseUrl: route.node,
      seedingPolicy,
      patches,
      status,
      repo,
      nodeAvatarUrl: node.avatarUrl,
    },
  };
}

async function loadIssuesView(
  route: RepoIssuesRoute,
): Promise<RepoLoadedRoute> {
  const api = new HttpdClient(route.node);
  const status = route.status || "open";

  const [repo, issues, seedingPolicy, node] = await Promise.all([
    api.repo.getByRid(route.repo),
    api.repo.getAllIssues(route.repo, {
      status,
      page: 0,
      perPage: ISSUES_PER_PAGE,
    }),
    api.getPolicyByRid(route.repo),
    api.getNode(),
  ]);

  return {
    resource: "repo.issues",
    params: {
      baseUrl: route.node,
      seedingPolicy,
      issues,
      status,
      repo,
      nodeAvatarUrl: node.avatarUrl,
    },
  };
}

async function loadTreeView(
  route: RepoTreeRoute,
  previousLoaded: LoadedRoute,
): Promise<RepoLoadedRoute | NotFoundRoute> {
  const api = new HttpdClient(route.node);
  const rawPath = (commit?: string) =>
    `${route.node.scheme}://${route.node.hostname}:${route.node.port}/raw/${
      route.repo
    }${commit ? `/${commit}` : ""}`;

  let repoPromise: Promise<Repo>;
  let seedingPolicyPromise: Promise<SeedingPolicy>;
  let peersPromise: Promise<Remote[]>;
  let nodePromise: Promise<Partial<Node>>;
  if (
    (previousLoaded.resource === "repo.source" ||
      previousLoaded.resource === "repo.history") &&
    previousLoaded.params.repo.rid === route.repo &&
    previousLoaded.params.peer === route.peer
  ) {
    repoPromise = Promise.resolve(previousLoaded.params.repo);
    peersPromise = Promise.resolve(previousLoaded.params.peers);
    seedingPolicyPromise = Promise.resolve(previousLoaded.params.seedingPolicy);
    nodePromise = Promise.resolve({
      avatarUrl: previousLoaded.params.nodeAvatarUrl,
    });
  } else {
    repoPromise = api.repo.getByRid(route.repo);
    peersPromise = api.repo.getAllRemotes(route.repo);
    seedingPolicyPromise = api.getPolicyByRid(route.repo);
    nodePromise = api.getNode();
  }

  const [repo, peers, seedingPolicy, node] = await Promise.all([
    repoPromise,
    peersPromise,
    seedingPolicyPromise,
    nodePromise,
  ]);

  if (!repo["payloads"]["xyz.radicle.project"]) {
    throw new Error(
      `Repository ${repo.rid} does not have a xyz.radicle.project payload.`,
    );
  }

  const project = repo["payloads"]["xyz.radicle.project"];
  let branchMap: Record<string, string> = {
    [project.data.defaultBranch]: project.meta.head,
    ...(repo.canonicalTags || {}),
  };

  // Add all peer tags to branchMap for tag resolution
  peers.forEach(peer => {
    Object.assign(branchMap, peer.tags);
  });

  if (route.peer) {
    const peer = peers.find(peer => peer.id === route.peer);
    if (!peer) {
      return {
        resource: "notFound",
        params: { title: `Peer ${route.peer} could not be found` },
      };
    } else {
      branchMap = peer.heads;
    }
  }

  if (route.route) {
    const { revision, path } = detectRevision(route.route, branchMap);
    route.revision = revision;
    route.path = path;
  }

  const commit = parseRevisionToOid(
    route.revision,
    project.data.defaultBranch,
    branchMap,
  );
  const path = route.path || "/";
  const [tree, blobResult] = await Promise.all([
    api.repo.getTree(route.repo, commit),
    loadBlob(api, repo.rid, commit, path),
  ]);
  return {
    resource: "repo.source",
    params: {
      baseUrl: route.node,
      seedingPolicy,
      commit,
      repo,
      peers: peers.filter(remote => Object.keys(remote.heads).length > 0),
      peer: route.peer,
      rawPath,
      revision: route.revision,
      tree,
      path,
      blobResult,
      nodeAvatarUrl: node.avatarUrl,
    },
  };
}

async function loadBlob(
  api: HttpdClient,
  repo: string,
  commit: string,
  path: string,
): Promise<BlobResult> {
  try {
    let blob: Blob;
    if (path === "" || path === "/") {
      blob = await api.repo.getReadme(repo, commit);
    } else {
      blob = await api.repo.getBlob(repo, commit, path);
    }
    return {
      ok: true,
      blob,
      highlighted: blob.content
        ? await Syntax.highlight(blob.content, blob.path.split(".").pop() ?? "")
        : undefined,
    };
  } catch (e: unknown) {
    if (e instanceof ResponseError) {
      return {
        ok: false,
        error: {
          status: e.status,
          message: "Not able to load file",
          path,
        },
      };
    } else if (path === "/") {
      return {
        ok: false,
        error: {
          message: "The README could not be loaded",
          path,
        },
      };
    } else {
      return {
        ok: false,
        error: {
          message: "Not able to load file",
          path,
        },
      };
    }
  }
}
async function loadHistoryView(
  route: RepoHistoryRoute,
  previousLoaded: LoadedRoute,
): Promise<RepoLoadedRoute> {
  const api = new HttpdClient(route.node);

  let repoPromise: Promise<Repo>;
  let seedingPolicyPromise: Promise<SeedingPolicy>;
  let peersPromise: Promise<Remote[]>;
  let nodePromise: Promise<Partial<Node>>;
  if (
    (previousLoaded.resource === "repo.source" ||
      previousLoaded.resource === "repo.history") &&
    previousLoaded.params.repo.rid === route.repo &&
    previousLoaded.params.peer === route.peer
  ) {
    repoPromise = Promise.resolve(previousLoaded.params.repo);
    peersPromise = Promise.resolve(previousLoaded.params.peers);
    seedingPolicyPromise = Promise.resolve(previousLoaded.params.seedingPolicy);
    nodePromise = Promise.resolve({
      avatarUrl: previousLoaded.params.nodeAvatarUrl,
    });
  } else {
    repoPromise = api.repo.getByRid(route.repo);
    peersPromise = api.repo.getAllRemotes(route.repo);
    seedingPolicyPromise = api.getPolicyByRid(route.repo);
    nodePromise = api.getNode();
  }

  const [repo, peers, seedingPolicy, node] = await Promise.all([
    repoPromise,
    peersPromise,
    seedingPolicyPromise,
    nodePromise,
  ]);

  const branchMap = await getPeerBranches(
    api,
    route.repo,
    route.peer,
    repo,
    peers,
  );

  if (!repo["payloads"]["xyz.radicle.project"]) {
    throw new Error(
      `Repository ${repo.rid} does not have a xyz.radicle.project payload.`,
    );
  }

  const project = repo["payloads"]["xyz.radicle.project"];
  let commitId;
  if (route.revision && isOid(route.revision)) {
    commitId = route.revision;
  } else if (branchMap) {
    commitId = branchMap[route.revision || project.data.defaultBranch];
  } else if (!route.revision) {
    commitId = project.meta.head;
  } else if (route.revision && repo.canonicalTags) {
    // Check if revision is a canonical tag
    commitId = repo.canonicalTags[route.revision];
  }

  if (!commitId) {
    throw new Error(
      `Revision ${route.revision} not found for repo ${repo.rid}`,
    );
  }

  let treePromise: Promise<Tree>;

  if (
    (previousLoaded.resource === "repo.source" ||
      previousLoaded.resource === "repo.history") &&
    previousLoaded.params.repo.rid === route.repo &&
    previousLoaded.params.commit === commitId
  ) {
    treePromise = Promise.resolve(previousLoaded.params.tree);
  } else {
    treePromise = api.repo.getTree(route.repo, commitId);
  }

  const [tree, commitHeaders] = await Promise.all([
    treePromise,
    api.repo.getAllCommits(repo.rid, {
      parent: commitId,
      page: 0,
      perPage: config.source.commitsPerPage,
    }),
  ]);

  return {
    resource: "repo.history",
    params: {
      baseUrl: route.node,
      seedingPolicy,
      commit: commitId,
      repo,
      peers: peers.filter(remote => Object.keys(remote.heads).length > 0),
      peer: route.peer,
      revision: route.revision,
      tree,
      commitHeaders,
      nodeAvatarUrl: node.avatarUrl,
    },
  };
}

async function loadIssueView(route: RepoIssueRoute): Promise<RepoLoadedRoute> {
  const api = new HttpdClient(route.node);
  const rawPath = (commit?: string) =>
    `${route.node.scheme}://${route.node.hostname}:${route.node.port}/raw/${
      route.repo
    }${commit ? `/${commit}` : ""}`;

  const [repo, issue, seedingPolicy, node] = await Promise.all([
    api.repo.getByRid(route.repo),
    api.repo.getIssueById(route.repo, route.issue),
    api.getPolicyByRid(route.repo),
    api.getNode(),
  ]);
  return {
    resource: "repo.issue",
    params: {
      baseUrl: route.node,
      seedingPolicy,
      repo,
      rawPath,
      issue,
      nodeAvatarUrl: node.avatarUrl,
    },
  };
}

async function loadPatchView(
  route: RepoPatchRoute,
  previousLoaded: LoadedRoute,
): Promise<RepoLoadedRoute> {
  const api = new HttpdClient(route.node);
  const rawPath = (commit?: string) =>
    `${route.node.scheme}://${route.node.hostname}:${route.node.port}/raw/${
      route.repo
    }${commit ? `/${commit}` : ""}`;

  let repoPromise: Promise<Repo>;
  let patchPromise: Promise<Patch>;
  let nodePromise: Promise<Partial<Node>>;
  let seedingPolicyPromise: Promise<SeedingPolicy>;

  if (
    previousLoaded.resource === "repo.patch" &&
    previousLoaded.params.repo.rid === route.repo &&
    previousLoaded.params.patch.id === route.patch
  ) {
    repoPromise = Promise.resolve(previousLoaded.params.repo);
    patchPromise = Promise.resolve(previousLoaded.params.patch);
    seedingPolicyPromise = Promise.resolve(previousLoaded.params.seedingPolicy);
    nodePromise = Promise.resolve({
      avatarUrl: previousLoaded.params.nodeAvatarUrl,
    });
  } else {
    repoPromise = api.repo.getByRid(route.repo);
    patchPromise = api.repo.getPatchById(route.repo, route.patch);
    seedingPolicyPromise = api.getPolicyByRid(route.repo);
    nodePromise = api.getNode();
  }
  const [repo, patch, seedingPolicy, { avatarUrl }] = await Promise.all([
    repoPromise,
    patchPromise,
    seedingPolicyPromise,
    nodePromise,
  ]);

  const latestRevision = patch.revisions.at(-1) as Revision;
  const {
    diff: { stats },
  } = await cachedGetDiff(
    api.baseUrl,
    route.repo,
    latestRevision.base,
    latestRevision.oid,
  );

  let view: PatchView;
  switch (route.view?.name) {
    case "activity":
    case undefined: {
      view = { name: "activity", revision: latestRevision.id };
      break;
    }
    case "changes": {
      const revisionId = route.view.revision;
      const revision =
        patch.revisions.find(r => r.id === revisionId) || latestRevision;
      if (!revision) {
        throw new Error(
          `revision ${revisionId} of patch ${route.patch} not found`,
        );
      }
      const { diff, commits, files } = await cachedGetDiff(
        api.baseUrl,
        route.repo,
        revision.base,
        revision.oid,
      );
      view = {
        name: route.view?.name,
        revision: revision.id,
        oid: revision.oid,
        diff,
        commits,
        files,
      };
      break;
    }
    case "diff": {
      const { fromCommit, toCommit } = route.view;
      const { diff, files } = await cachedGetDiff(
        api.baseUrl,
        route.repo,
        fromCommit,
        toCommit,
      );

      view = { name: "diff", fromCommit, toCommit, files, diff };
      break;
    }
  }
  return {
    resource: "repo.patch",
    params: {
      baseUrl: route.node,
      seedingPolicy,
      repo,
      rawPath,
      patch,
      stats,
      view,
      nodeAvatarUrl: avatarUrl,
    },
  };
}

async function getPeerBranches(
  api: HttpdClient,
  repoId: string,
  peer?: string,
  repo?: Repo,
  peers?: Remote[],
) {
  if (peer) {
    return (await api.repo.getRemoteByPeer(repoId, peer)).heads;
  } else if (repo && peers) {
    // When no peer is specified, include canonical tags and all peer tags
    const branchMap: Record<string, string> = {
      ...(repo.canonicalTags || {}),
    };
    // Add all peer tags
    peers.forEach(p => {
      Object.assign(branchMap, p.tags);
    });
    return branchMap;
  } else {
    return undefined;
  }
}

// Detects branch names and commit IDs at the start of `input` and extract it.
function detectRevision(
  input: string,
  branches: Record<string, string>,
): { path: string; revision?: string } {
  const commitPath = [input.slice(0, 40), input.slice(41)];
  const branch = Object.entries(branches).find(([branchName]) =>
    input.startsWith(branchName),
  );

  if (branch) {
    const [revision, path] = [
      input.slice(0, branch[0].length),
      input.slice(branch[0].length + 1),
    ];
    return {
      revision,
      path: path || "/",
    };
  } else if (isOid(commitPath[0])) {
    return {
      revision: commitPath[0],
      path: commitPath[1] || "/",
    };
  } else {
    return { path: input };
  }
}

function sanitizeQueryString(queryString: string): string {
  return queryString.startsWith("?") ? queryString.substring(1) : queryString;
}

export function resolveRepoRoute(
  node: BaseUrl,
  repo: string,
  segments: string[],
  urlSearch: string,
): RepoRoute | null {
  let content = segments.shift();
  let peer;
  if (content === "remotes") {
    peer = segments.shift();
    content = segments.shift();
  }

  if (!content || content === "tree") {
    return {
      resource: "repo.source",
      node,
      repo,
      peer,
      path: undefined,
      revision: undefined,
      route: segments.join("/"),
    };
  } else if (content === "history") {
    return {
      resource: "repo.history",
      node,
      repo,
      peer,
      revision: segments.join("/"),
    };
  } else if (content === "commits") {
    return {
      resource: "repo.commit",
      node,
      repo,
      commit: segments[0],
    };
  } else if (content === "issues") {
    const issueOrAction = segments.shift();
    if (issueOrAction) {
      return {
        resource: "repo.issue",
        node,
        repo,
        issue: issueOrAction,
      };
    } else {
      const rawStatus = new URLSearchParams(sanitizeQueryString(urlSearch)).get(
        "status",
      );
      let status: "open" | "closed" | undefined;
      if (rawStatus === "open" || rawStatus === "closed") {
        status = rawStatus;
      }
      return {
        resource: "repo.issues",
        node,
        repo,
        status,
      };
    }
  } else if (content === "patches") {
    return resolvePatchesRoute(node, repo, segments, urlSearch);
  } else {
    return null;
  }
}

function resolvePatchesRoute(
  node: BaseUrl,
  repo: string,
  segments: string[],
  urlSearch: string,
): RepoPatchRoute | RepoPatchesRoute {
  const patch = segments.shift();
  const revision = segments.shift();
  if (patch) {
    const searchParams = new URLSearchParams(sanitizeQueryString(urlSearch));
    const tab = searchParams.get("tab");
    const base = {
      resource: "repo.patch",
      node,
      repo,
      patch,
    } as const;
    const diff = searchParams.get("diff");
    if (diff) {
      const [fromCommit, toCommit] = diff.split("..");
      if (isOid(fromCommit) && isOid(toCommit)) {
        return {
          ...base,
          view: { name: "diff", fromCommit, toCommit },
        };
      }
    }

    if (tab === "changes") {
      return {
        ...base,
        view: { name: tab, revision },
      };
    } else if (tab === "activity") {
      return {
        ...base,
        view: { name: tab },
      };
    } else {
      return base;
    }
  } else {
    return {
      resource: "repo.patches",
      node,
      repo,
      search: sanitizeQueryString(urlSearch),
    };
  }
}

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

export function repoTitle(loadedRoute: RepoLoadedRoute) {
  const title: string[] = [];

  if (!loadedRoute.params.repo["payloads"]["xyz.radicle.project"]) {
    throw new Error(
      `Repository ${loadedRoute.params.repo.rid} does not have a xyz.radicle.project payload.`,
    );
  }
  const project = loadedRoute.params.repo["payloads"]["xyz.radicle.project"];

  if (loadedRoute.resource === "repo.source") {
    title.push(project.data.name);
    if (project.data.description.length > 0) {
      title.push(project.data.description);
    }
  } else if (loadedRoute.resource === "repo.commit") {
    title.push(loadedRoute.params.commit.commit.summary);
    title.push("commit");
  } else if (loadedRoute.resource === "repo.history") {
    title.push(project.data.name);
    title.push("history");
  } else if (loadedRoute.resource === "repo.issue") {
    title.push(loadedRoute.params.issue.title);
    title.push("issue");
  } else if (loadedRoute.resource === "repo.issues") {
    title.push(project.data.name);
    title.push("issues");
  } else if (loadedRoute.resource === "repo.patch") {
    title.push(loadedRoute.params.patch.title);
    title.push("patch");
  } else if (loadedRoute.resource === "repo.patches") {
    title.push(project.data.name);
    title.push("patches");
  } else {
    return unreachable(loadedRoute);
  }

  return title;
}

export const testExports = { isOid };
