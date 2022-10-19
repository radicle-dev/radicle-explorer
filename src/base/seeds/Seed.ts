import { Request, type Host } from "@app/api";
import type { Config } from "@app/config";
import * as proj from "@app/project";
import { isDomain, isLocal } from "@app/utils";
import { assert } from "@app/error";

export interface Stats {
  projects: { count: number };
  users: { count: number };
}

export class InvalidSeed {
  valid = false as const;

  host?: string;
  id?: string;

  constructor(host?: string, id?: string) {
    this.host = host;
    this.id = id;
  }
}

export class Seed {
  valid = true as const;

  api: { host: string; port: number | null };
  git: { host: string; port: number | null };
  link: { host: string; id: string; port: number };

  version?: string;
  emoji: string;

  constructor(
    seed: {
      host: string;
      id: string;
      git?: string | null;
      api?: string | null;
      version?: string | null;
    },
    cfg: Config,
  ) {
    assert(isDomain(seed.host), `invalid seed host: ${seed.host}`);
    assert(/^[a-z0-9]+$/.test(seed.id), `invalid seed id ${seed.id}`);

    let api = null;
    let git = null;
    let apiPort: number | null = cfg.seed.api.port;
    let gitPort: number | null = cfg.seed.git.port;

    if (seed.api) {
      try {
        const url = new URL(seed.api);
        api = url.hostname;
        apiPort = url.port ? Number(url.port) : null;
        if (url.protocol === "http:" && url.port === "") {
          apiPort = 80;
        }

        if (url.protocol === "https:" && url.port === "") {
          apiPort = 443;
        }
      } catch {
        api = seed.api;
      }
      assert(isDomain(api), `invalid seed api host ${api}`);
    }

    if (seed.git) {
      try {
        const url = new URL(seed.git);
        git = url.hostname;
        gitPort = url.port ? Number(url.port) : null;
      } catch {
        git = seed.git;
      }
      assert(isDomain(git), `invalid seed git host ${git}`);
    }

    const meta = cfg.seeds.pinned.find(s => s.name === seed.host);
    if (meta) {
      this.emoji = meta.emoji;
    } else if (isLocal(seed.host)) {
      this.emoji = "🏠";
    } else {
      this.emoji = "🌱";
    }

    // The `git` and `api` keys being more specific take
    // precedence over the `host`, if available.
    api = api ?? seed.host;
    git = git ?? seed.host;

    this.api = { host: api, port: apiPort };
    this.git = { host: git, port: gitPort };
    this.link = { host: seed.host, id: seed.id, port: cfg.seed.link.port };

    if (seed.version) {
      this.version = seed.version;
    }
  }

  get id(): string {
    return this.link.id;
  }

  get host(): string {
    return this.api.host;
  }

  async getPeer(): Promise<{ id: string }> {
    return Seed.getPeer(this.api);
  }

  async getProject(urn: string): Promise<proj.ProjectInfo> {
    return proj.Project.getInfo(urn, this.api);
  }

  async getProjects(perPage: number, id?: string): Promise<proj.ProjectInfo[]> {
    const result = id
      ? await proj.Project.getDelegateProjects(id, this.api, { perPage })
      : await proj.Project.getProjects(this.api, { perPage });

    return result.map((project: proj.ProjectInfo) => ({
      ...project,
      id: project.urn,
    }));
  }

  async getStats(): Promise<{
    projects: { count: number };
    users: { count: number };
  }> {
    return new Request("/stats", this.api).get();
  }

  static async getPeer(host: Host): Promise<{ id: string }> {
    return new Request("/peer", host).get();
  }

  static async getInfo(host: Host): Promise<{ version: string }> {
    return new Request("/", host).get();
  }

  static async lookup(seedHost: Host, cfg: Config): Promise<Seed> {
    const [info, peer] = await Promise.all([
      Seed.getInfo(seedHost),
      Seed.getPeer(seedHost),
    ]);

    return new Seed(
      {
        host: seedHost.host,
        id: peer.id,
        version: info.version,
        api: `https://${seedHost.host}:${seedHost.port}`,
      },
      cfg,
    );
  }
}
