---
name: radicle-ecosystem
description: Map of the sibling Radicle repositories that radicle-httpd depends on (heartwood, radicle-git, radicle-job, rips, radicle.dev), with the key crates and files to read in each. Use when working on Rust code in radicle-httpd, when you need protocol or domain context, or when a type comes from a crate outside this repo.
---

# Radicle ecosystem (sibling repos)

`radicle-httpd` depends on crates from sibling repositories. Read
source from these paths when working on Rust code.

## heartwood (`../heartwood`)

Core Radicle protocol implementation. Key crates used by httpd:
- `radicle` — standard library (storage, identity, COBs, git, node)
- `radicle-cob` — collaborative objects (issues, patches as CRDTs)
- `radicle-crypto` — Ed25519 signing, SSH key handling
- `radicle-core` — fundamental types (`RepoId`, etc.)

Key files:
- `../heartwood/HACKING.md` — development guide, environment variables
- `../heartwood/ARCHITECTURE.md` — high-level architecture
- `../heartwood/crates/radicle/src/lib.rs` — main library entry point

## radicle-git (`../radicle-git`)

Git library wrappers. Key crate:
- `radicle-surf` — code browsing (files, diffs, commits, branches,
  tags). This is what httpd uses to serve repository content.

Key file: `../radicle-git/radicle-surf/src/lib.rs`

## radicle-job (`../radicle-job`)

Decentralized job execution (CI/CD) on the Radicle network.
Key file: `../radicle-job/README.md`

## RIPs — protocol specs (`../rips`)

- `../rips/0001-heartwood.md` — protocol overview
- `../rips/0002-identity.md` — identity system (DIDs, Ed25519)
- `../rips/0003-storage-layout.md` — git storage layout

## Radicle documentation (`../radicle.dev`)

Read these when you need domain context for UI work:
- `../radicle.dev/_guides/user.md` — end-to-end user workflows
  (init, clone, seed, issues, patches, code review, private repos)
- `../radicle.dev/_guides/protocol.md` — protocol internals
  (gossip, replication, identity documents, COB data model, trust)
- `../radicle.dev/_guides/seeder.md` — seed node operation
  (seeding policies, httpd setup, DNS-SD)
- `../radicle.dev/_posts/2025-07-23-using-radicle-ci-for-development.md` — CI integration
- `../radicle.dev/_posts/2025-08-12-canonical-references.md` — canonical refs design
