---
title: FAQ
---

<script>
  import Meta from '@app/marketing/Meta.svelte';
</script>

<svelte:head>

  <title>FAQ - Radicle</title>
</svelte:head>

<Meta title="FAQ | Radicle" description="Answers to the most common questions about Radicle." canonical="https://radicle.dev/faq" />

<h1 class="txt-bold-32">FAQ. <span class="txt-color-tertiary">Answers to common questions.</span></h1>

<style>
  :global(.markdown-content p),
  :global(.markdown-content li) {
    font: var(--txt-medium-16);
    line-height: 1.6;
    color: var(--color-text-tertiary);
  }
</style>

If you can’t find an answer here, drop by our [support channel][support] and ask it there.

[support]: https://radicle.zulipchat.com/#narrow/stream/369873-support

## General Questions

### What is Radicle? How is it different from Git/GitHub?

Radicle is a peer-to-peer code collaboration platform ([“forge”][forge]) built on Git. Unlike centralized platforms like GitHub, there is no single entity controlling the network or user data. Repositories are replicated across peers in a decentralized manner. Radicle is an alternative for people and organizations who want full control of their data and user experience, without compromising on the social aspects of collaboration platforms.

[forge]: https://en.wikipedia.org/wiki/Forge_(software)

### Who is using Radicle currently? How many users does it have?

As of September 2024, there are around 2000 repositories hosted on the network, and a little over 200 nodes online on a weekly basis.

### How many people are working on it?

We currently have around 12 people working on Radicle, spread across the protocol, CLI, TUI, web, operations and content.

### How long have you been working on Radicle?

The current codebase is a little under 2 years old, but we’ve been working on the problem for over 4 years in total. Previous iterations of Radicle can be found online, but are considered deprecated in favor of [Heartwood][heartwood], the latest generation of the protocol.

[heartwood]: https://radicle.network/nodes/seed.radicle.xyz/rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5

## Technical Questions

### What do you mean by “peer-to-peer”?

We define it the same way [Wikipedia][p2p] defines it; specifically this part: “Peers are equally privileged, equipotent participants in the network”.

So a peer-to-peer system is one where all participants are “equally privileged in the network”. This usually means they all run the same software as well.

[p2p]: https://en.wikipedia.org/wiki/Peer-to-peer

### Isn’t Git already peer-to-peer? Why do I need Radicle?

While Git is designed in some way for peer-to-peer interactions, there is no deployment of it that works that way. All deployments use the client-server model because Git lacks functionality to be deployed as-is in a peer-to-peer network.

For one, it has no way of verifying that the repository you downloaded after a `git clone` is the one you asked for, which means you need to clone from a trusted source (ie. a known server). This isn’t compatible with peer-to-peer in any useful way.

Radicle solves this by assigning stable identities to repositories that can be verified locally, allowing repositories to be served by untrusted parties.

### What does Radicle solve that isn’t already solved by Git commit signatures?

Verifying Git commit signatures, eg. via `git verify-commit` is a good security practice, however Git doesn’t solve the problem of knowing whether a signature was made by an active maintainer of the repository or not. It can only indicate whether the signature is valid or not.

Therefore, to ensure that the repository head was signed by one of the repository’s _current maintainers_, users would have to keep track of what the current maintainer set is at all times, getting that information from a trusted source.

Radicle checks this automatically, by verifying changes to the maintainer set through the repository identity document. All you need to know is that you have the correct Repository ID (RID). See [RIP-2][rip-2] for more information.

[rip-2]: https://radicle.network/nodes/seed.radicle.xyz/rad:z3trNYnLWS11cJWC6BbxDs5niGo82/tree/0002-identity.md

### Isn’t SHA-1 broken? How do you handle hash collisions?

SHA-1 is indeed broken, which is why Git uses a “hardened” SHA-1 hash function that can detect collisions, and generate a new “safe” hash. This process is called [counter-cryptanalysis][cc]. Radicle uses Git’s hardened SHA-1 function, since all replicated objects are stored in Git, and is therefore safe from collision attacks.

[cc]: https://marc-stevens.nl/research/papers/C13-S.pdf

### How does Radicle handle code discoverability and search, compared to centralized platforms?

Basic search functionality exists, but this area is still a work-in-progress. We expect more improvements in search/discovery in the future.

### Can Radicle handle large binary files like datasets or machine learning models?

Radicle uses Git internally, which can handle moderately-sized binary data relatively well. For large data however, we are considering adding support for solutions like `git-annex` or `git-lfs`. We intend for Radicle to help with the proliferation of open source AI models.

### How does Radicle ensure persistence and availability of repositories when nodes go offline?

Repositories are replicated across multiple peers on the network, so they remain available as long as at least one seeding node is online. Users have fine-grained control over which repositories they personally host and seed.

Additionally, certain nodes on the network act as _seed nodes_ - always-on public nodes - that ensure a certain level of data availability.

### How does Radicle handle issues, pull requests, code reviews etc. compared to GitHub?

Radicle has its own model for issues and pull requests (called “patches”), implemented via its own technology called Collaborative Objects (COBs). It supports non-destructive updates to patches and code reviews tied to patch revisions.

Patches and issues in Radicle are stored within Git’s object database and are therefore also available offline.

### Is there a way to run Radicle over Tor, I2P or other censorship-resistant networks?

Yes, Radicle is designed with Tor, Nym and I2P support in mind, though it’s still very early and these integrations haven’t been thoroughly tested.

### How does Radicle deal with NATs?

Radicle currently relies on seed nodes to serve data to peers behind [NATs][nat]. However, a [hole-punching][hp] protocol is currently under development, which would allow peers behind NATs to exchange data directly.

[hp]: https://en.wikipedia.org/wiki/Hole_punching_(networking)
[nat]: https://en.wikipedia.org/wiki/Network_address_translation

### How does Radicle deal with potential abuse, illegal content sharing etc. on the network?

Each node is free to choose which repositories to host (_seed_) using configured policies. Nodes can block specific repositories or peers exhibiting abusive behavior.

### Is there a way to host private repositories on Radicle?

Yes, Radicle supports private repositories that are only shared among a trusted set of peers, not the entire network. These are not encrypted at rest but rely on selective replication and are thus completely invisible to the rest of the network.

### What is the process for migrating existing GitHub projects to Radicle?

There are community tools under development for migrating issues and pull-requests. We are planning full migration tooling for the future.

### Is there a way to easily mirror GitHub repositories on Radicle?

There is no built-in mirroring yet, but you can easily set up a `cron` job to pull from GitHub and push to Radicle periodically.

### Does Radicle have plans to support Windows?

Currently Radicle only supports Unix-based systems like Linux and macOS. We plan to add Windows support if there is enough demand.

### How does Radicle ensure consistency and prevent multiple versions of the “same” repository?

Radicle assigns stable identities to repositories that can be cryptographically verified. Changes in repository ownership are signed by previous owners forming a verifiable chain of provenance.

### Does Radicle use existing peer-to-peer technologies such as IPFS?

No. The first generation of Radicle protocols was built on top of IPFS, but it was too slow and impractical to use. One of the key issues Radicle needs to solve is handling mutable objects: code repositories change all the time, so a content-addressable store like IPFS is not really a solution.

### Does Radicle use a DHT?

Radicle does not use DHT technology because DHTs don’t allow nodes on the network to have much of a say in terms of what content they participate in serving.

Additionally, DHTs can introduce high network latency, especially in the case of permissionless networks, due to requests beyond routed across the globe.

## User Experience

### Are there plans to add multilingual/localization support to the UI?

We will add multilingual support if there is enough demand from the community.

### How does the user experience of using Radicle command line tools compare to Git?

Radicle is built on top of Git, so the workflow is quite similar. The `rad` CLI is provided for Radicle-specific functionality, and a Git [remote-helper][grh] is used for seamless integration with Git `push` and `pull` workflows.

Additionally, the `rad` CLI was designed to be as familiar as possible to Git users.

[grh]: https://git-scm.com/docs/gitremote-helpers

### What is the suggested development workflow when using Radicle?

The workflow is similar to using Git with a platform like GitHub. You clone a repository, make changes locally, then push to the network. Collaboration happens via issues, patches (pull requests), and code review. The difference is that Radicle doesn’t have a shared write access model like GitHub. Each user is required to push to their own namespace.

### How do I use Radicle with multiple devices?

At the moment, each device is required to be identified by a unique Radicle identity. We are currently working on proper multi-device support in Radicle, which will enable sharing a single identity across devices.

### Do I need to run a node to use Radicle?

Yes. The node is an essential part of what makes Radicle sovereign. However, you don’t have to keep your node running at all times, if you are trying to conserve bandwidth; Radicle works just as well while offline.

### How do you fork an abandoned repository?

With `rad init`.

When you fork an abandoned repo, you are essentially giving it a new repository identity, which is a new root of trust, with a new maintainer set. You’ll then have to communicate the new repository identifier and explain that this is a fork of the old repo.

### Are there plugins for code editors to work with Radicle?

There is a Visual Studio Code [integration][vscode] extension built by the community.

[vscode]: https://marketplace.visualstudio.com/items?itemName=radicle-ide-plugins-team.radicle

## Monetization & Funding

### What is the monetization strategy for Radicle? Is Radicle free software?

The Radicle protocol and clients are free and open source software licensed under the MIT and Apache 2.0 licenses, and will remain free software for ever.

Radicle is currently funded by Radworks. Radworks intends to offer hosting and retrieval services on top of the Radicle protocol. All of Radworks financials are publicly accessible [here][tally].

### What is the relationship between Radicle and the Radworks (`$RAD`) token?

Radicle is a true peer-to-peer protocol. It doesn’t use nor depend on any blockchain or cryptocurrency.

[Radworks][radworks], the organization that has been financing Radicle is organized around the `RAD` token which is a governance token on Ethereum.

### How much funding has Radicle raised?

The Radicle team is funded by [Radworks][radworks]. To date, around $7m has been granted towards the development of Radicle, by Radworks. Grant proposals for the last two years can be found [here][tally].

## Legal

### Am I liable as a Node Operator?

Node operators should consult applicable local regulations. Radicle is free and open-source software; the project does not provide legal advice.

[tally]: https://www.tally.xyz/gov/radworks
[radworks]: https://radworks.org

---

If you have any other questions, feel free to drop into our [support channel](https://radicle.zulipchat.com/#narrow/stream/369873-support) on Zulip.
