import type {
  CommitHeader,
  CommitWithFiles,
  Commits,
} from "./project/commit.js";
import type { Fetcher, RequestOptions } from "./fetcher.js";
import type {
  Issue,
  IssueCreated,
  IssueUpdateAction,
} from "./project/issue.js";
import type {
  Patch,
  PatchCreate,
  PatchCreated,
  PatchUpdateAction,
} from "./project/patch.js";
import type { SuccessResponse } from "./shared.js";
import type { ZodSchema } from "zod";

import { successResponseSchema } from "./shared.js";
import {
  array,
  boolean,
  literal,
  number,
  optional,
  record,
  object,
  string,
  union,
  z,
} from "zod";

import {
  commitBlobSchema,
  commitHeaderSchema,
  commitSchemaWithFiles,
  commitsSchema,
  diffSchema,
} from "./project/commit.js";

import {
  issueCreatedSchema,
  issueSchema,
  issuesSchema,
} from "./project/issue.js";

import {
  patchSchema,
  patchesSchema,
  patchCreatedSchema,
} from "./project/patch.js";

const projectSchema = object({
  id: string(),
  name: string(),
  description: string(),
  defaultBranch: string(),
  delegates: array(string()),
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
  trackings: number(),
});
const projectsSchema = array(projectSchema);

export type Project = z.infer<typeof projectSchema>;

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
  kind: union([literal("blob"), literal("tree")]),
});

export type TreeEntry = z.infer<typeof treeEntrySchema>;

export interface TreeStats {
  commits: number;
  branches: number;
  contributors: number;
}

export type Tree = z.infer<typeof treeSchema>;

const treeSchema = object({
  entries: array(treeEntrySchema),
  lastCommit: commitHeaderSchema,
  name: string(),
  path: string(),
  stats: object({
    commits: number(),
    branches: number(),
    contributors: number(),
  }),
});

export type Remote = z.infer<typeof remoteSchema>;

const remoteSchema = object({
  id: string(),
  alias: string().optional(),
  heads: record(string(), string()),
  delegate: boolean(),
});

const remotesSchema = array(remoteSchema) satisfies ZodSchema<Remote[]>;

export type DiffResponse = z.infer<typeof diffResponseSchema>;

const diffResponseSchema = object({
  commits: array(commitHeaderSchema),
  diff: diffSchema,
  files: record(string(), commitBlobSchema),
});

export class Client {
  #fetcher: Fetcher;

  public constructor(fetcher: Fetcher) {
    this.#fetcher = fetcher;
  }

  public async getByDelegate(
    delegateId: string,
    options?: RequestOptions,
  ): Promise<Project[]> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `delegates/${delegateId}/projects`,
        options,
      },
      projectsSchema,
    );
  }

  public async getById(id: string, options?: RequestOptions): Promise<Project> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `projects/${id}`,
        options,
      },
      projectSchema,
    );
  }

  public async getAll(
    query?: { page?: number; perPage?: number },
    options?: RequestOptions,
  ): Promise<Project[]> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: "projects",
        query,
        options,
      },
      projectsSchema,
    );
  }

  public async getActivity(
    id: string,
    options?: RequestOptions,
  ): Promise<Activity> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `projects/${id}/activity`,
        options,
      },
      activitySchema,
    );
  }

  public async getReadme(
    id: string,
    sha: string,
    options?: RequestOptions,
  ): Promise<Blob> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `projects/${id}/readme/${sha}`,
        options,
      },
      blobSchema,
    );
  }

  public async getBlob(
    id: string,
    sha: string,
    path: string,
    options?: RequestOptions,
  ): Promise<Blob> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `projects/${id}/blob/${sha}/${path}`,
        options,
      },
      blobSchema,
    );
  }

  public async getTree(
    id: string,
    sha: string,
    path?: string,
    options?: RequestOptions,
  ): Promise<Tree> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `projects/${id}/tree/${sha}/${path ?? ""}`,
        options,
      },
      treeSchema,
    );
  }

  public async getAllRemotes(
    id: string,
    options?: RequestOptions,
  ): Promise<Remote[]> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `projects/${id}/remotes`,
        options,
      },
      remotesSchema,
    );
  }

  public async getRemoteByPeer(
    id: string,
    peer: string,
    options?: RequestOptions,
  ): Promise<Remote> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `projects/${id}/remotes/${peer}`,
        options,
      },
      remoteSchema,
    );
  }

  public async getAllCommits(
    id: string,
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
        path: `projects/${id}/commits`,
        query,
        options,
      },
      commitsSchema,
    );
  }

  public async getCommitBySha(
    id: string,
    sha: string,
    options?: RequestOptions,
  ): Promise<CommitWithFiles> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `projects/${id}/commits/${sha}`,
        options,
      },
      commitSchemaWithFiles,
    );
  }

  public async getDiff(
    id: string,
    revisionBase: string,
    revisionOid: string,
    options?: RequestOptions,
  ): Promise<DiffResponse> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `projects/${id}/diff/${revisionBase}/${revisionOid}`,
        options,
      },
      diffResponseSchema,
    );
  }

  public async getIssueById(
    id: string,
    issueId: string,
    options?: RequestOptions,
  ): Promise<Issue> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `projects/${id}/issues/${issueId}`,
        options,
      },
      issueSchema,
    );
  }

  public async getAllIssues(
    id: string,
    query?: {
      page?: number;
      perPage?: number;
      state?: string;
    },
    options?: RequestOptions,
  ): Promise<Issue[]> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `projects/${id}/issues`,
        query,
        options,
      },
      issuesSchema,
    );
  }

  public async createIssue(
    id: string,
    body: {
      title: string;
      description: string;
      assignees: string[];
      embeds: { name: string; content: string }[];
      labels: string[];
    },
    authToken: string,
    options?: RequestOptions,
  ): Promise<IssueCreated> {
    return this.#fetcher.fetchOk(
      {
        method: "POST",
        path: `projects/${id}/issues`,
        headers: { Authorization: `Bearer ${authToken}` },
        body,
        options,
      },
      issueCreatedSchema,
    );
  }

  public async updateIssue(
    id: string,
    issueId: string,
    body: IssueUpdateAction,
    authToken: string,
    options?: RequestOptions,
  ): Promise<SuccessResponse> {
    return this.#fetcher.fetchOk(
      {
        method: "PATCH",
        path: `projects/${id}/issues/${issueId}`,
        headers: { Authorization: `Bearer ${authToken}` },
        body,
        options,
      },
      successResponseSchema,
    );
  }

  public async getPatchById(
    id: string,
    patchId: string,
    options?: RequestOptions,
  ): Promise<Patch> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `projects/${id}/patches/${patchId}`,
        options,
      },
      patchSchema,
    );
  }

  public async getAllPatches(
    id: string,
    query?: {
      page?: number;
      perPage?: number;
      state?: string;
    },
    options?: RequestOptions,
  ): Promise<Patch[]> {
    return this.#fetcher.fetchOk(
      {
        method: "GET",
        path: `projects/${id}/patches`,
        query,
        options,
      },
      patchesSchema,
    );
  }

  public async createPatch(
    id: string,
    body: PatchCreate,
    authToken: string,
    options?: RequestOptions,
  ): Promise<PatchCreated> {
    return this.#fetcher.fetchOk(
      {
        method: "POST",
        path: `projects/${id}/patches`,
        headers: { Authorization: `Bearer ${authToken}` },
        body,
        options,
      },
      patchCreatedSchema,
    );
  }

  public async updatePatch(
    id: string,
    patchId: string,
    body: PatchUpdateAction,
    authToken: string,
    options?: RequestOptions,
  ): Promise<SuccessResponse> {
    return this.#fetcher.fetchOk(
      {
        method: "PATCH",
        path: `projects/${id}/patches/${patchId}`,
        headers: { Authorization: `Bearer ${authToken}` },
        body,
        options,
      },
      successResponseSchema,
    );
  }
}
