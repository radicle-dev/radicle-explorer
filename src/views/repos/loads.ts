import type {
  BaseUrl,
  Blob,
  Commit,
  CommitHeader,
  Diff,
  Issue,
  IssueState,
  Patch,
  PatchState,
  Repo,
  Revision,
  SeedingPolicy,
  Tree,
} from "@http-client";
import type { BlobResult, PatchView } from "@app/views/repos/router";

import { error, isHttpError } from "@sveltejs/kit";

import * as Syntax from "@app/lib/syntax";
import config from "@app/lib/config";
import { HttpdClient } from "@http-client";
import { ResponseError } from "@http-client/lib/fetcher";
import { raise } from "@app/views/repos/error";
import {
  getBranchesFromRefs,
  getTagsFromRefs,
  unreachable,
} from "@app/lib/utils";
import {
  ISSUES_PER_PAGE,
  PATCHES_PER_PAGE,
  cachedGetDiff,
  isOid,
  remoteToPeerRefs,
} from "@app/views/repos/router";

export interface RepoLayoutData {
  baseUrl: BaseUrl;
  repoId: string;
  repo: Repo;
  seedingPolicy: SeedingPolicy | undefined;
  nodeId: string;
  nodeAvatarUrl: string | undefined;
  rawPath: (commit?: string) => string;
}

// The shared data trio every repo page needs. Loaded once per repo in the
// repo `+layout.ts`; SvelteKit reuses the result across in-repo navigation
// until the host or repo params change.
export async function loadRepoLayout(
  baseUrl: BaseUrl,
  repoId: string,
): Promise<RepoLayoutData> {
  const api = new HttpdClient(baseUrl);
  const rawPath = (commit?: string) =>
    `${baseUrl.scheme}://${baseUrl.hostname}:${baseUrl.port}/raw/${repoId}${
      commit ? `/${commit}` : ""
    }`;

  try {
    // The policy endpoint may be missing or failing on older nodes; the
    // seeding scope display degrades gracefully without it.
    const [repo, seedingPolicy, node] = await Promise.all([
      api.repo.getByRid(repoId),
      api.getPolicyByRid(repoId).catch(() => undefined),
      api.getNode(),
    ]);

    return {
      baseUrl,
      repoId,
      repo,
      seedingPolicy,
      nodeId: node.id,
      nodeAvatarUrl: node.avatarUrl,
      rawPath,
    };
  } catch (err) {
    raise(err, baseUrl);
  }
}

function projectPayload(repo: Repo) {
  const project = repo.payloads["xyz.radicle.project"];
  if (!project) {
    throw new Error(
      `Repository ${repo.rid} does not have a xyz.radicle.project payload.`,
    );
  }
  return project;
}

export interface SourcePageData {
  commit: string;
  peer: string | undefined;
  revision: string | undefined;
  tree: Tree;
  path: string;
  blobResult: BlobResult;
}

export async function loadSourcePage(
  layout: RepoLayoutData,
  peer: string | undefined,
  rest: string,
): Promise<SourcePageData> {
  const { baseUrl, repo, repoId } = layout;
  const api = new HttpdClient(baseUrl);

  try {
    const project = projectPayload(repo);
    let branchMap = canonicalBranchMap(repo);

    if (peer) {
      try {
        branchMap = await getPeerBranchMap(api, repoId, peer);
      } catch (e) {
        if (e instanceof ResponseError) {
          error(404, {
            message: "Not Found",
            title: `Peer ${peer} could not be found`,
          });
        }
        throw e;
      }
    }

    let revision: string | undefined;
    let path: string | undefined;
    if (rest) {
      ({ revision, path } = detectRevision(rest, branchMap));
    }

    const commit = parseRevisionToOid(
      revision,
      project.data.defaultBranch,
      branchMap,
    );
    const resolvedPath = path || "/";
    const [tree, blobResult] = await Promise.all([
      api.repo.getTree(repoId, commit),
      loadBlob(api, repo.rid, commit, resolvedPath),
    ]);

    return {
      commit,
      peer,
      revision,
      tree,
      path: resolvedPath,
      blobResult,
    };
  } catch (err) {
    if (isHttpError(err)) {
      throw err;
    }
    raise(err, baseUrl);
  }
}

export interface HistoryPageData {
  commit: string;
  peer: string | undefined;
  revision: string | undefined;
  tree: Tree;
  commitHeaders: CommitHeader[];
}

export async function loadHistoryPage(
  layout: RepoLayoutData,
  peer: string | undefined,
  rest: string,
): Promise<HistoryPageData> {
  const { baseUrl, repo, repoId } = layout;
  const api = new HttpdClient(baseUrl);
  const revision = rest || undefined;

  try {
    const project = projectPayload(repo);
    const branchMap = peer
      ? await getPeerBranchMap(api, repoId, peer)
      : canonicalBranchMap(repo);

    const commitId =
      revision && isOid(revision)
        ? revision
        : branchMap[revision || project.data.defaultBranch];

    if (!commitId) {
      throw new Error(`Revision ${revision} not found for repo ${repo.rid}`);
    }

    const [tree, commitHeaders] = await Promise.all([
      api.repo.getTree(repoId, commitId),
      api.repo.getAllCommits(repo.rid, {
        parent: commitId,
        page: 0,
        perPage: config.source.commitsPerPage,
      }),
    ]);

    return {
      commit: commitId,
      peer,
      revision,
      tree,
      commitHeaders,
    };
  } catch (err) {
    if (isHttpError(err)) {
      throw err;
    }
    raise(err, baseUrl);
  }
}

// The COB and commit page loads below take `baseUrl` and `repoId` directly
// from the URL params instead of the repo layout data, and their `+page.ts`
// files deliberately don't call `parent()`: this lets SvelteKit run them in
// parallel with the repo layout load on cold entry.

export async function loadCommitPage(
  baseUrl: BaseUrl,
  repoId: string,
  commitSha: string,
): Promise<{ commit: Commit }> {
  const api = new HttpdClient(baseUrl);

  try {
    const commit = await api.repo.getCommitBySha(repoId, commitSha);
    return { commit };
  } catch (err) {
    raise(err, baseUrl, "Commit");
  }
}

export async function loadIssuesPage(
  baseUrl: BaseUrl,
  repoId: string,
  status: IssueState["status"],
): Promise<{ issues: Issue[]; status: IssueState["status"] }> {
  const api = new HttpdClient(baseUrl);

  try {
    const issues = await api.repo.getAllIssues(repoId, {
      status,
      page: 0,
      perPage: ISSUES_PER_PAGE,
    });
    return { issues, status };
  } catch (err) {
    raise(err, baseUrl);
  }
}

export async function loadIssuePage(
  baseUrl: BaseUrl,
  repoId: string,
  issueId: string,
): Promise<{ issue: Issue }> {
  const api = new HttpdClient(baseUrl);

  try {
    const issue = await api.repo.getIssueById(repoId, issueId);
    return { issue };
  } catch (err) {
    raise(err, baseUrl, "Issue");
  }
}

export async function loadPatchesPage(
  baseUrl: BaseUrl,
  repoId: string,
  searchParams: URLSearchParams,
): Promise<{ patches: Patch[]; status: PatchState["status"] }> {
  const api = new HttpdClient(baseUrl);
  const status = (searchParams.get("status") as PatchState["status"]) || "open";

  try {
    const patches = await api.repo.getAllPatches(repoId, {
      status,
      page: 0,
      perPage: PATCHES_PER_PAGE,
    });
    return { patches, status };
  } catch (err) {
    raise(err, baseUrl);
  }
}

export interface PatchLayoutData {
  patch: Patch;
  stats: Diff["stats"];
}

// The patch and its header-badge stats, shared by every patch tab. Loaded in
// the patch `+layout.ts` — deliberately independent of the repo layout data —
// so switching tabs or revisions never refetches the patch itself.
export async function loadPatchLayout(
  baseUrl: BaseUrl,
  repoId: string,
  patchId: string,
): Promise<PatchLayoutData> {
  const api = new HttpdClient(baseUrl);

  try {
    const patch = await api.repo.getPatchById(repoId, patchId);
    const latestRevision = patch.revisions.at(-1) as Revision;
    // Take the header badge's stats from the latest revision's full diff (the
    // same source the changeset view uses) so the two badges on the patch page
    // never disagree. The patch list still uses the fast /stats endpoint.
    const {
      diff: { stats },
    } = await cachedGetDiff(
      api.baseUrl,
      repoId,
      latestRevision.base,
      latestRevision.oid,
    );

    return { patch, stats };
  } catch (err) {
    raise(err, baseUrl, "Patch");
  }
}

// The `?tab`/`?diff` query params and optional revision path segment decoded
// into the patch view discriminant, mirroring the previous URL grammar:
// a valid `diff=<oid>..<oid>` wins over `tab`; no query means activity.
export function parsePatchView(
  searchParams: URLSearchParams,
  revisionParam: string | undefined,
):
  | { name: "activity" }
  | { name: "changes"; revision?: string }
  | { name: "diff"; fromCommit: string; toCommit: string } {
  const diff = searchParams.get("diff");
  if (diff) {
    const [fromCommit, toCommit] = diff.split("..");
    if (isOid(fromCommit) && isOid(toCommit)) {
      return { name: "diff", fromCommit, toCommit };
    }
  }

  const tab = searchParams.get("tab");
  if (tab === "changes") {
    return { name: "changes", revision: revisionParam };
  }
  return { name: "activity" };
}

export async function loadPatchPage(
  baseUrl: BaseUrl,
  repoId: string,
  patch: Patch,
  requestedView: ReturnType<typeof parsePatchView>,
): Promise<{ view: PatchView }> {
  const latestRevision = patch.revisions.at(-1) as Revision;

  try {
    let view: PatchView;
    switch (requestedView.name) {
      case "activity": {
        view = { name: "activity", revision: latestRevision.id };
        break;
      }
      case "changes": {
        const revisionId = requestedView.revision;
        const revision =
          patch.revisions.find(r => r.id === revisionId) || latestRevision;
        const { diff, commits, files } = await cachedGetDiff(
          baseUrl,
          repoId,
          revision.base,
          revision.oid,
        );
        view = {
          name: "changes",
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
          baseUrl,
          repoId,
          fromCommit,
          toCommit,
        );

        view = { name: "diff", fromCommit, toCommit, files, diff };
        break;
      }
      default: {
        view = unreachable(requestedView);
      }
    }
    return { view };
  } catch (err) {
    raise(err, baseUrl, "Patch");
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

// Revision names resolvable without consulting any remote: the default branch
// plus the delegate-approved canonical refs, both already carried on the `Repo`
// object.
function canonicalBranchMap(repo: Repo): Record<string, string> {
  const branchMap: Record<string, string> = {};

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

  return branchMap;
}

// Revision names published by a single remote. Fetching just that remote keeps
// the full remote listing, which is expensive on repositories with many peers,
// off the navigation path.
async function getPeerBranchMap(
  api: HttpdClient,
  repoId: string,
  peer: string,
): Promise<Record<string, string>> {
  const remote = await api.repo.getRemoteByPeer(repoId, peer);
  const refs = remoteToPeerRefs(remote).refs;
  const map: Record<string, string> = { ...getBranchesFromRefs(refs) };
  for (const [tagName, oid] of Object.entries(getTagsFromRefs(refs))) {
    map[tagName] = oid;
    map[encodeURIComponent(tagName)] = oid;
  }
  return map;
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

export const testExports = { detectRevision, canonicalBranchMap };
