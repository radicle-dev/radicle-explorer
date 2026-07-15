---
title: Radicle Protocol Guide
subtitle: How Radicle works under the hood
---

<script>
  import Meta from '@app/marketing/Meta.svelte';
</script>

<svelte:head>

  <title>Protocol Guide | Radicle</title>
</svelte:head>

<Meta title="Protocol Guide | Radicle" description="Gossip, replication, identity, and the data structures behind Radicle." canonical="https://radicle.dev/guides/protocol" />

# Radicle Protocol Guide

Heartwood, the latest generation of the [Radicle](/) protocol establishes a sovereign data network for code collaboration and publishing, built on top of [Git][git]. In Radicle, users maintain local copies of their repositories of interest and related social artifacts such as issues and patches. Instead of depending on a centralized service like GitHub, each participant in Radicle operates a node that is capable of running on a personal computer, and is connected via a peer-to-peer network.

Nodes, identified by [public keys][pkc], host and synchronize Git repositories across the network, using a novel gossip protocol for peer and repository discovery, alongside Git’s [protocol][git-v2] for data replication. In combination, this allows nodes to locate, replicate, and verify any repository published to the network, provided at least one other peer seeding the repository is online. Since Radicle is built on Git, it can easily interoperate with existing tools and workflows.

Radicle’s architecture is [local-first][local-first], ensuring continuous access to one’s repositories directly from their device, regardless of internet connectivity. Repositories have unique identifiers and are self-certifying, meaning all actions, from committing code to adding a comment to an issue, are performed locally and [cryptographically signed][signing], allowing peers to verify authenticity and data provenance once propagated to the network. This allows trust to be established without reliance on a centralized authority.

Radicle is designed for extensibility, allowing for diverse use cases without necessitating modifications at the protocol level. This guide delves into the capabilities of Radicle’s initial release, which has a focus on code collaboration and code publishing. Nonetheless, a range of other applications is foreseen in the future and possible today, including knowledge sharing, project coordination, and data set collaboration.

## Introduction

Git, the most widely-used distributed version control system, enables users to maintain and modify personal copies of data repositories, commonly for source code control. Its structure for direct user-to-user collaboration, while feasible, is often cumbersome since Git primarily focuses on version control rather than collaboration. As a result, users frequently opt for centralized [forges][forges] like GitHub or GitLab, which offer enhanced interfaces and collaborative tools on top of Git, such as project management and code review. This dependency, however, can result in vendor lock-in since it places a project’s social artifacts (e.g. issues, comments, pull requests) out of user control, potentially compromising data sovereignty and other user freedoms.

Traditional self-hosted forges like [Gitea][gitea] or [Forgejo][forgejo] provide more sovereignty but often lead to fragmented collaboration environments, as users must create separate profiles for each hosted instance. This simultaneously limits a project’s exposure to the wider open source community, a key advantage of platforms like GitHub, which have grown significantly due to network effects. This isolation can impact the visibility and collaborative potential of projects that choose traditional self-hosted solutions.

The Radicle protocol, in contrast, extends Git’s capabilities with a decentralized identity system, novel gossip protocol, and integrated social artifacts, forming a _self-hosted network for code collaboration_. Radicle locates, serves, and replicates Git repositories -- including artifacts -- across a [peer-to-peer][peer-to-peer] network while maintaining data authenticity via cryptographic signatures, so peers can directly exchange data without the need for a trusted third party. This enables communities to both self-host and share their repositories across a distributed protocol, contributing to the emergence of a new sovereign network for code collaboration and more.

## Nodes

Radicle is a [peer-to-peer][peer-to-peer] system, which means that there is no traditional client-server model. Peers on the Radicle network are referred to as _nodes_, and are indistinguishable from users at the protocol level. Nodes, identified by their [Node ID](#node-identifiers-nids) (NID) -- an [Ed25519][ed25519] public key -- are responsible for seeding Git repositories, each identified by a unique [Repository ID](#repository-identifier-rid) (RID). The seeding process involves both hosting the repository data and synchronizing changes with other nodes. Every Radicle user, irrespective of their role or activity, runs a node on their device. No specialized equipment is necessary for operating a node as a typical end-user; nodes can run on a personal computer without requiring a server.

<aside> In the peer-to-peer model, nodes act as <em>both clients and
servers</em>. </aside>

### Seeding Repositories

Whenever a user clones, initializes, or opts to seed a repository, their node’s seeding policy is changed to reflect their choices. This policy establishes the repositories they are interested in and sets the rules for data retention, and synchronization, allowing users to have direct control over which repositories are kept on their device and offered to the network.

The typical end-user may choose to only seed the repositories they are actively collaborating on. However, more dedicated users may opt to run an always-on **seed node**, offering their infrastructure to the wider Radicle network or to their community. Seed nodes significantly enhance the network’s capacity to provide continuous access to a broad range of repositories. They can vary in their seeding policies, from _public seed nodes_ that openly seed all repositories to _community seed nodes_ that selectively seed repositories from a group of trusted peers.

<aside> For more details on how to run a seed node, refer to the <a
href="/guides/seeder">Radicle Seeder’s Guide</a>.
</aside>

### Node Identifiers (NIDs)

<aside class="kicker"> DIDs are a new identifier standard established by the
W3C. </aside>

Radicle node identity is based on [public-key cryptography][pkc], which makes it easy to verify the authenticity of messages within the network through [digital signatures][signing]. This also allows for consistent identification even as a user’s physical address varies. When setting up a node, users generate their unique key pair, an [Ed25519][ed25519] public and private key, the public part of which is encoded and shared as a [Decentralized Identifier][did] (DID). Creating a node identity requires no permission or coordination: the key pair can be created while offline without providing an email address or any personal identifying information.

<aside> DIDs enable verifiable, self-sovereign digital identities that are
fully under the control of the DID subject, independent of any centralized
registry, identity provider, or certificate authority. </aside>

<figure>
  <pre class="center">did:key:<span class="highlight">z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK</span></pre>
  <figcaption>Example Node ID encoded as a DID using the <a
  href="https://w3c-ccg.github.io/did-method-key/"><code>did:key</code>
  method</a>.</figcaption>
</figure>

It is important to safeguard one’s private key, as if it is either lost or compromised, one will have to generate a new node identity. A changeable, non-unique **alias** can optionally be associated to each node, for easier human identification across the network.

<aside> In the Radicle protocol, the terms “Node ID”, “Peer ID”, and “Public
Key” all refer to the same thing and can be used interchangeably. </aside>

### Running a Node

To run a node and connect to the network, users install Radicle client software that is lightweight and suitable for use on both end-user devices and seed nodes. The reference implementation can be found in the Radicle [Heartwood][heartwood] repository, and is actively maintained by a small team of engineers.

<aside> Radicle’s reference implementation is written in <a
href="https://www.rust-lang.org/">Rust</a>, a high-performance, memory-safe
language. </aside>

The Radicle _stack_ is comprised of both the network client and a command line interface (CLI), which can be optionally supplemented with a web frontend. Radicle is released under the open source MIT and Apache 2.0 licenses, to encourage the development of diverse clients and applications. All client software adheres to the Radicle protocol specification, as outlined in the [Radicle Improvement Proposals][rips] (RIPs) repository, ensuring consistent functionality across implementations.

<aside> For a guided install of the Radicle stack, check out the <a
href="/guides/user">user guide</a>. For reproducible binaries and verification, see the <a href="/download">download</a> page. </aside>

## Peer-to-peer Protocol

Radicle adopts a local-first, peer-to-peer (P2P) architecture, which draws inspiration from Secure Scuttlebutt (SSB) and Bitcoin’s [Lightning Network][ln].

Nodes on the Radicle network subscribe to repository data they are interested in, and peers announce updates that in turn trigger fetches for the underlying content. Just like SSB and Lightning, updates are [gossiped][gossip] on the network until they reach all interested peers.

Peer connections in Radicle are secured thanks to a [Noise protocol][noise] handshake. Radicle uses the [Noise XK][noise-xk] pattern specifically, just like the Lightning Network with the Node ID as the _static key_. This requires nodes to know the Node IDs of their peers before connecting to them, which takes place through the exchange of peer information over the gossip protocol.

Unlike SSB’s focus on social networking via append-only logs, Radicle focuses on code collaboration by incorporating Git’s [object model][git-odb] and [transfer protocol][git-pack] into a peer-to-peer context. This architecture not only leverages Git’s proven efficiency and reliability but also gives users complete autonomy over their social artifacts. Radicle’s peer-to-peer architecture, in contrast to federated systems, ensures no centralized points of failure, allowing the network to persist as long as users operate nodes.

<figure class="diagram">
  <img src="/marketing/images/guides/p2p-network.svg" alt="A set of connected peers forming a gossip network" />
  <figcaption>A set of connected peers forming a gossip network.</figcaption>
</figure>

### Gossip Protocol

The Radicle networking layer is designed as a gossip protocol, where messages are relayed between peers to build routing tables that aid in repository discovery and replication. The core functionality is achieved with three message types, each fulfilling a distinct role:

**Node Announcements** are used for broadcasting Node IDs and physical addresses on which a node is publicly reachable, to facilitate peer discovery.

| Node Announcement |                                       |
| ----------------- | ------------------------------------- |
| **`version`**     | `u8` - Supported protocol version     |
| **`features`**    | `u64` - Advertised node capabilities  |
| **`timestamp`**   | `u64` - Message timestamp (unix time) |
| **`alias`**       | `u8[]` - Non-unique alias (UTF-8)     |
| **`addresses`**   | `Address[]` - External addresses      |
| **`nonce`**       | `u64` - Nonce used for DoS protection |
| **`agent`**       | `u8[]` - User-agent (UTF-8)           |

**Inventory Announcements** are used for broadcasting repository inventories and constructing the routing table which maps out what repositories are hosted where.

| Inventory Announcement |                                       |
| ---------------------- | ------------------------------------- |
| **`inventory`**        | `RepoID[]` - Repository inventory     |
| **`timestamp`**        | `u64` - Message timestamp (unix time) |

**Reference Announcements** are used for broadcasting updates to repositories, relayed only to nodes interested in the relevant repository.

| Refs Announcement |                                                         |
| ----------------- | ------------------------------------------------------- |
| **`rid`**         | `RepoID` - Repository that was updated                  |
| **`refs`**        | `{NodeID, OID}[]` - Updated signed refs (`rad/sigrefs`) |
| **`timestamp`**   | `u64` - Message timestamp (unix time)                   |

<aside> <code>OID</code> stands for <em>Object ID</em> and represents the SHA-1
hashes used by Git to identify objects.</aside>

To prevent endless propagation, nodes drop any message already encountered. However, for the sake of broadcasting messages to new nodes, gossip messages may be temporarily stored and replayed to nodes joining the network for the first time, or after a long period of being offline.

Each announcement includes the originating _Node ID_ along with a _cryptographic signature_ and _timestamp_, allowing network participants to verify the authenticity of messages before relaying them to peers.

<figure>
  <img src="/marketing/images/guides/announcement-msg.svg" alt="Announcement message structure" />
  <figcaption>Announcement message structure.</figcaption>
</figure>

> **Tip**: Refer to [RIP-1][rip-1] to learn more details about Radicle’s networking protocol.

### Transport Encryption & Privacy

Connections between peers in the Radicle network are encrypted using a [Noise][noise] protocol handshake. This begins with two peers performing a [Diffie-Hellman][ecdh] key exchange to agree on a shared session key that is used for the duration of the connection.

Radicle uses the [XK][noise-xk] handshake pattern, which requires the connection responder’s _static key_ to be known in advance by the initiator. This _pre-sharing_ takes place over the gossip network via the `NodeAnnouncement` message, since the static key is simply the Node ID.

<aside> The Noise framework calls the node that is receiving an inbound
connection the <em>responder</em>, and the node that is initiating the
connection the <em>initiator</em>. </aside>

<figure class="diagram">
  <img src="/marketing/images/guides/noisexk-1.svg" alt="Noise XK handshake phase 1" />
</figure>

Once the static key is known, a connection to the node can be initiated securely, by generating an ephemeral key from the static key, using Diffie-Hellman. The last step involves the initiating node sending its own static key over the secure channel.

<figure class="diagram">
  <img src="/marketing/images/guides/noisexk-2.svg" alt="Noise XK handshake phase 2" />
</figure>

After the handshake phase is completed, all data exchanged between peers is fully encrypted and benefits from strong [forward secrecy][fs], ensuring secure and private communications across the network.

> **Tip**: Radicle also supports [Tor][tor] addresses. Users can leverage Tor to hide their IP address from peers, and connect to `.onion` addresses on the Tor network.

### Replication via Git

While gossip is used to exchange metadata, actual repository data is transferred via replication using the [Git protocol][git-pack]. The process begins with a node establishing a secure connection to one or more of the repository’s seeds, upon receiving a _reference_ or _inventory_ announcement of interest.

Once connected, the node initiates a Git _fetch_ protocol, which involves negotiating which objects should be sent or skipped by the remote node. The objects are then downloaded into the node’s storage, making them accessible to other nodes via the same process.

Since Radicle uses a [framing][framing] protocol for all its sessions, the fetch protocol is able to take place over the same physical connection between nodes as the gossip protocol. This allows for a more efficient use of resources and avoids certain problems with [NATs][nat]. Although Git’s protocols are typically connection-based, Radicle’s design allows for multiple concurrent Git fetches to take place over a single connection.

<aside> The idea of re-using a network connection for multiple concurrent
protocols is called <a
href="https://en.wikipedia.org/wiki/Multiplexing">multiplexing</a>. </aside>

<figure class="diagram">
  <img src="/marketing/images/guides/multiplexing.svg" alt="Connection multiplexing in Radicle" />
  <figcaption>Connection multiplexing in Radicle.</figcaption>
</figure>

### Bootstrap Nodes

A node joining the network for the first time will not know any peers. Hence, it’s useful to pre-configure network clients with addresses of well-known nodes that can be used to initiate or _bootstrap_ the peer discovery process and build an address book.

Radicle’s reference implementation is pre-configured with two bootstrap nodes that are connected to if the address book is empty: `iris.radicle.network` and `rosa.radicle.network`. These are nodes run by the Radicle team and have large address books that are shared with connecting peers.

In the bootstrapping process, nodes connect to an initial set of bootstrap nodes and once they establish a connection, use the regular peer discovery mechanism to find more peers.

### Federation vs. Peer-to-peer

Federation allows for a degree of sovereignty, as each node can set its content policies, but user experience and identity are ultimately tied and mediated by these nodes’ administrators rather than by the users themselves.

> **federation** /ˌfɛdəˈreɪʃn/ _n._
>
> _(Computing)_ A system architecture where multiple independent servers or nodes operate under a common set of standards and protocols, allowing them to share data, resources, and functionalities across boundaries while maintaining autonomy. This model enables interoperability and collective services among diverse systems without fully centralizing control, thereby enhancing privacy, scalability, and resilience. Each node in a federated network can set its policies, manage its users, and control its data.

<aside> Examples of federated systems include <a href="https://atproto.com">AT
Protocol</a>, <a href="https://joinmastodon.org/">Mastodon</a> and plain old
E-mail. </aside>

Although federated models promote a level of decentralization, they face unique challenges, such as when node operators decide to block other nodes, taking that choice away from its users and restricting the free flow of information.

Federated systems also face challenges related to incentives; specifically, when the operational costs of maintaining a node exceed the perceived benefits, node operators are often compelled to shut down. This can disrupt access for users, undermining the platform’s reliability and the continuity of service.

While Radicle seed nodes face similar challenges, this has little bearing on the end user: seed nodes are interchangeable and offer an undifferentiated service; they are not tied to a user’s identity or access to the network.

<figure class="diagram">
  <img src="/marketing/images/guides/federation-vs-p2p.svg" alt="Federation vs. peer-to-peer" />
  <figcaption>Federation (left) vs. peer-to-peer (right).</figcaption>
</figure>

## Repositories

**Repositories** are central to the Radicle network, serving as the primary data abstraction and object shared between peers. A repository in Radicle is fundamentally a Git repository, supplemented with a unique repository identifier (RID) and metadata essential for validating the authenticity of its contents.

Radicle repositories, which can be either public or private, can accommodate diverse content including source code, documentation, and arbitrary data sets. All repositories are initialized with an [identity document](#identity-document) from which a unique Repository ID (RID) is derived.

The identity document is where repository permissions and ownership are defined, as well as identifying metadata such as name and description.

### Delegates

Repositories are managed and owned by what are called _delegates_. A delegate is an individual, group, or bot, identified by a [DID][did]. Delegates are responsible for critical tasks such as merging patches, addressing issues, and modifying repository permissions. A repository always begins with one delegate, its creator, and can eventually grow to multiple delegates.

### Identity Document

Before a repository can be published on Radicle, it needs to be initialized with an _identity document_. This JSON document, stored under the `refs/rad/id` reference in Git, encapsulates key metadata such as the repository’s name, description, and default branch. It also includes the DIDs of the repository’s delegates and the _threshold_ of delegate signatures required to authorize changes to the repository’s default branch.

<aside> The identity document is stored in Canonical JSON form. Canonical JSON
form standardizes JSON encoding to ensure identical byte representation for the
same data structures, making it particularly useful for cryptographic
operations like hashing. </aside>

Here’s an example of the identity document for the [heartwood][heartwood] repository:

```json
{
  "delegates": ["did:key:z6MknSLrJoTcukLrE435hVNQT4JUhbvWLX4kUzqkEStBU8Vi"],
  "threshold": 1,
  "payload": {
    "xyz.radicle.project": {
      "name": "heartwood",
      "description": "Radicle Heartwood Protocol & Stack",
      "defaultBranch": "master"
    }
  }
}
```

### Private Repositories

Radicle supports **private repositories** where access is restricted to a designated group of trusted peers. This is achieved by setting the `visibility` attribute in the identity document. For example, the following snippet sets the visibility to _private_, while also allowing a specific peer to have access to the repository.

```json
{
  ...
  "visibility": {
    "type": "private",
    "allow": ["did:key:z6Mkt67GdsW7715MEfRuP4pSZxJRJh6kj6Y48WRqVv4N1tRk"]
  }
}
```

This ensures only nodes in the privacy set can replicate and access the data, maintaining confidentiality. While the data is not encrypted at rest, these repositories rely on selective replication through the _allow list_ for privacy, which renders them invisible and inaccessible to other nodes in the Radicle network.

Note that repository delegates _always_ have access to their private repositories.

### Repository Identifier (RID)

To ensure uniqueness and easy identification of repositories, a stable and globally unique identifier, known as the Repository Identifier (RID), is assigned to each repository. The RID is deterministically derived from the initial version of the repository’s identity document. This process involves using Git’s `hash-object` function to produce a 160-bit SHA-1 digest of the document. This is then encoded using [multibase][mb] encoding with the `base-58-btc` alphabet, and prefixed with `rad:`, making it a valid [URN][urn]:

<figure>
  <pre class="center">rad:<span class="highlight">z3gqcJUoA1n9HaHKufZs5FCSGazv5</span></pre>
  <figcaption>Example Repository ID for the heartwood project.</figcaption>
</figure>

Since the RID is derived from the _initial_ version of the repository’s identity document, the document is able to change while the RID remains the same.

[urn]: https://datatracker.ietf.org/doc/html/rfc8141
[mb]: https://w3c-ccg.github.io/multibase/

> **Tip**: Refer to [RIP-2][rip-2] for more details about how repository identity works in the Radicle protocol.

## Local-First Storage

Storage is designed in such a way that it’s easy to transfer data between peers over the network using an unmodified Git protocol. Radicle repositories are simply Git repositories stored in a special location on disk. Peer data is stored within the same repository using Git [namespaces][gns], where Node IDs are used as the namespace. This allows storage to be managed through a partitioned approach where each user maintains their own _namespace_ of a repository, as well as namespaces of other users they have an interest in, all within the same Git repository. These copies are then shared among users across the network.

We can view a peer’s namespace as their “soft-fork” of the repository. It is their own space for making changes to the repository without affecting other namespaces. The peer is the _sole owner and writer_ of this namespace, identified, and verified, by their Node ID.

### Working vs. Stored Copy

Storage is accessed directly by the node to report its inventory to other nodes, and by the end user through either specialized tooling or the `git` command line tool. Users are typically interacting with two repository copies: the _working copy_, and a remote _stored copy_ that is interacted with via `git push` and `git fetch`, using Radicle’s [git-remote-helper][grh].

This workflow is akin to what most developers are used to, when synchronizing changes between their working copy, and the `origin` remote, which is typically a repository on a hosted Git forge.

Changes to the stored copy are automatically propagated to the network when the user is connected to the internet, but can also be made while offline. This local-first design not only enhances the user experience by making offline work frictionless, but also eliminates the need for centralized servers.

<figure class="diagram">
  <img src="/marketing/images/guides/working-vs-stored.svg" alt="Synchronizing the working copy with the stored copy of a repository" />
  <figcaption>Synchronizing the working copy with the stored copy of a repository.</figcaption>
</figure>

### Storage Layout

Radicle’s storage layout is designed to support multiple repositories and multiple peers per repository. Each repository is a _bare_ Git repository, stored under a common base directory, identified uniquely with its Repository ID or RID. Instead of each of the repository’s peers storing data in a separate Git repository with a separate [object database][git-odb] (ODB), peer data is stored within the same Git repository using Git [namespaces][gns].

<aside> A <em>bare</em> Git repository is a repository stripped of its working
directory, containing only the version history (the contents of the
<code>.git</code> directory). It’s used primarily as a remote repository that
developers can push to and pull from, but cannot directly edit files or commit
changes in. </aside>

For each peer, including the local peer, their unique Node ID (NID) is used as the namespace. Thus, each peer has its own namespaced references (eg. `refs/heads`, and `refs/tags`), while sharing the underlying objects (i.e. commits and blobs) with other namespaces via a shared object database. This design ensures only one copy of each object is stored across all repository namespaces.

Since the underlying storage uses Git, the storage layout below is represented as a file tree on the file-system, with `<storage>` representing the storage root, or top-level directory under which all repositories are stored on a user’s device. For every repository, each peer associated with that repository must have a separate, logical Git source tree -- which contains all the usual reference categories. This _logical repository_ is also known as the repository _namespace_ or _view_, and allows nodes to maintain local data for all peers in the same physical repository.

```
<storage>                     # Storage root containing all repositories
├─ <rid>                      # Storage for first repository
│  └─ refs                    # All Git references locally stored
│     └─ namespaces           # All peer source trees or "namespaces"
│        ├─ <nid>             # First node's source tree
│        │  └─ refs           # First node's Git references
│        │     ├─ heads       # First node's branches
│        │     │   └─ master  # First node's master branch
│        │     └─ tags        # First node's tags
│        │
│        └─ <nid>             # Second node's source tree
│           ├─ refs           # Second node's references
│           └─ ...
├─ <rid>                      # Storage for second repository
│   ...
└─ <rid>                      # etc.
    ...
```

Though this storage tree is browsable by the user with standard file system commands, it is not meant to be interacted with directly by users, for risk of corrupting the data. Additionally, Git is free to pack the objects, which means they may not always appear as individual files.

> **Tip**: Refer to [RIP-3][rip-3] to learn more about storage in the Radicle protocol.

### Git URL Scheme

The Radicle protocol uses its own URL scheme to point to specific repository namespaces in the network. This allows the Git `fetch` and `push` commands to operate on the correct namespace when fetching or pushing code.

<figure>
  <pre class="center">rad://<span class="highlight">z42hL2jL4XNk6K8oHQaSWfMgCL7ji</span>/<span class="highlight-secondary">z6MknSLrJoTcukLrE435hVNQT4JUhbvWLX4kUzqkEStBU8Vi</span></pre>
  <figcaption> Example URL for repository <code>z42hL2jL4XNk6K8oHQaSWfMgCL7ji</code> and
  peer <code>z6MknSLrJoTcukLrE435hVNQT4JUhbvWLX4kUzqkEStBU8Vi</code>. </figcaption>
</figure>

The Radicle [remote helper][grh] is what allows Git to interpret URLs with the `rad://` scheme. By using this scheme, the user instructs Git to invoke the `git-remote-rad` executable during `git push` or `git fetch`, which allows the user to interact with the network through the storage layer.

For example, the above URL would map a push to the `master` branch to the following path under the local storage root:

```
/<rid>/refs/namespaces/<nid>/refs/heads/master
```

If a Node ID is not specified in the URL, Git will interact with the repository’s canonical references, also know as the authoritative repository state. This is the state agreed on by the repository [delegates](#delegates).

<figure>
  <pre class="center">rad://<span class="highlight">z42hL2jL4XNk6K8oHQaSWfMgCL7ji</span></pre>
  <figcaption> Example URL for repository
  <code>z42hL2jL4XNk6K8oHQaSWfMgCL7ji</code>’s canonical
  references.</figcaption>
</figure>

## Trust through Self-Certification

Unlike centralized forges such as GitHub, where repositories are deemed authentic based on their location (e.g. `https://github.com/bitcoin/bitcoin`), in a decentralized network like Radicle, location is not enough. Instead, we need a way to automatically verify the data we get from _any given location_. This is because peers in a decentralized network may be dishonest. Radicle’s approach hinges on the self-certifying nature of its repositories, anchored in the repository [identity document](#identity-document).

### Canonical Branches

When repositories are hosted in a known, trusted location, updating the repository’s canonical branch (eg. `master`) is simply a matter of pushing to that repository’s branch. Permission to push is granted to a small set of maintainers, and any one maintainer is allowed to update the branch.

In Radicle, lacking a central location where repositories are hosted, the canonical branch is established _dynamically_ based on the signature **threshold** defined in the repository’s identity document. For example, if a threshold of two out of three delegates is set, with the default branch set to `master`, and two delegates have pushed the same commit to their `master` branches, that commit is recognized as the authoritative, canonical state of the repository.

> **Note**: Currently, only the branch specified under the `defaultBranch` attribute of the identity document is set automatically based on a signature threshold. In the future, additional branches may be supported.

### Self-certifying Repositories

Together, a repository’s RID and its identity document create a cryptographic proof that serves as the basis for verifying all repository states leading up to its current state. For this reason, we say that Radicle repositories are _self-certifying_: the process of verification doesn’t require any inputs other than the repository itself.

For repositories to be self-certifying, delegates authenticate every change to the repository data and metadata via cryptographic signatures. This includes all Git references published to the network.

#### Signed Refs

To enable the verification of Git references beyond commits to the source code, Radicle automatically signs the entirety of a node’s references every time they change. This signature is then placed in a Git blob under a special branch referenced under `refs/rad/sigrefs`, along with the references that were signed.

<figure>
  <pre>9767b485c2aad1e23097d2b5165287ba84cfa452 refs/heads/master
f3eaa7454e3a4714885905ae99f616fc7895b5fa refs/cobs/xyz.radicle.patch/fe31d5b6049583a42c21a543545d182b893aa4a0
0590b78ee42b39087983e4de04164065e5aa11bc refs/cobs/xyz.radicle.patch/ffbb812ad6e7fe1c5c610b1246ca5ca9d7d16027</pre>
  <figcaption>Example <code>refs</code> blob under a user’s <code>refs/rad/sigrefs</code> branch.
  </figcaption>
</figure>

<aside> The signed references are in the same format as the <code>git
show-ref</code> command. </aside>

Signed refs are key to establishing a repository’s canonical state and are updated whenever there are changes to a repository.

Given an RID and a Radicle repository clone, anyone can retrieve the initial identity document and authenticate all subsequent repository updates without a trusted third party. This verification model draws inspiration from [The Update Framework][tuf] (TUF), a framework designed to secure software update systems.

## Collaborative Objects

In the Radicle protocol, Collaborative Objects (COBs) play an important role in supplementing Git with social artifacts such as issues, code reviews and discussions, which are not inherently supported by Git. Typically, these artifacts are only found on centralized platforms like GitHub or GitLab, or their self-hosted counterparts.

In Radicle, COBs allow for social artifacts to be stored directly inside a repository, and replicated between peers. This means that social artifacts inherit the same properties as source code: they are local-first, user-owned, and cryptographically signed.

Radicle includes three predefined collaborative object types to support code collaboration: _Issues_, _Patches_, and _Identities_, but users have full control to customize them or extend Radicle with entirely new COB types.

- **Issues** (`xyz.radicle.issue`) are used for tracking bugs or feature requests, and support discussions, labeling and assigning.
- **Patches** (`xyz.radicle.patch`) are used to propose changes to a branch, and support reviews, versioning of changes and discussions.
- **Identities** (`xyz.radicle.id`) are used to represent identity documents.

<aside> The repository’s identity document is entirely defined and managed
through an <em>id</em> COB. </aside>

COBs are identified by a unique type name in [reverse domain name notation][reverse-dns] and a unique Object ID.

### Concurrency & Consistency

In a system with no central server, operation concurrency is the norm. If two users comment on an issue at the same time, those comments will reach peers in the network at different times and in different orders. To maintain a good user experience, it’s important that these factors don’t determine the issue’s final state. All users must eventually converge to the same exact state and see the same thing.

To achieve this, Radicle makes use of Git’s native synchronization primitives, and encodes COBs as a set of commits in a [directed acyclic graph][dag] (DAG). The identity document is represented by one such commit graph that is disjoint from any other COB or source code branch. Issues are represented as a graph that points to the identity document graph – allowing for inspection of the document at evaluation. Patches are a graph that combines pointing to both the identity document and source code commits. This combination allows for checking if the patch is merged, for example.

This representation gives Radicle a few things for free:

1. Data integrity is guaranteed by Git.
2. Synchronization is handled by Git.
3. Causal dependencies can be modeled as commit parent-child relationships.

It may be useful to think of Radicle’s usage of Git commit histories as a form of [conflict-free replicated data type][crdt] (CRDT). When the histories of two peers are synchronized, the commit graphs are simply _unioned_ with each other in a non-destructive, idempotent way.

<aside> <strong>Idempotence</strong> is the property of certain operations in
mathematics and computer science whereby they can be applied multiple times
without changing the result. </aside>

<figure class="diagram">
  <img src="/marketing/images/guides/cob-dag.svg" alt="Git DAG representing an Issue COB" />
</figure>

Then, to materialize the state that is displayed to the user, this new graph is _reduced_ in [topological order][topo], starting from the root of the graph and going up to the tips. This ordering happens to be [causally consistent][causality], ensuring that changes that have observed other changes are traversed in causal order. Since topological ordering may yield _partial_ orders in the face of concurrency, a merge function is also defined, the simplest of which is to traverse the partially-ordered graph vertices sorted by their commit hash. If a merge function cannot be defined, a COB may be configured to treat this as a _conflict_ which can be bubbled up to the user.

<aside> A <em>reduce</em> or <em>fold</em> operation is a way of getting a
single value by applying a function to a list of values. </aside>

In summary, this mechanism supports multiple users independently interacting without coordination. Each COB records the initial version of an object and tracks all subsequent modifications made across the network. Each modification is stored as a separate Git _commit_ object to ensure that the CRDT change graph is compatible with Git’s fetch protocol. To retrieve the current state of an object, the system replays all the changes to the object in a deterministic and causally-consistent order.

### Extending COBs

Radicle’s predefined COB types are stored under the `refs/cobs` hierarchy. These are associated with unique namespaces, such as `xyz.radicle.issue` and `xyz.radicle.patch`, to prevent naming collisions.

This hierarchical arrangement under `refs/cobs` not only houses Radicle’s predefined COBs but also accommodates user-defined ones. For example, if a user or organization were to define a new COB type under their domain, it might look something like `com.acme.task`, for some hypothetical “task” COB under the `acme.com` domain.

This extensibility allows for an unlimited set of new collaboration primitives to be defined by users, without requiring coordination with the broader network or user-base.

## Conclusion

The Radicle Heartwood protocol introduces a new approach to code collaboration and hosting rooted in sovereignty. Built upon Git’s well-established protocol, Radicle can easily interoperate with existing systems and workflows that are already familiar. Users have full control and ownership over their identity and data. Repositories are self-certifying data structures, meaning updates are cryptographically signed and can be verified by anyone, without needing a trusted third party. Every user in Radicle is self-hosting while remaining connected to a wider network. Radicle is highly extensible with its Collaborative Objects that enable full control and customization over workflows and datatypes, while also opening the possibility for Radicle to support a wider range of functionalities, potentially extending far beyond code collaboration.

<!-- References -->

[gitea]: https://about.gitea.com/
[forgejo]: https://forgejo.org/
[git]: https://git-scm.com/
[gns]: https://git-scm.com/docs/gitnamespaces
[grh]: https://git-scm.com/docs/gitremote-helpers
[git-pack]: https://git-scm.com/docs/pack-protocol
[git-odb]: https://git-scm.com/book/en/v2/Git-Internals-Git-Objects
[git-v2]: https://git-scm.com/docs/protocol-v2
[tor]: https://torproject.org/
[ed25519]: https://ed25519.cr.yp.to/
[reverse-dns]: https://en.wikipedia.org/wiki/Reverse_domain_name_notation
[tuf]: https://theupdateframework.github.io/specification/latest/
[noise]: http://www.noiseprotocol.org/noise.html
[noise-xk]: https://noiseexplorer.com/patterns/XK/
[ssb]: https://en.wikipedia.org/wiki/Secure_Scuttlebutt
[ln]: https://en.wikipedia.org/wiki/Lightning_Network
[gossip]: https://en.wikipedia.org/wiki/Gossip_protocol
[causality]: https://en.wikipedia.org/wiki/Causal_consistency
[dag]: https://en.wikipedia.org/wiki/Directed_acyclic_graph
[topo]: https://en.wikipedia.org/wiki/Topological_sorting
[rip-1]: https://radicle.network/nodes/seed.radicle.xyz/rad:z3trNYnLWS11cJWC6BbxDs5niGo82/tree/0001-heartwood.md
[rip-2]: https://radicle.network/nodes/seed.radicle.xyz/rad:z3trNYnLWS11cJWC6BbxDs5niGo82/tree/0002-identity.md
[rip-3]: https://radicle.network/nodes/seed.radicle.xyz/rad:z3trNYnLWS11cJWC6BbxDs5niGo82/tree/0003-storage-layout.md
[nat]: https://en.wikipedia.org/wiki/Network_address_translation
[framing]: https://en.wikipedia.org/wiki/Frame_(networking)
[fs]: https://en.wikipedia.org/wiki/Forward_secrecy
[ecdh]: https://en.wikipedia.org/wiki/Diffie%E2%80%93Hellman_key_exchange
[rips]: https://radicle.network/nodes/seed.radicle.xyz/rad:z3trNYnLWS11cJWC6BbxDs5niGo82
[heartwood]: https://radicle.network/nodes/seed.radicle.xyz/rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5
[did]: https://www.w3.org/TR/did-core/
[seed]: /guides/seeder
[peer-to-peer]: https://en.wikipedia.org/wiki/Peer-to-peer
[forges]: https://en.wikipedia.org/wiki/Forge_(software)
[local-first]: https://www.inkandswitch.com/local-first/
[signing]: https://en.wikipedia.org/wiki/Digital_signature
[pkc]: https://en.wikipedia.org/wiki/Public-key_cryptography
[crdt]: https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type

<style>
  :global(.markdown-content figure) {
    margin: 1.5rem 0;
  }

  :global(.markdown-content figcaption) {
    font-size: 0.85em;
    color: var(--color-text-muted, #666);
    margin-top: 0.5rem;
  }

  :global(.markdown-content .center) {
    text-align: center;
  }

  :global(.markdown-content .highlight) {
    color: var(--color-primary, #4ade80) !important;
  }

  :global(.markdown-content .highlight-secondary) {
    color: var(--color-secondary, #60a5fa) !important;
  }
</style>
