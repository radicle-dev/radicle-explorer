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
  Patch,
  PatchState,
  PeerRefs,
  Remote,
  Repo,
  Revision,
  SeedingPolicy,
  Tree,
} from "@http-client";

import { error } from "@sveltejs/kit";

import * as Syntax from "@app/lib/syntax";
import config from "@app/lib/config";
import { HttpdClient } from "@http-client";
import { ResponseError } from "@http-client/lib/fetcher";
import { cached } from "@app/lib/cache";
import { handleError } from "@app/views/repos/error";
import {
  getBranchesFromRefs,
  getTagsFromRefs,
  unreachable,
} from "@app/lib/utils";
import { nodePath } from "@app/views/nodes/router";

export const PATCHES_PER_PAGE = 10;
export const ISSUES_PER_PAGE = 10;

function peerHasBranches(peer: PeerRefs): boolean {
  return Object.keys(peer.refs).some(name => name.startsWith("refs/heads/"));
}

function canonicalOids(
  refs: Repo["refs"] | undefined,
): Array<[string, string]> {
  return [
    ...Object.entries(refs?.refs ?? {}),
    ...Object.entries(refs?.tags ?? {}).map(
      ([name, info]): [string, string] => [name, info.commit],
    ),
  ];
}

function remoteToPeerRefs(remote: Remote): PeerRefs {
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
        peers: PeerRefs[];
        peer: string | undefined;
        revision: string | undefined;
        tree: Tree;
        path: string;
        rawPath: (commit?: string) => string;
        blobResult: BlobResult;
        nodeId: string;
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
        peers: PeerRefs[];
        peer: string | undefined;
        revision: string | undefined;
        tree: Tree;
        commitHeaders: CommitHeader[];
        nodeId: string;
        nodeAvatarUrl: string | undefined;
      };
    }
  | {
      resource: "repo.commit";
      params: {
        baseUrl: BaseUrl;
        repo: Repo;
        commit: Commit;
        nodeId: string;
        nodeAvatarUrl: string | undefined;
      };
    }
  | {
      resource: "repo.issue";
      params: {
        baseUrl: BaseUrl;
        repo: Repo;
        rawPath: (commit?: string) => string;
        issue: Issue;
        nodeId: string;
        nodeAvatarUrl: string | undefined;
      };
    }
  | {
      resource: "repo.issues";
      params: {
        baseUrl: BaseUrl;
        repo: Repo;
        issues: Issue[];
        status: IssueState["status"];
        nodeId: string;
        nodeAvatarUrl: string | undefined;
      };
    }
  | {
      resource: "repo.patches";
      params: {
        baseUrl: BaseUrl;
        repo: Repo;
        patches: Patch[];
        status: PatchState["status"];
        nodeId: string;
        nodeAvatarUrl: string | undefined;
      };
    }
  | {
      resource: "repo.patch";
      params: {
        baseUrl: BaseUrl;
        repo: Repo;
        rawPath: (commit?: string) => string;
        patch: Patch;
        stats: Diff["stats"];
        view: PatchView;
        nodeId: string;
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

// Shared per-repo data loaded once by the repo layout load and passed to every
// repo page load. `seedingPolicy` is lazy so that only the views that render
// it (source, history) trigger the request.
export interface RepoContext {
  baseUrl: BaseUrl;
  repo: Repo;
  nodeId: string;
  nodeAvatarUrl: string | undefined;
  seedingPolicy: () => Promise<SeedingPolicy>;
}

export async function loadRepoContext(
  baseUrl: BaseUrl,
  rid: string,
): Promise<RepoContext> {
  const api = new HttpdClient(baseUrl);
  try {
    const [repo, node] = await Promise.all([
      api.repo.getByRid(rid),
      api.getNode(),
    ]);
    let seedingPolicyPromise: Promise<SeedingPolicy> | undefined;
    return {
      baseUrl,
      repo,
      nodeId: node.id,
      nodeAvatarUrl: node.avatarUrl,
      seedingPolicy: () => (seedingPolicyPromise ??= api.getPolicyByRid(rid)),
    };
  } catch (err) {
    handleError(err, baseUrl, "Repository");
  }
}

function rawPathFn(baseUrl: BaseUrl, rid: string): (commit?: string) => string {
  return (commit?: string) =>
    `${baseUrl.scheme}://${baseUrl.hostname}:${baseUrl.port}/raw/${rid}${
      commit ? `/${commit}` : ""
    }`;
}

// Trees are immutable for a given commit, so they can be cached across
// navigations. This replaces the previous router's reuse of the tree when
// switching between the source and history views of the same commit.
const cachedGetTree = cached(
  async (baseUrl: BaseUrl, rid: string, commit: string) => {
    const api = new HttpdClient(baseUrl);
    return await api.repo.getTree(rid, commit);
  },
  (...args) => JSON.stringify(args),
  { max: 10 },
);

export async function loadPatchesView(
  ctx: RepoContext,
  search: string,
): Promise<RepoLoadedRoute & { resource: "repo.patches" }> {
  const { baseUrl, repo } = ctx;
  const api = new HttpdClient(baseUrl);
  const searchParams = new URLSearchParams(search || "");
  const status = (searchParams.get("status") as PatchState["status"]) || "open";

  try {
    const patches = await api.repo.getAllPatches(repo.rid, {
      status,
      page: 0,
      perPage: PATCHES_PER_PAGE,
    });

    return {
      resource: "repo.patches",
      params: {
        baseUrl,
        patches,
        status,
        repo,
        nodeId: ctx.nodeId,
        nodeAvatarUrl: ctx.nodeAvatarUrl,
      },
    };
  } catch (err) {
    handleError(err, baseUrl, "Repository");
  }
}

export async function loadIssuesView(
  ctx: RepoContext,
  statusParam: string | null,
): Promise<RepoLoadedRoute & { resource: "repo.issues" }> {
  const { baseUrl, repo } = ctx;
  const api = new HttpdClient(baseUrl);
  const status: IssueState["status"] =
    statusParam === "open" || statusParam === "closed" ? statusParam : "open";

  try {
    const issues = await api.repo.getAllIssues(repo.rid, {
      status,
      page: 0,
      perPage: ISSUES_PER_PAGE,
    });

    return {
      resource: "repo.issues",
      params: {
        baseUrl,
        issues,
        status,
        repo,
        nodeId: ctx.nodeId,
        nodeAvatarUrl: ctx.nodeAvatarUrl,
      },
    };
  } catch (err) {
    handleError(err, baseUrl, "Repository");
  }
}

export async function loadCommitView(
  ctx: RepoContext,
  commitId: string,
): Promise<RepoLoadedRoute & { resource: "repo.commit" }> {
  const { baseUrl, repo } = ctx;
  const api = new HttpdClient(baseUrl);

  try {
    const commit = await api.repo.getCommitBySha(repo.rid, commitId);

    return {
      resource: "repo.commit",
      params: {
        baseUrl,
        repo,
        commit,
        nodeId: ctx.nodeId,
        nodeAvatarUrl: ctx.nodeAvatarUrl,
      },
    };
  } catch (err) {
    handleError(err, baseUrl, "Commit");
  }
}

export async function loadTreeView(
  ctx: RepoContext,
  peer: string | undefined,
  restRoute: string,
): Promise<RepoLoadedRoute & { resource: "repo.source" }> {
  const { baseUrl, repo } = ctx;
  const api = new HttpdClient(baseUrl);

  try {
    const [seedingPolicy, remotes] = await Promise.all([
      ctx.seedingPolicy(),
      api.repo.getAllRemotes(repo.rid),
    ]);
    const peers: PeerRefs[] = remotes.map(remoteToPeerRefs);

    if (!repo["payloads"]["xyz.radicle.project"]) {
      throw new Error(
        `Repository ${repo.rid} does not have a xyz.radicle.project payload.`,
      );
    }

    const project = repo["payloads"]["xyz.radicle.project"];
    let branchMap: Record<string, string> = {
      [project.data.defaultBranch]: project.meta.head,
    };

    for (const [refName, oid] of canonicalOids(repo.refs)) {
      const shortName = refName.startsWith("refs/heads/")
        ? refName.slice("refs/heads/".length)
        : refName.startsWith("refs/tags/")
          ? refName.slice("refs/tags/".length)
          : refName;
      branchMap[shortName] = oid;
      branchMap[encodeURIComponent(shortName)] = oid;
    }

    for (const peerRefs of peers) {
      const tags = getTagsFromRefs(peerRefs.refs);
      for (const [tagName, oid] of Object.entries(tags)) {
        branchMap[tagName] = oid;
        branchMap[encodeURIComponent(tagName)] = oid;
      }
    }

    if (peer) {
      const peerRefs = peers.find(p => p.id === peer);
      if (!peerRefs) {
        error(404, {
          message: `Peer ${peer} could not be found`,
          variant: "notFound",
          title: `Peer ${peer} could not be found`,
        });
      } else {
        branchMap = { ...getBranchesFromRefs(peerRefs.refs) };
        for (const [tagName, oid] of Object.entries(
          getTagsFromRefs(peerRefs.refs),
        )) {
          branchMap[tagName] = oid;
          branchMap[encodeURIComponent(tagName)] = oid;
        }
      }
    }

    let revision: string | undefined;
    let routePath: string | undefined;
    if (restRoute) {
      const detected = detectRevision(restRoute, branchMap);
      revision = detected.revision;
      routePath = detected.path;
    }

    const commit = parseRevisionToOid(
      revision,
      project.data.defaultBranch,
      branchMap,
    );
    const path = routePath || "/";
    const [tree, blobResult] = await Promise.all([
      cachedGetTree(baseUrl, repo.rid, commit),
      loadBlob(api, repo.rid, commit, path),
    ]);
    return {
      resource: "repo.source",
      params: {
        baseUrl,
        seedingPolicy,
        commit,
        repo,
        peers: peers.filter(peerHasBranches),
        peer,
        rawPath: rawPathFn(baseUrl, repo.rid),
        revision,
        tree,
        path,
        blobResult,
        nodeId: ctx.nodeId,
        nodeAvatarUrl: ctx.nodeAvatarUrl,
      },
    };
  } catch (err) {
    handleError(err, baseUrl, "Repository");
  }
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
export async function loadHistoryView(
  ctx: RepoContext,
  peer: string | undefined,
  revision: string | undefined,
): Promise<RepoLoadedRoute & { resource: "repo.history" }> {
  const { baseUrl, repo } = ctx;
  const api = new HttpdClient(baseUrl);

  try {
    const [seedingPolicy, remotes] = await Promise.all([
      ctx.seedingPolicy(),
      api.repo.getAllRemotes(repo.rid),
    ]);
    const peers: PeerRefs[] = remotes.map(remoteToPeerRefs);

    const branchMap = await getPeerBranches(api, repo.rid, peer, repo, peers);

    if (!repo["payloads"]["xyz.radicle.project"]) {
      throw new Error(
        `Repository ${repo.rid} does not have a xyz.radicle.project payload.`,
      );
    }

    const project = repo["payloads"]["xyz.radicle.project"];
    let commitId;
    if (revision && isOid(revision)) {
      commitId = revision;
    } else if (branchMap) {
      commitId = branchMap[revision || project.data.defaultBranch];
    }

    if (!commitId) {
      throw new Error(`Revision ${revision} not found for repo ${repo.rid}`);
    }

    const [tree, commitHeaders] = await Promise.all([
      cachedGetTree(baseUrl, repo.rid, commitId),
      api.repo.getAllCommits(repo.rid, {
        parent: commitId,
        page: 0,
        perPage: config.source.commitsPerPage,
      }),
    ]);

    return {
      resource: "repo.history",
      params: {
        baseUrl,
        seedingPolicy,
        commit: commitId,
        repo,
        peers: peers.filter(peerHasBranches),
        peer,
        revision,
        tree,
        commitHeaders,
        nodeId: ctx.nodeId,
        nodeAvatarUrl: ctx.nodeAvatarUrl,
      },
    };
  } catch (err) {
    handleError(err, baseUrl, "Repository");
  }
}

export async function loadIssueView(
  ctx: RepoContext,
  issueId: string,
): Promise<RepoLoadedRoute & { resource: "repo.issue" }> {
  const { baseUrl, repo } = ctx;
  const api = new HttpdClient(baseUrl);

  try {
    const issue = await api.repo.getIssueById(repo.rid, issueId);
    return {
      resource: "repo.issue",
      params: {
        baseUrl,
        repo,
        rawPath: rawPathFn(baseUrl, repo.rid),
        issue,
        nodeId: ctx.nodeId,
        nodeAvatarUrl: ctx.nodeAvatarUrl,
      },
    };
  } catch (err) {
    handleError(err, baseUrl, "Issue");
  }
}

export async function loadPatchView(
  ctx: RepoContext,
  patchId: string,
  requestedView: RepoPatchRoute["view"],
): Promise<RepoLoadedRoute & { resource: "repo.patch" }> {
  const { baseUrl, repo } = ctx;
  const api = new HttpdClient(baseUrl);

  try {
    const patch = await api.repo.getPatchById(repo.rid, patchId);

    const latestRevision = patch.revisions.at(-1) as Revision;
    const {
      diff: { stats },
    } = await cachedGetDiff(
      api.baseUrl,
      repo.rid,
      latestRevision.base,
      latestRevision.oid,
    );

    let view: PatchView;
    switch (requestedView?.name) {
      case "activity":
      case undefined: {
        view = { name: "activity", revision: latestRevision.id };
        break;
      }
      case "changes": {
        const revisionId = requestedView.revision;
        const revision =
          patch.revisions.find(r => r.id === revisionId) || latestRevision;
        if (!revision) {
          throw new Error(
            `revision ${revisionId} of patch ${patchId} not found`,
          );
        }
        const { diff, commits, files } = await cachedGetDiff(
          api.baseUrl,
          repo.rid,
          revision.base,
          revision.oid,
        );
        view = {
          name: requestedView?.name,
          revision: revision.id,
          oid: revision.oid,
          diff,
          commits,
          files,
        };
        break;
      }
      case "diff": {
        const { fromCommit, toCommit } = requestedView;
        const { diff, files } = await cachedGetDiff(
          api.baseUrl,
          repo.rid,
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
        baseUrl,
        repo,
        rawPath: rawPathFn(baseUrl, repo.rid),
        patch,
        stats,
        view,
        nodeId: ctx.nodeId,
        nodeAvatarUrl: ctx.nodeAvatarUrl,
      },
    };
  } catch (err) {
    handleError(err, baseUrl, "Patch");
  }
}

async function getPeerBranches(
  api: HttpdClient,
  repoId: string,
  peer?: string,
  repo?: Repo,
  loadedPeers?: PeerRefs[],
) {
  if (peer) {
    const remote = await api.repo.getRemoteByPeer(repoId, peer);
    const refs = remoteToPeerRefs(remote).refs;
    const map: Record<string, string> = { ...getBranchesFromRefs(refs) };
    for (const [tagName, oid] of Object.entries(getTagsFromRefs(refs))) {
      map[tagName] = oid;
      map[encodeURIComponent(tagName)] = oid;
    }
    return map;
  } else if (repo) {
    const branchMap: Record<string, string> = {};
    const peers = loadedPeers ?? [];

    const project = repo.payloads["xyz.radicle.project"];
    if (project) {
      branchMap[project.data.defaultBranch] = project.meta.head;
      branchMap[encodeURIComponent(project.data.defaultBranch)] =
        project.meta.head;
    }

    for (const [refName, oid] of canonicalOids(repo.refs)) {
      const shortName = refName.startsWith("refs/heads/")
        ? refName.slice("refs/heads/".length)
        : refName.startsWith("refs/tags/")
          ? refName.slice("refs/tags/".length)
          : refName;
      branchMap[shortName] = oid;
      branchMap[encodeURIComponent(shortName)] = oid;
    }

    for (const p of peers) {
      const tags = getTagsFromRefs(p.refs);
      for (const [tagName, oid] of Object.entries(tags)) {
        branchMap[tagName] = oid;
        branchMap[encodeURIComponent(tagName)] = oid;
      }
    }
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

// Derive the requested patch sub-view from the `?tab=` / `?diff=` search
// params and the optional revision path segment.
export function parsePatchView(
  searchParams: URLSearchParams,
  revision: string | undefined,
): RepoPatchRoute["view"] {
  const diff = searchParams.get("diff");
  if (diff) {
    const [fromCommit, toCommit] = diff.split("..");
    if (isOid(fromCommit) && isOid(toCommit)) {
      return { name: "diff", fromCommit, toCommit };
    }
  }

  const tab = searchParams.get("tab");
  if (tab === "changes") {
    return { name: tab, revision };
  } else if (tab === "activity") {
    return { name: tab };
  }
  return undefined;
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
