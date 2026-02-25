import type { ZodSchema } from "zod";
import type { Fetcher, RequestOptions } from "./fetcher.js";
import type { Commit, Commits } from "./repo/commit.js";
import type { Issue } from "./repo/issue.js";
import type { Patch } from "./repo/patch.js";

import {
  array,
  boolean,
  literal,
  number,
  object,
  optional,
  record,
  string,
  union,
  z,
} from "zod";

import {
  commitHeaderSchema,
  commitSchema,
  commitsSchema,
  diffBlobSchema,
  diffSchema,
} from "./repo/commit.js";
import { issueSchema, issuesSchema } from "./repo/issue.js";
import { patchSchema, patchesSchema } from "./repo/patch.js";
import { authorSchema } from "./shared.js";

const repoSchema = object({
  rid: string(),
  payloads: object({
    "xyz.radicle.project": object({
      data: object({
        name: string(),
        description: string(),
        defaultBranch: string(),
      }),
      meta: object({
        head: string(),
        patches: object({
          open: number(),
          draft: number(),
          archived: number(),
          merged: number(),
        }),
        issues: object({
          open: number(),
          closed: number(),
        }),
      }),
    }),
  }),
  delegates: array(authorSchema),
  threshold: number(),
  visibility: union([
    object({ type: literal("public") }),
    object({ type: literal("private"), allow: optional(array(string())) }),
  ]),
  seeding: number(),
  canonicalTags: record(string(), string()).optional(),
  canonicalBranches: record(string(), string()).optional(),
});
const reposSchema = array(repoSchema);

export type Repo = z.infer<typeof repoSchema>;

const activitySchema = object({
  activity: array(number()),
});

export type Activity = z.infer<typeof activitySchema>;

const blobSchema = object({
  binary: boolean(),
  content: optional(string()),
  name: string(),
  path: string(),
  lastCommit: commitHeaderSchema,
});

export type Blob = z.infer<typeof blobSchema>;

const treeEntrySchema = object({
  path: string(),
  name: string(),
  oid: string(),
  kind: union([literal("blob"), literal("tree"), literal("submodule")]),
});

export type TreeEntry = z.infer<typeof treeEntrySchema>;

const treeStatsSchema = object({
  commits: number(),
  branches: number(),
  contributors: number(),
});

export type TreeStats = z.infer<typeof treeStatsSchema>;

export type Tree = z.infer<typeof treeSchema>;

const treeSchema = object({
  entries: array(treeEntrySchema),
  lastCommit: commitHeaderSchema,
  name: string(),
  path: string(),
});

export type Remote = z.infer<typeof remoteSchema>;

export const remoteSchema = object({
  id: string(),
  alias: string().optional(),
  heads: record(string(), string()),
  tags: record(string(), string()).optional(),
  delegate: boolean(),
});

const remotesSchema = array(remoteSchema) satisfies ZodSchema<Remote[]>;

export type DiffResponse = z.infer<typeof diffResponseSchema>;

const diffResponseSchema = object({
  commits: array(commitHeaderSchema),
  diff: diffSchema,
  files: record(string(), diffBlobSchema),
});

export type RepoListQuery = {
  page?: number;
  perPage?: number;
  show?: "pinned" | "all";
};
export class Client {
  #fetcher: Fetcher;

  public constructor(fetcher: Fetcher) {
    this.#fetcher = fetcher;
  }

  public async getByDelegate(
    delegateId: string,
    query?: RepoListQuery,
    options?: RequestOptions,
  ): Promise<Repo[]> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `delegates/${delegateId}/repos`,
        query,
        options,
      },
      reposSchema,
    );
  }

  public async getByRid(rid: string, options?: RequestOptions): Promise<Repo> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `repos/${rid}`,
        options,
      },
      repoSchema,
    );
  }

  public async getAll(
    query?: RepoListQuery,
    options?: RequestOptions,
  ): Promise<Repo[]> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: "repos",
        query,
        options,
      },
      reposSchema,
    );
  }

  public async getActivity(
    rid: string,
    options?: RequestOptions,
  ): Promise<Activity> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `repos/${rid}/activity`,
        options,
      },
      activitySchema,
    );
  }

  public async getReadme(
    rid: string,
    sha: string,
    options?: RequestOptions,
  ): Promise<Blob> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `repos/${rid}/readme/${sha}`,
        options,
      },
      blobSchema,
    );
  }

  public async getBlob(
    rid: string,
    sha: string,
    path: string,
    options?: RequestOptions,
  ): Promise<Blob> {
    const blob = await this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `repos/${rid}/blob/${sha}/${path}`,
        options,
      },
      blobSchema,
    );
    return blob;
  }

  public async getTree(
    rid: string,
    sha: string,
    path?: string,
    options?: RequestOptions,
  ): Promise<Tree> {
    const tree = await this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `repos/${rid}/tree/${sha}/${path ?? ""}`,
        options,
      },
      treeSchema,
    );
    return tree;
  }

  public async getTreeStatsBySha(
    rid: string,
    sha: string,
    options?: RequestOptions,
  ): Promise<TreeStats> {
    const tree = await this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `repos/${rid}/stats/tree/${sha}`,
        options,
      },
      treeStatsSchema,
    );
    return tree;
  }

  public async getAllRemotes(
    rid: string,
    options?: RequestOptions,
  ): Promise<Remote[]> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `repos/${rid}/remotes`,
        options,
      },
      remotesSchema,
    );
  }

  public async getRemoteByPeer(
    rid: string,
    peer: string,
    options?: RequestOptions,
  ): Promise<Remote> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `repos/${rid}/remotes/${peer}`,
        options,
      },
      remoteSchema,
    );
  }

  public async getAllCommits(
    rid: string,
    query?: {
      parent?: string;
      since?: number;
      until?: number;
      page?: number;
      perPage?: number;
    },
    options?: RequestOptions,
  ): Promise<Commits> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `repos/${rid}/commits`,
        query,
        options,
      },
      commitsSchema,
    );
  }

  public async getCommitBySha(
    rid: string,
    sha: string,
    options?: RequestOptions,
  ): Promise<Commit> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `repos/${rid}/commits/${sha}`,
        options,
      },
      commitSchema,
    );
  }

  public async getDiff(
    rid: string,
    revisionBase: string,
    revisionOid: string,
    options?: RequestOptions,
  ): Promise<DiffResponse> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `repos/${rid}/diff/${revisionBase}/${revisionOid}`,
        options,
      },
      diffResponseSchema,
    );
  }

  public async getIssueById(
    rid: string,
    issueId: string,
    options?: RequestOptions,
  ): Promise<Issue> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `repos/${rid}/issues/${issueId}`,
        options,
      },
      issueSchema,
    );
  }

  public async getAllIssues(
    rid: string,
    query?: {
      page?: number;
      perPage?: number;
      status?: string;
    },
    options?: RequestOptions,
  ): Promise<Issue[]> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `repos/${rid}/issues`,
        query,
        options,
      },
      issuesSchema,
    );
  }

  public async getPatchById(
    rid: string,
    patchId: string,
    options?: RequestOptions,
  ): Promise<Patch> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `repos/${rid}/patches/${patchId}`,
        options,
      },
      patchSchema,
    );
  }

  public async getAllPatches(
    rid: string,
    query?: {
      page?: number;
      perPage?: number;
      status?: string;
    },
    options?: RequestOptions,
  ): Promise<Patch[]> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `repos/${rid}/patches`,
        query,
        options,
      },
      patchesSchema,
    );
  }
}
