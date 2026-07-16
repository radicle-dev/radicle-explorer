---
title: Radicle User Guide
subtitle: A fantastic journey through the Radicle universe
---

<script>
  import Meta from '@app/marketing/Meta.svelte';
</script>

<svelte:head>

  <title>User Guide | Radicle</title>
</svelte:head>

<Meta title="User Guide | Radicle" description="Create an identity, open patches, manage issues, and collaborate from the CLI." canonical="https://radicle.dev/guides/user" />

# Radicle user guide

Software is _the_ fundamental way in which we interface with data that comprises our current reality, and code is the language of software. Most software systems were created through a collaborative process involving multiple people. If we accept that software is important and collaborative by nature, then a shared system for communicating about code and collaborating is needed. This system shouldn’t be owned by one company, as code is too important to be monopolized.

<aside class="span-2">
  <p> Microsoft acquired GitHub in 2018. They also own 49% of OpenAI. One of
  our prophets of the future, the author Philip K. Dick, has shown us many
  projections of alternate dystopian realities that emerge when corporations
  amass too much power. </p>
  <p> While some may question the reliability of his visions as
  he was often fueled by substances that would make even psychonauts raise an
  eyebrow, consider this: the Oracle at Delphi’s officiant claimed to glimpse
  through the veil by inhaling naturally occurring gasses emerging from the
  ground. </p>
</aside>

Furthermore, our world is increasingly polarized, and this reality is finding its way into software companies and therefore into software products. Users are banned from using a platform because of their geographic location or the ideas they stand for. This is not tenable.

This is why we’ve created Radicle, an open protocol that enables users like you to collaborate on your code within a sovereign network. It’s a neutral environment where you have full ownership of your data and you have the autonomy to set the rules of your code universe as you see fit. You can work on software projects (and ultimately more) even when offline, while also being connected to a broader network, through which you’ll eventually be able to find contributors.

We’ve created this Radicle Guide to initiate you as a settler of our network through teaching you how to use the software we’ve developed—the Radicle CLI, which is both a node and command line interface tool for interacting with the protocol. This guide is split into multiple chapters and we recommend starting with the first chapter for a higher level introduction that takes you on a tour through Radicle’s core functions. Subsequent chapters will provide deeper dives into specific use cases, but they are still in progress.

> 👾
>
> Greetings, I’m your guide! Whenever you see 👾, it’s because I’ve got some spicy tips on how to use Radicle. You’ll also see 🥷 for privacy tips, 👻 for things you should be wary of, and 🧠 for opportunities to learn more.
>
> If you ever get stuck and want additional guidance, join us in our [chatroom][zulip] on Zulip and ask your questions in the `#support` channel.
>
> Also, this guide teaches you how to use Radicle in a narrative fashion. If you’re looking for more straightforward usage docs, check out the Radicle manual or the [Protocol Guide][proto] for more information on Radicle’s fundamental building blocks and motivations.

<aside> The Radicle manual can be accessed by entering <code>man
rad</code> from your command line, after installing Radicle. </aside>

## 1. Getting started

One of the important facts to understand about Radicle is that it is a peer-to-peer protocol, which is uncommon when it comes to software you typically rely on. Most collaboration technologies are hinged upon a client-server model, where you’re entrusting your data and social interactions to a single entity that is managing a bunch of servers or data centers. This paradigm is transformed in a peer-to-peer protocol, where every user of the protocol is a _peer_, participating equally. Peers on the Radicle network are also referred to as **nodes**, and it doesn’t matter what you are doing -- whether you’re publishing repositories or discussing issues -- you have to run a node.

Within a few paragraphs, you’ll be operating a Radicle Node via the command line by installing the Radicle software stack. It’s a pretty easy process that can be completed in under 5 minutes, but there are a few requirements that are important to run through before you proceed:

1. You need a <strong>Linux</strong> or <strong>Unix</strong> based operating system like macOS or Ubuntu and a basic understanding of how to use your terminal.
2. Radicle is built on top of <strong>Git</strong>, so a recent version of Git (2.34.0 or later) is recommended. We also assume you have _some_ experience using Git.
3. OpenSSH (version 9.1 or later) with <strong>ssh-agent</strong> has to also be installed and running. This is a helper program that is used to secure the secret key related to your Radicle identity.

<aside> What is <strong>Git</strong>, you wonder? <a
href="https://en.wikipedia.org/wiki/Git">Git</a> is a distributed version
control system that manages and tracks changes in computer files, predominantly
used for source code and collaborative programming. </aside>

> 👾
>
> You can check your Git and SSH installations by running `git --version` or `ssh -V` in your terminal.
>
> If you haven’t used Git before, you’re going to be in a world of pain and should read through the [Pro Git][pro-git] book first.

[pro-git]: https://git-scm.com/book/en/v2

### Installation

The easiest way to install Radicle is by firing up your terminal and running the following command:

```
$ curl -sSLf https://radicle.dev/install | sh
```

This command runs an installer script that automates the setup process, by:

- Identifying your OS, and installing Radicle binaries suitable for your system, including `rad`, `git-remote-rad`, `radicle-node`, and `radicle-httpd`, all placed in `~/.radicle/bin` by default. This is a non-standard location, so the script also updates your `PATH` variable to include the path to these binaries.
- Installing `man` pages into `~/.radicle/man`, which enables you to access the Radicle CLI user manual through `man rad` or `rad help`.

> 👾
>
> If you want the above to be installed in a different location than `~/.radicle`, you can pass `--prefix` to the installation script, eg. `--prefix=/usr/local`.
>
> Note that if you don’t want to use the installer script, you can also always compile from the [source code][heartwood] or get the [binaries] if you prefer.

[heartwood]: https://radicle.network/nodes/seed.radicle.xyz/rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5
[binaries]: /download

Once you’ve installed Radicle, you can make sure that it was successful by running:

```
$ rad --version
```

### Come into being from the _elliptic aether_

When using Radicle for the first time, you have to create a new Radicle identity, which is simply a cryptographic key pair, using the `rad-auth` command. The public key is what uniquely identifies you across the network, while the private key is used to authenticate your node, as well as sign code and other artifacts you publish on the network.

<aside class="span-5">
  <p> A <strong>cryptographic key pair</strong> is a set of two keys used in
  cryptography, typically for securing digital communication and data.</p>

  <p> The pair consists of a public key and a private (or secret) key. The
  public key can be shared with others and is used to encrypt data or verify
  digital signatures created with the corresponding private key. Conversely,
  the private key is kept secret by the owner and is used to decrypt data
  encrypted with the public key or to create digital signatures. </p>

  <p> The use of these keys ensures authenticity, as digital signatures can
  confirm that a message or data was indeed sent by the owner of the private
  key. </p>
</aside>

```
$ rad auth
```

That’s how you’ll cryptographically forge your new Radicle identity.

Follow the instructions by entering an **alias**, a non-unique name that makes it easier to identify your node, in addition to a **passphrase** to protect your key pair. Note that your alias can always be changed at a later time.

```
$ rad auth

Initializing your radicle 👾 identity

✓ Enter your alias: paxel
✓ Enter a passphrase: ********
✓ Creating your Ed25519 keypair...
✓ Adding your radicle key to ssh-agent...
✓ Your Radicle DID is did:key:z6Mkhp7VUnuufpvuQ3PdysShAjL86VDRUpPpkesqiysDBGs9. This identifies your device. Run `rad self` to show it at all times.
✓ You're all set.
...
```

When you’ve completed the steps, your new Radicle DID (Decentralized Identifier) will be generated and displayed. If `ssh-agent` is running, your private key will also be added to it for future use. While similar to your Node ID (NID), the Radicle DID is formatted as a [Decentralized Identifier][did], whereas the NID is simply the encoded public key. The Radicle DID is your own [self-sovereign][ssi] identity. Share it freely with collaborators!

<aside class="span-4">
  <p><strong>DIDs</strong> are a new identifier standard established by the W3C
  that are used for interoperability across various systems and provide
  flexibility for incorporating different types of identifiers in the
  future.</p>

  <p><strong>Ed25519</strong> is a public-key signature system that uses a
  variant of the Schnorr signature based on Twisted Edwards curves. It’s known
  for its speed, security, and efficiency, and is used in applications like SSH
  authentication, TLS encryption, and software package verification.</p>
</aside>

[ssi]: https://en.wikipedia.org/wiki/Self-sovereign_identity

<aside class="span-4 kicker">
  <p> <code>ssh-agent</code> is a helper program that manages your SSH keys
  and passphrases, encrypting the keys with your passphrase for secure
  storage.</p>

  <p>Once the keys are loaded into the agent, it can use them to authenticate
  your access to Radicle and sign data, eliminating the need to re-enter your
  passphrase.</p> <p>Use <code>ssh-add -l</code> to view the keys the agent
  currently holds. For further details, visit the
  <a href="https://www.ssh.com/academy/ssh/agent">website</a>. </p>
</aside>

If you run `rad auth` again you can verify that your key was added to `ssh-agent`.

```
$ rad auth
✓ Radicle key already in ssh-agent
```

> 👻
>
> If you plan on using multiple devices, it is very important that you do not try to share your Radicle identity across those devices.
>
> At the moment, each device is required to be identified by its own DID, meaning you have to go through the `rad auth` process on each device you plan on using.
>
> We understand the desire and need to link devices to make collaboration smoother. We are in the process of designing and implementing this functionality.

If you forget your DID, you can query your full identity by running `rad self` or alternatively you can grab your DID with `rad self --did`. If you need your NID, you can query for it with `rad node status --only nid`.

```
$ rad self
Alias           paxel
DID             did:key:z6Mkhp7VUnuufpvuQ3PdysShAjL86VDRUpPpkesqiysDBGs9
└╴Node ID (NID) z6Mkhp7VUnuufpvuQ3PdysShAjL86VDRUpPpkesqiysDBGs9
SSH             running (3817)
├╴Key (hash)    SHA256:YCmRe6BkDOp45lYg0m5DeYxgRcPKftQZb4RmQD1nkjQ
└╴Key (full)    ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIO9xo9DHlsZJeZWnZaaawsnKFjcQxN4LQ…
Home            /home/paxel/.radicle
├╴Config        /home/paxel/.radicle/config.json
├╴Storage       /home/paxel/.radicle/storage
├╴Keys          /home/paxel/.radicle/keys
└╴Node          /home/paxel/.radicle/node
```

This displays your alias, DID, SSH agent status, SSH keys, and the locations of important files or directories.

```
$ rad self --did
did:key:z6Mkhp7VUnuufpvuQ3PdysShAjL86VDRUpPpkesqiysDBGs9
```

For focusing on your DID.

```
$ rad node status --only nid
z6Mkhp7VUnuufpvuQ3PdysShAjL86VDRUpPpkesqiysDBGs9
```

For getting the NID of the current, running node.

> 👾
>
> Many of the other items you see in the `rad self` output can be viewed individually. Wondering about your alias? A quick `rad self --alias` has you covered. Need to pinpoint your Radicle home folder? `rad self --home` is your friend. And for your config file location, just hit up `rad self --config`.
>
> If you’re ever feeling lost, `rad self --help` will lay out all your options.

### Operate nodes, smoothly

Now that your node has an identity (or ’public key’), you have what it takes to connect to the Radicle Network. That’s right -- we don’t need your email address or any other personal identifying information. Your alias can be your cat’s name for all we care.

The first command to embed deep within your consciousness is the one for checking your node’s status:

```
$ rad node status
```

If the node is not running, you can start it as a background daemon with:

```
$ rad node start
```

After your node starts, it will attempt to connect to peers on the network.

But let’s take a step back and ponder some fundamental questions: _What exactly happens when these nodes interact? And how does Git fit into this picture?_

At its core, Radicle marries Git with peer-to-peer networking. Your node isn’t just another cog in the machine; it’s a conduit for collaboration. It’s there _to host and synchronize repositories you’re interested in_.

Radicle’s peer-to-peer architecture draws inspiration from [Secure Scuttlebutt’s][ssb] gossip protocol where data transmission relies on a publish/subscribe system, allowing peers to host and sync only the data they care about. Similar to [BitTorrent][bt], we use the terminology “seeding” to describe distributing and sharing a repository across the network.

With Radicle’s gossip protocol, peers exchange messages about the network that facilitate the discovery and replication of repositories. The replication process kicks off when a node establishes a secure connection with another node, the initiating node conducts a _fetch_ operation via the Git protocol to pull the pertinent objects into the node’s storage, thereby availing them to the local user and other interested nodes.

<aside> <strong>Replication</strong> is the process of creating multiple copies
<em>(replicas)</em> of data across a network of peers to ensure redundancy,
improve reliability and enhance access speed. </aside>

> If you’re curious about how Radicle works under the hood, read our [Protocol Guide][proto].

### Git going with repositories

Now, time to return to your terminal. The next thing we’ll do is publish a repository to the Radicle network. Once we’ve done this, anyone with a node will be able to fetch and seed your repository, increasing its replica count on the network.

<aside class="span-3"> We built Radicle on good old Git, the go-to for version control
because, well, it is widely used and works extremely well. For a zeptosecond,
we considered inventing a new system but heard a strong shout in our brains
that said something like “YOU’D BE SO STUPID TO REINVENT VERSION CONTROL RIGHT
NOW”. </aside>

Pick a repository you maintain and navigate to a local copy. It can be any Git repository, but it should have at least one commit.

```
$ pwd
/home/paxel/src/dark-star

$ git status
On branch master
Your branch is up to date with 'origin/master'.
nothing to commit, working tree clean
```

To publish it to the Radicle network, run the `rad init` command.

```
$ rad init

Initializing radicle 👾 project in .

✓ Name: dark-star
✓ Description: Decoding data from the dark star to establish a model of the universe
✓ Default branch: main
✓ Visibility: public
✓ Project dark-star created.

Your project's Repository ID (RID) is rad:z31hE1wco9132nedN3mm5qJjyotna.
You can show it any time by running `rad .` from this directory.

✓ Project successfully announced to the network.

Your project has been announced to the network and is now discoverable by peers.
You can check for any nodes that have replicated your project by running `rad sync status`.

To push changes, run `git push`.
```

Don’t be afraid to do this on one of your existing public repositories! Because even if you aren’t ready to use Radicle for code collaboration, it works great for distribution. Radicle’s network of seed nodes help propagate and host code, forming a decentralized, censorship resistant, and ungovernable distribution system.

What `rad init` does is gather the essential details from you which are needed to initialize the repository into Radicle: the repository name, description, default branch (typically `main` or `master`), and whether it is public or private.

Similar to how `git init` is used to initialize a Git repository, we use nomenclature you’re familiar with so you don’t go crazy. That’d be so cruel if you had to do `rad new`, instead, wouldn’t it?

> 👻
>
> It’s important to only publish repositories you own or are a maintainer of, and to communicate with the other maintainers so that they don’t initialize redundant repository identities.

After entering your repository details, you’re presented with a Repository Identifier (RID) that is a globally unique URN that you can share with your collaborators or friends so that they can clone or seed your repository. Besides generating the RID, `rad init` creates a special Git remote in your working copy named `rad` and publishes the repository to the network (assuming it’s public). We’ll talk more about private repositories in another chapter.

<aside class="span-2">
  <p>A <strong>Uniform Resource Name</strong> (URN) is a type of Uniform
  Resource Identifier (URI) that is used to uniquely identify resources without
  specifying the location or means to access them. Unlike URLs, which provide
  information on where a resource can be found on the Internet (their
  location), URNs serve as persistent, location-independent resource
  identifiers.</p>
</aside>

<aside class="kicker">
In Radicle, a <strong>delegate</strong> refers to a role or entity that has
been granted the authority to sign for and manage a repository and its metadata.
</aside>

When you initialize a repository you are the sole maintainer or _delegate_, the term used in Radicle. Delegates can represent a group, person or even a bot. In your case, I’m assuming you’re a person. Delegates can be added or removed from a repository, by existing delegates. We’ll talk about this more in one of the next chapters.

> 👾
>
> A few spicy commands you might want to know about, that can be run within a repository you’ve initialized:
>
> - It’s difficult to memorize RIDs. Use `rad .` to display the current repository’s RID.
> - To display the repository’s identity payload, which contains its name, description and default branch, run `rad inspect --payload`.
> - To be able to push changes to a repository from all of your devices, simply add each device’s DID as a repository delegate, using `rad id update`.
> - For more details on managing the repository’s identity, including adding delegates, or making updates to its name, description, and visibility, refer to `rad id --help`.
>
> By the way since your Radicle key is a valid SSH key, it can be used to sign Git commits since version Git `2.34.0`. This is an alternative to the more common GPG signing method. If you’d like to setup your repository to use your Radicle key for signing commits, enter these commands from its working directory:
>
> ```
> git config user.signingKey "$(rad self --ssh-key)"
> git config gpg.format ssh
> git config gpg.ssh.program ssh-keygen
> git config gpg.ssh.allowedSignersFile .gitsigners
> git config commit.gpgsign true
> ```
>
> You can also set this up globally by passing the `--global` option to `git config`.
>
> Commit signing is a purely optional step; Radicle internally signs everything you publish anyway, so don’t worry if you don’t set this up!

Note that your new repository will only be replicated by nodes that you are connected to and either have an open seeding policy, or follow you. Seeding involves both hosting the repository and synchronizing changes with other nodes. In the early stages of the Radicle network, all public repositories are automatically seeded by `iris.radicle.network` and `rosa.radicle.network` which are _public seed nodes_ run by the core team.

<aside class="span-2"> <strong>Seed nodes</strong> are always-on machines that
significantly enhance the network’s capacity to provide continuous access to
repositories. They can vary in their seeding policies, from public seed nodes
like <code>iris.radicle.network</code> and <code>rosa.radicle.network</code> that
openly seed all repositories, to community seed nodes that selectively seed
repositories based on rules established by their operators. </aside>

You don’t _have_ to trust or rely on our public seed node. You can run your own. As more people run them, Radicle becomes more resilient and reliable for code collaboration.

> We are always looking to attract more people that want to operate public seed nodes: if that’s you, check out our [Seeder’s Guide][seeder] for more details.

### Publishing _ch-ch-ch-ch-changes_

<div class="poem"> Still don’t know what I was waiting for<br/> Requiring an
internet connection to push to remote<br/> But now I push to my local-first, oh so
`rad` remote<br/> Instead of that one shoddy monopolized forge </div>

As we just mentioned, `rad init` creates a special remote in your working copy named `rad`. What’s this doing under the hood? With Radicle, you will typically be interacting with two different repository copies on your device, the _working copy_ and a hidden, _stored copy_ that you interact with via `git push rad` and `git pull rad` commands using Radicle’s _git remote helper_ program named `git-remote-rad`. Remote helpers are particularly useful for integrating Git with specialized network protocols like Radicle. Git calls the custom `git-remote-rad` program when it encounters `rad://` remotes.

> 🧠
>
> Git remote helpers are custom programs that allow Git to interact with repositories hosted on various types of servers or protocols that are not natively supported. Remote helpers are invoked by Git when it encounters a URL scheme that matches a supported helper. For example, in Radicle’s use case, if Git sees a URL starting with `rad://`, it will look for a remote helper program named `git-remote-rad` and use this program to handle operations related to that URL, such as fetching, pushing, and cloning. For more details, check out Git’s [documentation](https://git-scm.com/docs/gitremote-helpers) on remote helpers.

To view information about the `rad` remote in your repository, try:

```
$ git remote show rad
* remote rad
  Fetch URL: rad://z31hE1wco9132nedN3mm5qJjyotna
  Push  URL: rad://z31hE1wco9132nedN3mm5qJjyotna/z6MkvZwzK64f3GuDcAs6dEcje89ddfHkBjS1v9Dkh7aCGq3C
  HEAD branch: (unknown)
  Remote branch:
    main tracked
  Local branch configured for 'git pull':
    main merges with remote main
  Local ref configured for 'git push':
    main pushes to main (up to date)
```

You’ll notice the Repository ID in a URL format under `Fetch URL`:

```
rad://z31hE1wco9132nedN3mm5qJjyotna
```

For the `Push URL`, you may be wondering, what is the element after the slash?

```
z6MkvZwzK64f3GuDcAs6dEcje89ddfHkBjS1v9Dkh7aCGq3C
```

Does it look familiar to you? Well, it’s your Node ID. Remember you can always check your Node ID by running `rad node status --only nid`.

When using Git with traditional forges, you are pushing to a remote which is a centralized server that all other collaborators are also using. In Radicle, the remote is on your local device, which means that you can push changes even when you’re disconnected from the internet. Changes that you push to the remote while offline will automatically propagate to the network once you come back online. This is one of the very unique aspects of Radicle that makes offline work _way smoother_.

<aside>
 When using GitHub, for example, you will be pushing to a remote URL that
 starts with <code>https://github.com/</code>, followed by an account and
 repository name. On Radicle, the URL you push to does not represent a specific
 host, it represents a de-centralized repository, identified by name only, not
 location.
</aside>

> 🧠
>
> Radicle’s storage layout accommodates multiple source trees _(namespaces)_ per repository. Each repository is stored as a bare Git repository, residing under a common base directory, uniquely identified by its Repository ID (RID). Rather than storing peer data in separate Git repositories with individual object databases (ODBs), Radicle consolidates peer data within the same Git repository. This is achieved using the `gitnamespaces` feature, where each peer’s unique Node ID serves as a namespace to partition their Git references.
>
> See the [storage](/guides/protocol#local-first-storage) section of the protocol guide for more information.

Now let’s try publishing some changes to see how this works.

Use your favorite text editor to make a change to the repository that you just initialized. For example, you can update its README to include instructions on how to clone the repository on Radicle:

```
$ git diff
diff --git a/README.md b/README.md
index 91b304791..70ef6efc9 100644
--- a/README.md
+++ b/README.md
@@ -58,6 +58,12 @@

+## Radicle
+
+To clone this repository on Radicle, simply run:
+
+    rad clone rad:z31hE1wco9132nedN3mm5qJjyotna
+
```

Once you’re finished, add and commit your changes with `git add` and `git commit` just as you would when collaborating on any other Git repository. Then use `git push rad master` to synchronize the changes with your node (be sure to replace `master` with your default branch, in case that’s not it).

```
$ git add README.md
$ git commit -m "Add instruction on cloning with Radicle"
$ git push rad master
✓ Synced with 1 node(s)
To rad://z31hE1wco9132nedN3mm5qJjyotna/z6MkvZwzK64f3GuDcAs6dEcje89ddfHkBjS1v9Dkh7aCGq3C
   ecb1bf0..74fb8d2  master -> master
```

Whenever you execute a `git push rad` command, you are pushing the changes in your local working copy to your `rad` remote, the stored copy managed by your radicle node, so it’s a local operation. You see that the remote of your repository is represented by the URL:

```
rad://z31hE1wco9132nedN3mm5qJjyotna/z6MkvZwzK64f3GuDcAs6dEcje89ddfHkBjS1v9Dkh7aCGq3C
```

As the sole delegate of the repository, changes that you push to the repository’s default branch under the `rad` remote, represent the **canonical** or _authoritative_ state of the repository. This means that if someone were to clone your repository, they would be getting the state that you just pushed, given your nodes are able to communicate with each other.

> 🧠
>
> The canonical repository state is established _dynamically_ based on the delegate thresholds defined for the repository. For example, if a `threshold` of two out of three delegates is set, with the `defaultBranch` specified as `main`, and both Alice and Bob have the same commit in their `main` branches, that specific commit is recognized as the authoritative, current state of the repository. In the current Radicle release, the dynamic establishment of an authoritative state is limited to a single `defaultBranch`. Future releases of the protocol may enhance this feature to include additional secondary branches.

You may be wondering -- now that you’ve pushed to your remote, how do other peers get this update? Any peer who has cloned or seeded the repository will receive a _reference announcement_ message from its peers, via the gossip protocol, which informs the node there was an update. Following this, peers conduct a _fetch_ operation via the Git protocol to pull the pertinent Git objects into their local storage.

### The basics of _seeding_ and _cloning_

Nodes have a _seeding policy_ which specifies the list of repositories they are interested in replicating on the network.

Whenever you clone or initialize a new repository, your node’s seeding policy is updated to keep these repositories in sync with the network.

There are a few ways that seeding relationships are established among nodes. One of the main methods is by one node intentionally _cloning_ another repository. You can run the `rad clone` command to clone a repository from the Radicle network, by supplying a Repository Identifier (RID).

Let’s try this out. First, navigate to a directory where you typically clone Git repositories. Then run this command to clone the Radicle [Heartwood][heartwood] repository:

<aside class="span-2"> Heartwood is the name of the current version of the
Radicle protocol. An alpha version was initially released in April 2023.
</aside>

```
$ rad clone rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5
✓ Seeding policy updated for rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5 with scope 'all'
✓ Fetching rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5 from z6Mkk4R…SBiyXVM..
✓ Fetching rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5 from z6Mksmp…1DN6QSz..
✓ Fetching rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5 from z6MkrLM…ocNYPm7..
✓ Creating checkout in ./heartwood..
✓ Remote cloudhead@z6MksFqXN3Yhqk8pTJdUGLwATkRfQvwZXPqR2qMEhbS9wzpT added
✓ Remote-tracking branch cloudhead@z6MksFqXN3Yhqk8pTJdUGLwATkRfQvwZXPqR2qMEhbS9wzpT/master created for z6MksFq…bS9wzpT
✓ Repository successfully cloned under /home/paxel/src/heartwood/
╭────────────────────────────────────╮
│ heartwood                          │
│ Radicle Heartwood Protocol & Stack │
│ 8 issues · 14 patches              │
╰────────────────────────────────────╯
Run `cd ./heartwood` to go to the project directory.
```

Cloning has some similarities to Git’s `clone` command, in that it creates a working copy of a remote repository, but this is executed in a much different way since Radicle is a peer-to-peer protocol.

The `rad clone` command is essentially equivalent to running these lower-level commands:

| **`rad seed`** | Updates your seeding policy to start seeding this repository | **`rad sync -f`** | Fetches the latest repository data from other seeds and stores it in your local storage | **`rad checkout`** | Creates a working copy of the repository from local storage | **`rad remote add`** | Creates a Git remote in your working copy for all repository delegates

When you only want to _seed_ a repository and have no interest in contributing code, you can still be a repository’s friend with the `rad seed` command. This is Radicle’s version of a ⭐ _star_ or 👍 _like_, where you show a repository some real love and care by sharing it with others on the network.

<aside>
  <strong>Seeding</strong> a repository is a great way of supporting and giving
  back to a project you care about or use. By offering a little bandwidth to
  the network, you ensure the continued availability of the repository to
  others. ❤️
</aside>

This works similarly to cloning, where the RID is provided, the main difference is that it doesn’t create a working copy.

```
$ rad seed rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5
✓ Seeding policy updated for rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5 with scope 'all'
✓ Fetching rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5 from z6Mkk4R…SBiyXVM..
```

When you seed a repository, it updates your seeding policy to subscribe to updates. It fetches a copy of the repository under your local storage, and provides a replica to the network.

In the future, if you change your mind and decide that you want to contribute code to a repository you’re seeding, you can always run `rad checkout` to create a working copy of the repository from local storage and `rad remote add` to create remotes of peers that you can pull from and push to.

If on the other hand you want to stop seeding a repository, simply run `rad unseed`. For example:

```
$ rad unseed rad:z9DV738hJpCa6aQXqvQC4SjaZvsi
```

You can list all of your seeded repositories with the `ls` sub-command:

```
$ rad ls --seeded
```

If on the other hand you only want to see repositories you’ve contributed to in some way, for example by pushing a branch or commenting on an issue, simply run `ls` with no arguments:

```
$ rad ls
```

> 👾
>
> The set of peers that are followed in the context of a seeded repository is called the _scope_.
>
> By default, when cloning or seeding a repository, your node will subscribe to content from _all_ peers. This behavior is part of the seeding policy and can be changed by passing `--scope followed` to the `seed` and `clone` commands, to only subscribe to content from the repository _delegates_ plus any node that is explicitly followed via `rad follow`.
>
> If a repository wasn’t initially cloned or seeded in this way, it can also be changed later via the `rad seed` command, e.g.
>
> ```
> rad seed rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5 --scope followed
> ```
>
> Conversely, to reset it to the default, `--scope all` can be passed.

This marks the end of our initial foray into Radicle. As we move forward to Chapter 2, we’ll dissect the collaborative mechanisms at play, exploring issues and patches from the unique perspectives of both contributors and delegates. It’s here that the true kernel of _code collaboration_ begins to unfold.

## 2. Collaborating the Radicle Way

Now is the time to delve into Radicle’s approach to working with social artifacts like issues and patches. In the context of version control systems, social artifacts refer to collaborative features that facilitate discussions, bug tracking, and code review. Patches, in particular, represent proposed changes to the codebase, often in response to issues or feature requests. Unlike traditional centralized forges, Radicle leverages Git’s distributed version control system to allow you to maintain local copies of your repository’s associated issues and patches, alongside the repository source tree.

<aside class="kicker"> Note that social artifacts are not stored in your
<em>working</em> copy. They are stored in the associate <em>bare</em>
repository as part of Radicle’s local storage. Read more about Radicle storage
in the <a href="/guides/protocol#local-first-storage">Protocol Guide</a>.
</aside>

If you’re familiar with Git, you know that when you `commit` code changes, a unique hash called a commit hash is generated to identify that snapshot in history. In Radicle, issues, patches, and their associated comments work similarly to code commits. They are stored as Git objects within the repository itself, each with its own unique Git Object ID (OID). This means that all collaborative interactions, such as creating issues, submitting patches, and commenting, are self-contained within the Git repository.

Furthermore, these objects are cryptographically signed by their author, providing an additional layer of security and trust. This allows all participants to independently verify the authenticity of the collaborative interactions, ensuring the integrity of the project’s history. By storing social artifacts within Git and leveraging cryptographic signatures, Radicle enables projects to operate independently of centralized platforms, giving users full control over their collaborative data, and the ability to work offline.

<aside> The <strong>Git OID</strong> is a SHA-1 hash, which is a 160-bit number
typically represented as a 40-character hexadecimal string that uniquely
identifies objects within a Git repository. This identification is part of
Git’s content-addressable storage system, ensuring the integrity of every piece
of data. </aside>

In Radicle, these collaborative social interactions are implemented using a novel system of [Collaborative Objects][cobs] or simply “COBs” 🌽, that are implemented using Git primitives.

### Working with _issues_

<div class="poem"> The more we git together<br>
Together, together<br>
The more we git together<br>
The happier we’ll be</div>

<aside class="kicker span-2">
  <p> A <strong>Conflict-Free Replicated Data Type (CRDT)</strong> is a data
  structure that allows distributed systems to update data independently and
  resolve inconsistencies without central coordination. </p>
  <p> CRDTs ensure that all copies of some piece of data converge to the same
  state, making them ideal for environments with intermittent connectivity or
  where immediate consistency is not required. </p>
</aside>

Before we get into _issue management_, you should first get to know our trusted friend, the COB 🌽. Discussing issues and patches is not natively supported by Git, so we had to extend it. We named this data type a [Collaborative Object][cobs] or “COB” for short. They use Conflict-Free Replicated Data Types (CRDTs) under the hood for data consistency and are one of the fundamental building blocks of the Radicle protocol.

<aside class="span-4">
  <p> Git has a built-in command called <code>git format-patch</code> that
  generates a patch file from commits. This patch file contains the changes made
  in the commits, along with metadata such as the commit message, author, and
  date. The patch file can then be easily shared with others via email or other
  means for review and discussion. </p>
  <p>This patch-based workflow is particularly popular in the Linux development
  community, where patches are often sent to mailing lists for review before
  being applied to the main repository. </p>
  <p>Radicle takes some ideas from this email based workflow but tries to
  offer a much more modern, secure, and user-friendly experience than that
  of email. </p>
</aside>

Now, to see how COBs are leveraged through the process of collaboration, we’ll open an issue under our “paxel” user alias, in a repository where we are a contributor, but not a delegate.

We’re going to `cd` into our copy of the `dark-star` repository we are collaborating on, and open an issue with `rad issue open`. This will open your text editor, prompting you to enter a title and description for the issue. Radicle follows the same convention as Git commits when it comes to inputing via an editor: the first line is a summary or _title_ of the issue, then comes the _description_, separated by a blank line.

```
$ cd dark-star
$ rad issue open
```

We’ll enter the following title and description in our editor:

```
Establish data standards for IUI Dark Star Data group

As we go out and recruit the Neboriens and other intelligences to join
the Intergalactic Union of Intelligences (IUI), we are going to have to
establish standards for Dark Star data submissions.
```

When we save and close the editor, the issue is displayed on the command line:

```
╭───────────────────────────────────────────────────────────────╮
│ Title   Establish data standards for IUI Dark Star Data group │
│ Issue   e4255cc2a0a65b543c2b5badac14bf9e0d9f409f              │
│ Author  paxel (you)                                           │
│ Status  open                                                  │
│                                                               │
│ As we go out and recruit the Neboriens and other              │
│ intelligences to join the Intergalactic Union of              │
│ Intelligences (IUI), we are going to have to establish        │
│ standards for Dark Star data submissions.                     │
╰───────────────────────────────────────────────────────────────╯
```

Behind the scenes, `rad issue open` conjures up a brand-new COB for the issue, bestowing upon it a unique identifier. This COB becomes the guardian of all the metadata and interactions associated with the issue, ready to be replicated and synced across the Radicle network.

> 👾
>
> To ensure that your preferred editor is chosen when you enter `rad issue open`, make sure the `EDITOR` environment variable is set appropriately. It must be set to the full path to your preferred editor, for example:
>
> ```
> export EDITOR=/usr/bin/vim
> ```
>
> If you’d prefer to enter the issue title and description via the command-line without spawning your editor, you can use the `--title` and `--description` options to `rad issue open`.

COBs such as issues and patches can be created even when offline, since Radicle is local-first. COBs you create offline will simply synchronize with the network once you go online.

You can always see a table with all of the issues associated to a repository by running `rad issue` within its working directory.

<pre class="wide"><code>$ rad issue
╭──────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ●   ID        Title                                                    Author                    │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ●   80464b3   Categorize initial dataset                               paxel    (you)            │
│ ●   e4255cc   Establish data standards for IUI Dark Star Data group    paxel    (you)            │
│ ●   3e2f653   Add anomalous data from ship 897AF                       calyx    z6Mkgom…unurCap  │
│ ●   badda04   Recruit Neboriens to join IUI and share dark star data   calyx    z6Mkgom…unurCap  │
╰──────────────────────────────────────────────────────────────────────────────────────────────────╯
</code></pre>

Let’s display an issue that looks interesting, using `rad issue show`:

```
$ rad issue show 3e2f65
╭─────────────────────────────────────────────────────────────╮
│ Title   Add anomalous data from ship 897AF                  │
│ Issue   3e2f653383f0d2fe21ef4e859a25925c364c740a            │
│ Author  calyx                                               │
│ Status  open                                                │
│                                                             │
│ Before we onboard new IUI members like the Neborians, it is │
│ important we upload the data from ship 897AF. I just        │
│ reviewed the database and it seems this is missing.         │
╰─────────────────────────────────────────────────────────────╯
```

The issue, originally opened by Calyx, the repository’s delegate, outlines a task that aligns perfectly with our knowledge area.

> 👾
>
> _Full identifiers do not need to be used in most commands!_
>
> Notice that the full identifier is displayed under the `Issue` field. When working with COBs, it’s always possible to use the first few characters of a COB’s ID instead of the full hash, as we did above with `rad issue show`.

<aside> This works exactly the same way as Git commit hashes: as long as the
given prefix is unambiguous, Radicle will resolve it to its full value.
</aside>

Let’s compose a comment, with `rad issue comment`, expressing our interest in tackling the issue.

```
$ rad issue comment 3e2f65 --message "I can help."
╭─────────────────────────╮
│ paxel (you) now 74faf0e │
│ I can help.             │
╰─────────────────────────╯
```

This time, we used the command-line `--message` option to provide a comment, but if you don’t specify any option, you will be prompted to enter a message via your editor, just like with `rad issue open`.

> 🧠
>
> Since Radicle’s COB types are extensible by users, globally-unique _Type IDs_, such as `xyz.radicle.issue` and `xyz.radicle.patch` are used to identify them, preventing naming collisions. This reverse domain name notation not only houses Radicle’s predefined COBs but also accommodates user-defined ones.
>
> For example, if a user or organization were to define a new COB type under their domain, it might look something like `com.acme.task`, for some hypothetical “task” COB under the `acme.com` domain. This extensibility allows for an unlimited set of new collaboration primitives to be defined by users.
>
> If you’re interested in creating a custom COB, pop into our [chatroom][zulip] and we can get you started.

### Assigning issues

Now, let’s enter Calyx’s point of view for a second. Calyx is the maintainer of the repository and is starting his day, gazing into a fresh terminal window, where he enters `rad inbox`.

<pre class="wide"><code>$ rad inbox
╭────────────────────────────────────────────────────────────────────────────────────────────╮
│ dark-star                                                                                  │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ 004   ●   3e2f653   Add anomalous data from ship 897AF   issue   open   calyx   1 hour ago │
╰────────────────────────────────────────────────────────────────────────────────────────────╯
</code></pre>

The Radicle inbox is like a notifications center, displaying issues and patches that are newly created or have unread comments or new activity.

> 👾
>
> If you run `rad inbox` from a Radicle repository, only notifications belonging to this repository will be shown. You can override this by using `--all` to show notifications from all repositories. If the command is run outside a Radicle repository, all repositories will be displayed.

Calyx decides to display the notification in his inbox with `rad inbox show`, using the notification number.

```
$ rad inbox show 4
╭─────────────────────────────────────────────────────────────╮
│ Title   Add anomalous data from ship 897AF                  │
│ Issue   3e2f653383f0d2fe21ef4e859a25925c364c740a            │
│ Author  calyx                                               │
│ Status  open                                                │
│                                                             │
│ Before we onboard new IUI members like the Neborians, it is │
│ important we upload the data from ship 897AF. I just        │
│ reviewed the database and it seems this is missing.         │
├─────────────────────────────────────────────────────────────┤
│ paxel z6MkvZw…7aCGq3C 1 hour ago 74faf0e                    │
│ I can help.                                                 │
╰─────────────────────────────────────────────────────────────╯
```

He sees that we (Paxel) left a comment and we’re interested in helping with the issue, and decides to assign it to us with `rad issue assign`.

```
$ rad issue assign 3e2f653 --add did:key:z6MkvZwzK64f3GuDcAs6dEcje89ddfHkBjS1v9Dkh7aCGq3C
```

He adds a comment to the issue as well.

```
$ rad issue comment 3e2f653 --message "Great, I've assigned it to you."
```

> 👾
>
> The `assign` sub-command can be used to add (`--add`) or remove (`--delete`) assignees.

As a delegate of `dark-star`, Calyx has the rights to assign this issue. Calyx can then use `rad issue show`, to confirm that the issue was correctly assigned:

```
$ rad issue show 3e2f65
╭─────────────────────────────────────────────────────────────╮
│ Title      Add anomalous data from ship 897AF               │
│ Issue      3e2f653383f0d2fe21ef4e859a25925c364c740a         │
│ Author     calyx                                            │
│ Assignees  paxel z6MkvZw…7aCGq3C                            │
│ Status     open                                             │
│                                                             │
│ Before we onboard new IUI members like the Neborians, it is │
│ important we upload the data from ship 897AF. I just        │
│ reviewed the database and it seems this is missing.         │
├─────────────────────────────────────────────────────────────┤
│ paxel z6MkvZw…7aCGq3C 6 hours ago 39134b6                   │
│ I can help.                                                 │
├─────────────────────────────────────────────────────────────┤
│ calyx 2 minutes ago 922fac7                                 │
│ Great, I've assigned it to you.                             │
╰─────────────────────────────────────────────────────────────╯
```

> 👾
>
> There’s a lot more that you can do with issues, such as:
>
> - Editing with `rad issue edit`
> - Labeling with `rad issue label`
> - Closing with `rad issue state --closed`
>
> We don’t want to overwhelm you though! Check out `rad issue --help` for more details.

### Working with _patches_

The collaboration voyage doesn’t stop at issues though! In the realm of code, issues typically lead to _patches_.

Since Calyx has assigned the above issue to us, we’ll start working on it by making the changes in a new branch, and once we’re done, we’ll open a patch. Let’s dive into it step-by-step.

First, we need to make sure we’re in our working copy of the `dark-star` repository. You can always check the current Radicle repository using the `rad .` invocation.

```
$ rad .
rad:z3cyotNHuasWowQ2h4yF9c3tFFdvc
```

Now, let’s create a new branch where we’ll add the missing data from ship 897AF, as mentioned in the issue. We happen to have this data right on our system!

```
$ git checkout -b anomalous-data-897af
$ cp /var/run/897af.log data/897af.log
$ git add data/
```

Finally, we commit our changes to the branch.

```
$ git commit -m "Add anomalous data from ship 897AF"
```

Now that our changes are committed, we’re ready to open a patch. To do so, we simply push our branch to `refs/patches`, on `rad` remote.

<aside class="span-3"> The <code>refs/patches</code> remote reference is what
we call a <em>magic ref</em> 🪄 - it doesn’t exist as a regular Git reference;
instead, Radicle intercepts the command and opens a new patch whenever you push
code to it using the Radicle remote helper. If you’re familiar with <a
href="https://www.gerritcodereview.com/" target="_blank">Gerrit</a>, Google’s
code review tool, it works the same way!</aside>

```
$ git push rad HEAD:refs/patches
```

Radicle will then open your editor, where the patch title can be edited and a description can be added. Just like for issues, the first line of text is the patch title, while the subsequent lines make up the description.

> 👾
>
> In the above command, `HEAD:refs/patches` is a _refspec_, where `HEAD` is a reference to the last commit in the currently checked-out branch, and `refs/patches` is a (magic) reference on the remote side. But you don’t have to use `HEAD`; any local branch will do. Even an arbitrary commit hash can be used to open a patch!

<aside class="apan-2">
  A <strong>refspec</strong> in Git defines the relationship between local
  and remote references. It’s a pattern used primarily with Git commands like
  <code>fetch</code>, <code>push</code>, and <code>pull</code> to specify which
  branches or commits should be transferred between the local repository and
  the remote repository. A refspec is composed of two parts, separated by a
  colon <code>:</code>, the <em>source</em> and the <em>destination</em>
  reference.
</aside>

Once we’ve entered the details describing the patch, we save and exit our editor. This pushes our commit to the `rad` remote, opening the patch.

<pre class="wide">
✓ Patch e5f0a5a5adaa33c3b931235967e4930ece9bb617 opened
✓ Synced with 8 node(s)

To rad://z3cyotNHuasWowQ2h4yF9c3tFFdvc/z6MkvZwzK64f3GuDcAs6dEcje89ddfHkBjS1v9Dkh7aCGq3C
* [new reference]   HEAD -> refs/patches
</pre>

In the above Git output, we see our patch’s identifier displayed:

```
e5f0a5a5adaa33c3b931235967e4930ece9bb617
```

Patches are a type of COB 🌽, just like issues, and this is the SHA-1 hash that uniquely identifies this patch.

> 👾
>
> If you want to avoid remembering the `git push rad HEAD:refs/patches` command, you can add an alias to your local (or global) Git configuration:
>
> ```
> $ git config alias.patch 'push rad HEAD:refs/patches'
> ```
>
> This allows you to create a patch by simply running `git patch`. Use the `--global` option with `git config` to add the alias to your global Git config.

> 🧠
>
> Radicle’s patch workflow is implemented using the `git-remote-rad` helper program developed for Radicle. This program is called by Git when it detects a push to any `rad://` URL, such as the one under our `rad` remote.

In addition to opening a patch, the above `push` command creates a new remote tracking branch and makes it the upstream of our `anomalous-data-897af` branch. Any subsequent push from this original branch will now update the patch, synchronizing our local changes with the network.

> 🧠
>
> The name of the remote patch branch is always `rad/patches/` followed by the patch identifier. For example:
>
> ```
> rad/patches/e5f0a5a5adaa33c3b931235967e4930ece9bb617
> ```

We can take a look at remote tracking branches using `git branch --remotes` to understand this better.

```
$ git branch --remotes
  calyx@z6Mkgom1bTxdh9fMFxFNXFMw3SbXnma6NARdsfcFuunurCap/main
  rad/main
  rad/patches/e5f0a5a5adaa33c3b931235967e4930ece9bb617
```

Here we see three branches: the `main` branch of Calyx (`calyx@z6Mk..`), our own main branch (`rad/main`), and the branch associated with our recent patch (`rad/patches/e5f0a..`).

We can also check the commit hashes associated with the `rad` remote references:

```
$ git ls-remote rad
e81db74197f48cc5198d9c03cceaec955af82abf  refs/heads/main
80b8d420658834afc444a13c03f0c3ff6875a71c  refs/heads/patches/e5f0a5a5adaa33c3b931235967e4930ece9bb617
```

Since the `rad` remote is associated with our published copy of the repository, these are the branch heads that are publicly accessible on the network.

### Updating patches

So let’s say we’d like to update the patch we just submitted. We found some formatting issues with the log file we included and we’d like to correct it and update the patch.

First, let’s dive into our editor and fix the formatting:

```
$ vi data/897af.log
```

Then, we commit the changes and push.

```
$ git commit --amend
$ git push --force
```

To update the patch, we simply use `git push`. Since we amended the original commit, we have to use the `--force` option when pushing. This is common practice when a patch has been reworked.

As with opening a patch, this opens an editor to enter a reason for updating the patch. Leave it blank if you’d like to skip that.

<pre class="wide"><code>✓ Patch e5f0a5a updated to revision 4d0c1156f8ac7af2297d1314cd7556185cd16ae4
✓ Synced with 6 node(s)

To rad://z3cyotNHuasWowQ2h4yF9c3tFFdvc/z6MkvZwzK64f3GuDcAs6dEcje89ddfHkBjS1v9Dkh7aCGq3C
 + b766431...80b8d42 anomalous-data-897af -> patches/e5f0a5a5adaa33c3b931235967e4930ece9bb617 (forced update)
</code></pre>

We see that the change that was pushed is represented by a new identifier:

```
4d0c1156f8ac7af2297d1314cd7556185cd16ae4
```

This identifier represents the current version of the patch. Patch versions, called _revisions_ in Radicle, are immutable. Therefore, each update to a patch creates a new revision, and patch updates are non-destructive, even when you force-push.

<aside class="span-2"> The immutability of patch revisions makes code review a
<em>breeze</em>. It’s easy to know what you’ve reviewed and you can quickly
tell what has changed since your last review by comparing patch revisions. </aside>

> 👾
>
> If the branch upstream is not set to the patch reference, eg. `rad/patches/e5f0a5a..`, you can set it with `rad patch set e5f0a5a`.

As with issues, we can display the patch using the `show` sub-command:

<pre class="wide"><code>$ rad patch show e5f0a5a
╭────────────────────────────────────────────────────────────────────────────────╮
│ Title     Add anomalous data from ship 897AF                                   │
│ Patch     e5f0a5a5adaa33c3b931235967e4930ece9bb617                             │
│ Author    paxel (you)                                                          │
│ Head      80b8d420658834afc444a13c03f0c3ff6875a71c                             │
│ Branches  anomalous-data-897af                                                 │
│ Commits   ahead 1, behind 0                                                    │
│ Status    open                                                                 │
│                                                                                │
│ Data from ship 897AF.                                                          │
├────────────────────────────────────────────────────────────────────────────────┤
│ 80b8d42 Add anomalous data from ship 897AF                                     │
├────────────────────────────────────────────────────────────────────────────────┤
│ ● opened by paxel (you) (b766431) 58 minutes ago                               │
│ ↑ updated to 4d0c1156f8ac7af2297d1314cd7556185cd16ae4 (80b8d42) 44 minutes ago │
╰────────────────────────────────────────────────────────────────────────────────╯
</code></pre>

Notice at the bottom that there is a timeline, with the original patch head (`b766431`) and the updated head (`80b8d42`) after a new revisions (`4d0c115`) was created via a patch update.

Revisions are much more than changesets; they can carry useful metadata such as reviews, comments, and a top-level description that spans all the commits under it. That’s why you see two identifiers for the revision, the first one is the hash of the revision, and the second is the hash of the code itself (eg. your branch head).

> 🧠
>
> All patches start with an _initial_ revision. This revision has the same identifier as the patch itself, ie. `e5f0a5a5adaa33c3b931235967e4930ece9bb617` in the example above.

### Merging patches into the canonical

Now that we’ve opened a patch, let’s switch perspectives again and return to Calyx-land. Calyx will want to `checkout` the patch, review it, possibly make changes and run tests, and then `merge` it. Let’s walk through this process together.

First, within the repository, Calyx runs `rad patch` and notices there is a new patch.

<pre class="wide"><code>$ rad patch
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ ●  ID       Title                                Author           Head     +       -   Updated    │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ●  e5f0a5a  Add anomalous data from ship 897AF   z6MkvZw…7aCGq3C  80b8d42  +50382  -0  1 hour ago │
╰───────────────────────────────────────────────────────────────────────────────────────────────────╯
</code></pre>

Calyx then uses the `checkout` sub-command of `patch` to switch to the patch:

```
$ rad patch checkout e5f0a5a
✓ Switched to branch patch/e5f0a5a at revision 4d0c1156f8ac7af2297d1314cd7556185cd16ae4
✓ Branch patch/e5f0a5a setup to track rad/patches/e5f0a5a5adaa33c3b931235967e4930ece9bb617
```

When collaborating with peers, it’s often useful to be able to checkout a patch in its own branch. With a patch checkout, you can browse the code, run tests and even propose your own revision to the patch.

The `checkout` sub-command switches to a new local branch which has the patch checked out at a specific revision. By default, the latest of the patch author’s revisions is chosen, but you can specify a different revision using the `--revision` option. See `rad patch --help` for more information.

> 👾
>
> If you’d just like to view the patch changes without checking out the code, use the `diff` command!
>
> ```
> rad patch diff e5f0a5a
> ```

It’s a rare occasion that someone submits a perfect patch that can be merged as-is. For example, in some cases a maintainer may want to rebase the patch’s commits on top of the main branch, which could have moved since the patch was proposed.

Calyx will do just that by running the following command from the patch checkout:

```
$ git rebase main
```

This replays the patch’s commits on top of the current `main` branch. All that’s left to do is to update the patch itself, with a new revision:

```
$ git push -o patch.message="Rebased!" --force
✓ Patch e5f0a5a updated to revision 1e0596d917725c447106b1efc900bebf4b95a810
✓ Synced with 12 node(s)

To rad://z3cyotNHuasWowQ2h4yF9c3tFFdvc/z6Mkgom1bTxdh9fMFxFNXFMw3SbXnma6NARdsfcFuunurCap
* [new branch]      patch/e5f0a5a -> patches/e5f0a5a5adaa33c3b931235967e4930ece9bb617
```

Although Calyx isn’t the author of the patch he can propose a new revision. In fact, _anyone_ can do that, and you will see their revision if you follow them!

Since Calyx did a rebase, the `--force` flag was required. Notice also the `-o patch.message` option; this allows Calyx to directly provide a comment related to this revision, bypassing his editor.

> 🧠
>
> Git has something called “push options”, these are options that are passed to the remote helper and/or server when executing a push, and can be specified via `-o <string>` or `--push-option=<string>`. Radicle as well as other forges use these to configure a push.
>
> Radicle supports other options such as:
>
> - `-o sync`: force a network sync after the push.
> - `-o no-sync`: don’t wait for sync after the push.
> - -`o patch.draft`: open a “draft” patch.
>
> See `man rad-patch` for the full list of options.

If we look at the patch now, we’ll see the new revision Calyx just pushed:

```
$ rad patch show e5f0a5a
...
│ ● opened by z6MkvZw…7aCGq3C (b766431) 2 hours ago                           │
│ ↑ updated to 4d0c1156f8ac7af2297d1314cd7556185cd16ae4 (80b8d42) 2 hours ago │
│ * revised by calyx in 1e0596d (25f8515) 3 minutes ago                       │
╰─────────────────────────────────────────────────────────────────────────────╯
```

Here we see that Calyx’s changes are associated to the revision identifier starting with `1e0596d` and to the commit hash `25f8515`.

To merge this latest revision, Calyx uses regular Git commands. When Radicle detects that a patch’s revision was merged into the main branch, the associated patch is marked as _merged_.

<aside class="span-2"> In this guide, we use the term <em>main branch</em> to
mean the branch configured as the repository’s <em>default branch</em> during
the repository initialization process (<code>rad init</code>). You can check
which branch is set as your default branch using the <code>rad inspect
--payload</code> command. </aside>

First Calyx merges the patch’s changeset into the `main` branch, by merging the patch branch he is on:

```
$ git checkout main
Switched to branch 'main'
Your branch is up to date with 'rad/main'.
$ git merge patch/e5f0a5a
Updating e81db74..25f8515
Fast-forward
data/897af.log | 50382 ++++++++++
1 file changed, 50382 insertions(+)
create mode 100644 data/897af.log
```

Then he pushes `main` to the `rad` remote.

```
$ git push rad main
✓ Patch e5f0a5a5adaa33c3b931235967e4930ece9bb617 merged at revision 1e0596d
✓ Canonical head updated to 25f851529d68180a780cfafc15a48b89208ba8c4
✓ Synced with 7 node(s)

To rad://z3cyotNHuasWowQ2h4yF9c3tFFdvc/z6Mkgom1bTxdh9fMFxFNXFMw3SbXnma6NARdsfcFuunurCap
  e81db74..25f8515  main -> main
```

This marks the patch as _merged_, as seen in the output, updates the repository’s **canonical** or “authoritative” state to `25f851`, and synchronizes the changes with the network.

The patch no longer shows up under `rad patch`:

```
$ rad patch
Nothing to show.
```

We can verify that it is merged via `rad patch show e5f0a5a`, or `rad patch --merged`, which shows all merged patches.

> 👾
>
> Patch commands work similar to issues. You can:
>
> - Edit with `rad patch edit`.
> - Label with `rad patch label`.
> - Archive with `rad patch archive`.
>
> For more details on how to work with patches, read the manual with `man rad-patch`.

### From remote viewing to adding remotes

Whenever you `init` or `clone` a repository, your node will follow all peers for that repository, which means that everyone’s patches and issues will be synchronized to your device.

You can change this behavior by specifying a different scope when cloning or initializing a repository, with the `--scope` option. For example, `--scope followed` will only synchronize changes by peers you explicitly follow with the `rad follow` command. The default is `--scope all`.

But if a peer becomes a regular collaborator, it would be useful to add them as a Git remote to track their changes and `checkout` their branches, even if they haven’t been submitted as patches. The `rad remote` family of commands can help you achieve this.

Calyx decides to do this, and adds us (Paxel) as a remote:

```
rad remote add z6MkvZwzK64f3GuDcAs6dEcje89ddfHkBjS1v9Dkh7aCGq3C --name paxel
```

This allows Calyx to keep up with our changes by creating a remote tracking branch in his working copy, that has our main branch as its upstream.

<pre class="wide"><code>$ git remote -v
paxel   rad://z3cyotNHuasWowQ2h4yF9c3tFFdvc/z6MkvZwzK64f3GuDcAs6dEcje89ddfHkBjS1v9Dkh7aCGq3C (fetch)
paxel   rad://z3cyotNHuasWowQ2h4yF9c3tFFdvc/z6MkvZwzK64f3GuDcAs6dEcje89ddfHkBjS1v9Dkh7aCGq3C (push)
rad     rad://z3cyotNHuasWowQ2h4yF9c3tFFdvc (fetch)
rad     rad://z3cyotNHuasWowQ2h4yF9c3tFFdvc/z6Mkgom1bTxdh9fMFxFNXFMw3SbXnma6NARdsfcFuunurCap (push)
</code></pre>

In the above output, we see the names of the remotes on the left. We see that the `paxel` remote points to a different namespace than the `rad` remote, which points to Calyx’s namespace. Remotes can also be viewed using `rad remote`:

```
$ rad remote
paxel z6MkvZwzK64f3GuDcAs6dEcje89ddfHkBjS1v9Dkh7aCGq3C (fetch)
rad   (canonical upstream)                             (fetch)
rad   z6Mkgom1bTxdh9fMFxFNXFMw3SbXnma6NARdsfcFuunurCap (push)
```

Now that a remote is setup, Calyx can fetch our branches with `git fetch`:

```
$ git fetch paxel
  From rad://z3cyotNHuasWowQ2h4yF9c3tFFdvc/z6MkvZwzK64f3GuDcAs6dEcje89ddfHkBjS1v9Dkh7aCGq3C
    * [new branch]      dark-star-secrets       -> paxel/dark-star-secrets
```

Oh darn, what has he found! If you don’t want a branch to be published on the Radicle network, avoid pushing it to your `rad` remote!

> 👾
>
> You can always use `rad remote list --untracked` to find peers that you are following but are not tracking in your working copy.

### Synchronizing the canonical

Now that Calyx has updated the repository’s `main` branch by merging our patch, all we need to do is pull those changes ourselves, to have the most up to date state.

We’ll start by switching back to our `main` branch with `git checkout main`, and then we’ll initiate a regular `pull`:

```
$ git pull
Fetching rad
From rad://z3cyotNHuasWowQ2h4yF9c3tFFdvc
  e81db74..25f8515  main       -> rad/main
Updating e81db74..25f8515
Fast-forward
...
```

> 🧠
>
> The `git pull` command is really just a `git fetch` followed by a `git merge`. If you’re comfortable with Git, it can be a good idea to first run the `fetch`, see which remote-tracking branches were updated, and decide what to merge yourself.

There we go, our working copy is now up to date with Calyx’s.

If you get `Already up to date.`, it could mean that the changes pushed by Calyx haven’t reached your node yet. In that case, it’s a good idea to ask your node to fetch changes from the network:

```
$ rad sync --fetch
✓ Fetching rad:z3cyotNHuasWowQ2h4yF9c3tFFdvc from z6MkrLM…ocNYPm7..
✓ Fetching rad:z3cyotNHuasWowQ2h4yF9c3tFFdvc from z6Mkg5Z…4Q8qCHw..
✓ Fetched repository from 2 seed(s)
```

After the `sync` command succeeds, try to `git pull` again.

And, that’s a wrap! You now know the most relevant nitty gritty details of how to leverage Radicle for code collaboration.

_One thing to keep in mind is that Radicle doesn’t have advanced code review features yet for patches, but that is coming in a near-term release._

## 3. Selectively revealing repositories

In his influential work, [A Cypherpunk’s Manifesto][cyph-man] (1993), Eric Hughes eloquently encapsulated the essence of privacy, stating: **_Privacy is the power to selectively reveal oneself to the world._** This notion of self-determination and control over one’s personal information stands in stark contrast to the reality of using “private repository” features on traditional centralized code forges. In those systems, privacy is merely an illusion maintained by terms of service agreements, as data is stored in cleartext, fully accessible to the platform’s employees, vulnerable to potential misuse or leaks, and subject to external pressures such as government requests. Users are left with no real control, forced to blindly trust that their code and data won’t be viewed, exploited, or even used without consent for purposes like training large language models.

In contrast, Radicle’s decentralized approach puts the power of privacy directly in the hands of users by leveraging public key cryptography and granular access control mechanisms. The _power to selectively reveal_ is a foundational principle in Radicle, fostering a more resilient and safer environment for code collaboration. Through selective replication, private repositories are only accessible to and replicated by repository collaborators, while fully encrypted connections ensure confidential data transfer between peers.

By combining selective replication and encrypted and authenticated connections, repositories are invisible to the rest of the network. This approach effectively creates isolated spaces for private collaboration, forgoing the need for encryption at rest.

In this chapter, we’ll explore how to maintain sovereignty and control over a private repository while collaborating with a set of peers and a trusted seed node.

### Initializing a private repository

When a private repository is created in Radicle, it is only visible and accessible to explicitly authorized peers. Privacy is extended to all aspects of the repository, including its data, creation time, Repository ID (RID), Collaborative Objects (COBs), and its set of collaborators.

To maintain this privacy during data transfer, all connections between nodes, including those to seed nodes, are fully encrypted using an AEAD algorithm, `ChaCha20-Poly1305`.

<aside class="span-2">
  <strong>ChaCha20-Poly1305</strong> is a modern AEAD encryption algorithm
  designed for speed and security. It combines two parts: ChaCha20, which
  scrambles the data to keep it secret, and Poly1305, which creates a unique
  “fingerprint” for the encrypted data to ensure it hasn’t been tampered with.
  This system works efficiently on all types of devices, from smartphones to
  computers, without needing special hardware.
</aside>

To demonstrate how this works in practice, let’s create a private repository for a sensitive research project we’re working on with our peer, Calyx. We’ll start by initializing a repository within a new directory named `schrödingers-paradox` and committing our initial research findings:

```
$ cd schrödingers-paradox
$ git init
$ cp ~/secrets/897af-captain.log data/897af-captain.log
$ git commit -a -m "Add captain's log from ship 897AF"
```

Next, to securely share this with Calyx, we initialize it as a private repository in Radicle using the `--private` flag:

<aside class="kicker"><code>Paxel</code></aside>

```
$ rad init --private
```

This invocation functions similarly to the public repository initialization process; the key difference is that it automatically configures the `visibility` option of the repository to private. As a result, the repository remains unannounced 🥷 and unpublished on the network, reflecting its nature.

```
$ rad init --private

Initializing private radicle 👾 repository in /home/paxel/src/schrödingers-paradox..
...

Your Repository ID (RID) is rad:z3jEQE4VMzkR1UVeSLiN9E8AMtV6a.
You can show it any time by running `rad .` from this directory.

You have created a private repository.
This repository will only be visible to you, and to peers you explicitly allow.

To make it public, run `rad publish`.
To push changes, run `git push`.
```

If we run `rad ls --private`, we’ll find the repository with its `private` visibility.

<pre class="wide">
╭────────────────────────────────────────────────────────────────────────╮
│ Name                   RID                                 Visibility  │
├────────────────────────────────────────────────────────────────────────┤
│ schrödingers-paradox   rad:z3jEQE4VMzkR1UVeSLiN9E8AMtV6a   private     │
╰────────────────────────────────────────────────────────────────────────╯
</pre>

### Curating the _allow_ list

Now that we have our private repository, the next step is to grant access to our collaborators.

The newly created private repository, `schrödingers-paradox`, will initially be accessible only by us, the lone delegate. This is due to the fact that repository delegates always have access to their private repositories. However, to collaborate on this repository with others, we need to curate its allow list to include the DIDs of Calyx, and at least one [seed node][seeder] _we trust_. This seed node will act as a trusted relay, necessary for the synchronization of repository state between Calyx and us.

Though this trusted seed node needs a public DNS address, it doesn’t have to be advertised to the network. One can simply omit adding the address to the `externalAddresses` key in the Radicle node configuration.

> 👻
>
> Private repositories are not encrypted at rest, so any node that you add to the allow list will have visibility over the contents of your private repository. In the [Chapter 4][ch4] we explore a different setup that works over Tor and doesn’t require a trusted seed node.

We can add both Calyx and our trusted seed node to the allow list using a single `rad id update` command. This command requires a `--title` for the update, along with each authorized DID specified with the `--allow` flag:

```
$ rad id update --title "Allow Calyx and seed.darkstar.example" \
    --allow did:key:z6Mkgom1bTxdh9fMFxFNXFMw3SbXnma6NARdsfcFuunurCap \
    --allow did:key:z6MkqNZS9QWvC4wbZ8Vz4hQZ1FzN8q4XGj2KGmK9qNgQ8VWt
```

Once we submit the update above, it is automatically approved, as we are the repository’s sole delegate. If you look at the resulting diff, you see that both Calyx and our trusted node are being added to the `allow` list under the `visibility` key:

```json
"allow": [
  "did:key:z6Mkgom1bTxdh9fMFxFNXFMw3SbXnma6NARdsfcFuunurCap",
  "did:key:z6MkqNZS9QWvC4wbZ8Vz4hQZ1FzN8q4XGj2KGmK9qNgQ8VWt"
]
```

> 👾
>
> It is also possible to update a repository that is currently public to become private, with a repository identity update:
>
> ```
> $ rad id update --title "Make private" --visibility private
> ```
>
> This won’t delete historic repository data from public seed nodes or other peers that previously seeded or cloned the repository, meaning users will still be able to clone the old version of the repository.
>
> Instead, future updates to the repository, including the repository’s private status will be hidden to unauthorized users, only to be announced and accessible to those explicitly defined in the `allow` list.

### Replicating to our seed node

Now that we’ve set up our private repository, it’s essential to configure it from our trusted seed node. Since our seed node is likely configured with a selective seeding policy, we’ll have to tell it to seed our private repository with the `rad seed` command.

Since `schrödingers-paradox` is a private repository, we also need to specify our (Paxel’s) Node ID using the `--from` flag to explicitly indicate a source node to fetch from. We therefore run the following command from within an SSH session on our seed node:

<aside class="kicker"><code>seed.darkstar.example</code></aside>

```
$ rad seed rad:z3jEQE4VMzkR1UVeSLiN9E8AMtV6a --from z6MkvZwzK64f3GuDcAs6dEcje89ddfHkBjS1v9Dkh7aCGq3C
```

This will update darkstar’s seeding policy and attempt to fetch the repository from our node. For the fetching to be successful, we’ll have to be connected to the seed node. Check that it is indeed the case with `rad node status`, and use `rad node connect` or adjust your node’s configuration if it isn’t the case.

> 👾
>
> If you’re experiencing issues with repository replication, try these steps:
>
> 1. Check your current connections:
>    ```
>    $ rad node status
>    ```
> 2. If your seed node isn’t listed, manually connect using:
>    ```
>    $ rad node connect <address>
>    ```
>    For example:
>    ```
>    $ rad node connect z6MkqNZS9QWvC4wbZ8Vz4hQZ1FzN8q4XGj2KGmK9qNgQ8VWt@seed.darkstar.example:8776
>    ```
>
> To find your seed node’s address, run `rad node config --addresses` while logged in to the seed node.
>
> For comprehensive information on setting up and managing seed nodes, refer to our [Seeder’s Guide][seeder].

Once the repository is on the seed, you should be able to see it by running `rad ls --private` from within the SSH session. It can then serve as an always online reliable access point for other authorized peers. Remember, only peers on the repository’s allow list will be able to fetch from this seed node.

### Cloning as a trusted peer

With our repository now successfully seeded, Calyx can clone our project. Since `schrödingers-paradox` is a private repository, Calyx needs to specify the seed node to fetch from, using the `--seed` flag. In this case, Calyx specifies the Node ID of `seed.darkstar.example`:

<aside class="kicker"><code>Calyx</code></aside>

```
$ rad clone rad:z3jEQE4VMzkR1UVeSLiN9E8AMtV6a --seed z6MkqNZS9QWvC4wbZ8Vz4hQZ1FzN8q4XGj2KGmK9qNgQ8VWt
```

Once the repository is fetched, it’s no longer necessary to specify the seed. Commands such as `rad sync` will automatically try to sync with our trusted seed.

_With a local copy of the repository, Calyx can now collaborate freely, in full secrecy._

### Removing nodes from the _allow_ list

In the event that our seed node became compromised, we could revoke access privileges to the repository from it. The same `rad id update` command is used, but this time with the `--disallow` flag:

```
$ rad id update --title "Darkstar is compromised!" \
    --disallow did:key:z6MkqNZS9QWvC4wbZ8Vz4hQZ1FzN8q4XGj2KGmK9qNgQ8VWt
```

Our _no-longer-trusted_ seed node will now be unable to fetch updates from us for `schrödingers-paradox`.

> 👾
>
> As time goes by, you might decide that a repository no longer needs to be private. In such a case, you can easily change its visibility. Simply run `rad publish` within a repository’s working copy to transform it from private to public.

> 👻
>
> Radicle’s codebase hasn’t yet undergone formal security audits. While we’re confident in its security, undiscovered vulnerabilities may exist. If you encounter any issues, we encourage you to report them to **security@radicle.xyz**.

## 4. Embracing the Onion

**[Tor][tor]**, “The Onion Router”, is a decentralized network that anonymizes users’ online activity by routing internet traffic through multiple encrypted relays, providing stronger anonymity compared to traditional VPNs.

<aside class="span-3"> Tor, originally developed by the U.S. Naval Research
Laboratory in the 1990s, was designed to protect government communications. It
was further developed by DARPA before becoming a public project. In 2006, the
non-profit Tor Project was established to maintain and improve the network.
Today, Tor is widely used by individuals, activists, journalists, and
organizations seeking greater online privacy.</aside>

To further enhance repository and user privacy, Radicle nodes can be configured to run behind Tor. This allows connections to be made to `.onion` addresses, as well as hiding one’s IP address and exposing Radicle as a Tor _onion service_.

Depending on how you configure Radicle, it offers several key advantages:

- **Enhanced anonymity**: Your node’s real IP address is hidden, making it difficult for others to track your online activities or determine your location.
- **NAT traversal**: Tor automatically handles [NAT traversal][nat], eliminating the need for manual port forwarding or UPnP configuration. This means peers can directly connect with one another without a seed node, even behind a restrictive firewall.
- **Censorship resistance**: Repositories accessible via Tor are more resilient against censorship attempts, as the Tor network is designed to circumvent blocking.

[nat]: https://en.wikipedia.org/wiki/NAT_traversal

Network Address Translation (NAT) typically creates barriers for direct peer-to-peer communication. Devices behind NAT gateways are often isolated with non-routable private IP addresses, making them inaccessible from the public internet. This is common in most consumer internet setups.

Tor addresses this issue by providing static `.onion` addresses – cryptographic identifiers representing nodes that are routable across the Tor network. This allows peers behind NAT to connect directly without needing to know each other’s public IP addresses, overcoming limitations faced by traditional peer-to-peer networks.

This chapter will explore a few distinct ways to configure Radicle with Tor:

1. **Mixed Mode**: Only connections to `.onion` addresses go through Tor, while other connections work normally.
2. **Full Proxy Mode**: All traffic is routed through Tor for maximum anonymity,

```
including traffic to nodes that are *not* behind Tor.
```

3. **Transparent Proxy Mode**: Leverages an existing fully transparent Tor proxy on the network.

Before proceeding, ensure you have Tor installed on your system. Use your preferred package manager to install it (the package name is typically “tor”). For detailed instructions, refer to the Tor [installation guide][install-tor].

### Setting up a Tor Onion Service for Radicle

We’ve been collaborating with Calyx on the private `schrödingers-paradox` repository. Recently, we removed a compromised seed node from the repository’s `allow` list, which inadvertently cut off Calyx’s access to the repository.

To restore Calyx’s access and enhance the security of our sensitive research, we’ll configure our node as a Tor Onion Service (also known as a hidden service). This setup will make our node accessible via a `.onion` address, allowing Calyx to connect directly to us without relying on any intermediaries.

Let’s set up our Tor Onion Service. The following steps are for Linux-based systems, but they should be similar for other operating systems.

First we create a new `radicle` directory for our Onion Service, ensuring it’s readable and writable:

```
$ sudo mkdir -m 700 /var/lib/tor/radicle
```

This directory will store information and cryptographic keys for our Onion Service.

Then we update our Tor configuration (`/etc/tor/torrc`) by adding the following lines to it:

```
HiddenServiceDir /var/lib/tor/radicle
HiddenServicePort 8776
```

These lines set the `HiddenServiceDir` to the path of the directory we just created and specify the `HiddenServicePort` as `8776`, which is the default Radicle node port.

Finally, we restart our Tor daemon to apply the configuration changes:

```
$ sudo systemctl restart tor
```

Our `.onion` address is stored in a file under our Onion Service directory. Let’s take a look:

```
$ sudo cat /var/lib/tor/radicle/hostname
1odmmeotgcfx65l5hn6ejkaruvai222vs7o7tmtllszqk5xbysolfdd.onion
```

We can copy this address to our clipboard, as we’ll need it to configure our Radicle node in the next steps.

> 🧠
>
> If you are a **macOS** user, install Tor via `brew install tor` and restart it via `brew services restart tor`.
>
> Use `mkdir -p -m 700 ~/.tor/radicle` to create your onion service directory.
>
> The Tor configuration file is located at `/opt/homebrew/etc/tor/torrc` and your `.onion` address can be found in `~/.tor/radicle/hostname`.
>
> Make sure to set the torrc HiddenServiceDir to `/Users/<user>/.tor/radicle`.
>
> If you are a **Debian** user who got Tor from a Debian repo, you may need to change the ownership of the `radicle` directory to the `debian-tor` user and group after creating it:
>
> ```
> $ sudo chown -R debian-tor:debian-tor /var/lib/tor/radicle
> ```

#### Configuring Radicle in _Mixed Mode_

Now that we have Tor properly set up, it’s time to configure the networking on our Radicle node to work with it. There are several configuration options available, but for our use case, we’ll implement the _Mixed Mode_ where only connections to `.onion` addresses go through Tor, while regular connections go through the regular internet. For our particular use-case, we’re trying to collaborate on a private repository, not to hide our IP address.

This configuration offers a balance between privacy and performance:

- It maintains low latency for regular public nodes.
- It allows connectivity through Tor, for nodes that are exposed as an onion service.

<figure class="diagram">
  <object
    type="image/svg+xml"
    data="/marketing/images/guides/tor-mixed-mode.svg"
    title="Diagram illustrating Tor Mixed Mode"></object>
  <figcaption>Tor <em>Mixed Mode</em>.</figcaption>
</figure>

To set this up, we first ensure that our Radicle node is stopped and then edit our node’s configuration file:

```
$ rad node stop
$ rad config edit
```

Under the `node` key in our configuration, we define a new `onion` attribute as follows:

```json
"node": {
    ...
    "onion": {
        "mode": "proxy",
        "address": "127.0.0.1:9050"
    }
}
```

This tells Radicle that for `.onion` addresses, we want to use the specified Tor _SOCKS5_ proxy address. This is the address on which the Tor daemon should be listening.

Next, we ensure our node is listening for incoming connections on port `8776`. This is the port that our Tor proxy will be using to bridge connections to our node, and is the same as the `HiddenServicePort` in our Tor configuration.

```json
"node": {
    ...
    "listen": ["0.0.0.0:8776"]
}
```

Finally, if we want our `.onion` address to be publicly _discoverable_ on the network, we add it to our `externalAddresses`, including the port. This will configure our node to advertise its `.onion` address to peers.

```json
"node": {
    ...
    "externalAddresses": [
        "1odmmeotgcfx65l5hn6ejkaruvai222vs7o7tmtllszqk5xbysolfdd.onion:8776"
    ]
}
```

> 👾 This is the `.onion` address we obtained earlier from the Tor `hostname` file.

Note that this is **optional**: if you don’t specify it here, peers will still be able to connect to you if they know your `.onion` address.

This configuration allows our node to use Tor for `.onion` connections while maintaining direct connections for regular traffic, balancing our privacy and performance needs.

#### Making connections

Now that we have updated our configuration, we can start up our node again:

```
$ rad node start
```

Since our node is online, Calyx can now continue to collaborate with us on `schrödingers-paradox`. He uses the `rad node connect` command to establish a direct connection with us:

<aside class="kicker"><code>Calyx</code></aside>

```
$ rad node connect z6Mkhp7VUnuufpvuQ3PdysShAjL86VDRUpPpkesqiysDBGs9@odmmeotgcfx65l5hn6ejkaruvai222vs7o7tmtllszqk5xbysolfdd.onion:8776
```

Notice that the connect address is a combination of the peer’s NID and its `.onion` address:

```
`<nid> @ <onion> : <port>`
```

Tor connections can take some time to establish as a route through the network of relays is computed. If you want your node to maintain a persistent connection to a peer even after your node is restarted, simply add the above address to the `connect` field in your node configuration:

```json
"node": {
    ...
    "connect": [
        "z6Mkhp7VUnuufpvuQ3PdysShAjL86VDRUpPpkesqiysDBGs9@odmmeotgcfx65l5hn6ejkaruvai222vs7o7tmtllszqk5xbysolfdd.onion:8776"
    ]
}
```

By leveraging Radicle’s private repositories and the Tor network, we protected our project’s confidentiality and stood resilient in the face of attacks on our infrastructure. When nodes are _Torrified_ like ours is, it’s also easy for other peers to establish connections directly with us, without requiring an intermediary seed node.

> 👾
>
> Of course, Tor can also be set up on a seed node for a persistent, private connection. Simply follow the previous Tor configuration steps on your seed node, and enable it as a system service that starts automatically on boot using `sudo systemctl enable tor`.

### Alternative Tor configurations

While Mixed Mode allows us to connect to Tor nodes and traverse NATs, there are two additional configurations that offer more comprehensive network privacy through Tor, at the expense of network latency. These options route all Radicle traffic through the Tor network, including to nodes that are not configured with Tor.

#### Full proxy mode

Full Proxy Mode routes all traffic through Tor for maximum anonymity.

<figure class="diagram">
  <object
    type="image/svg+xml"
    data="/marketing/images/guides/tor-full-proxy-mode.svg"
    title="Diagram illustrating Tor Full Proxy Mode"></object>
  <figcaption>Tor <em>Full Proxy Mode</em>.</figcaption>
</figure>

Instead of setting up a proxy only for `.onion` addresses, we set up a global proxy for all address types:

```json
"node": {
    ...
    "proxy": "127.0.0.1:9050"
}
```

Then, we change the `mode` for `.onion` addresses to `forward`, and remove the `proxy` configuration from there:

```json
"node": {
    ...
    "onion": {
        "mode": "forward"
    }
}
```

The `listen` and `externalAddresses` configuration doesn’t change.

#### Transparent proxy mode

If you’ve already set up a fully transparent Tor proxy on your network, simply omit the global proxy configuration, and set the `.onion` configuration to `forward`:

<aside class="span-2">Configuring a transparent Tor proxy for your entire
network is beyond the scope of this guide. If you’re interested in this setup,
consult the Tor Project documentation for detailed instructions.</aside>

```json
"node": {
    ...
    "onion": {
        "mode": "forward"
    }
}
```

This will configure your node to use your operating system’s DNS resolver to resolve `.onion` addresses.

> 👻
>
> Radicle’s codebase hasn’t yet undergone formal security audits. While we’re confident in its security, undiscovered vulnerabilities may exist. If you encounter any issues, we encourage you to report them to **security@radicle.xyz**.

[proto]: /guides/protocol/
[seeder]: /guides/seeder/
[zulip]: https://radicle.zulipchat.com/
[did]: https://en.wikipedia.org/wiki/Decentralized_identifier
[ssb]: https://en.wikipedia.org/wiki/Secure_Scuttlebutt
[bt]: https://en.wikipedia.org/wiki/BitTorrent
[tor]: https://www.torproject.org
[install-tor]: https://community.torproject.org/onion-services/setup/install/
[cyph-man]: https://www.activism.net/cypherpunk/manifesto.html
[heartwood]: https://radicle.network/nodes/seed.radicle.xyz/rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5
[cobs]: /guides/protocol/#collaborative-objects
[ch1]: /guides/user/#1-getting-started
[ch2]: /guides/user/#2-collaborating-the-radicle-way
[ch3]: /guides/user/#3-grow-resilient-with-seeding
[ch4]: /guides/user/#4-embracing-the-onion
