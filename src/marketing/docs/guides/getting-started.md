---
title: Getting Started with Radicle
subtitle: A quick start guide to getting up and running with Radicle
---

<script>
  import Meta from '@app/marketing/Meta.svelte';
</script>

<svelte:head>
  <title>Getting Started | Radicle</title>
</svelte:head>

<Meta title="Getting Started | Radicle" description="A quick start guide to installing Radicle, creating your identity, and opening your first issue and patch." canonical="https://radicle.dev/guides/quick-start" />

# Getting Started with Radicle

This quick start guide will take you through the basic installation and usage of the Radicle toolchain.

## Installing the Radicle Toolchain

Radicle is an ecosystem for code collaboration over a decentralized network.
You can start by installing the command-line toolchain, which includes:

- the Radicle CLI (`rad`): the command-line interface for managing your identity, repositories, issues, and patches
- the Radicle node (`radicle-node`): the daemon that connects to the peer-to-peer network and replicates repositories
- a [Git remote helper] (`git-remote-rad`): the program Git calls to push and fetch from Radicle repositories with the `rad://` URL prefix.

An [installation script](#install-script) is provided, or you can use your favorite package manager from the list below.

You can check that you have successfully installed the toolchain and see what version you are using by running:
```
$ rad --version
```

### Install script

The quickest way to get started:

```
$ curl -sSLf https://radicle.dev/install | sh
```

This installs the toolchain into `~/.radicle/bin` and adds it to your `PATH`.

### From source

> Requires the Rust toolchain.

You can install the Radicle toolchain from source, by running the following
commands from inside this repository:

    cargo install --path crates/radicle-cli --force --locked --root ~/.radicle
    cargo install --path crates/radicle-node --force --locked --root ~/.radicle
    cargo install --path crates/radicle-remote-helper --force --locked --root ~/.radicle

Or directly from our seed node:

    cargo install --force --locked --root ~/.radicle \
        --git https://seed.radicle.dev/z3gqcJUoA1n9HaHKufZs5FCSGazv5.git \
        crates/radicle-cli crates/radicle-node crates/radicle-remote-helper

### Debian / Ubuntu (apt)

```
curl -LO https://radicle.dev/apt/radicle-archive-keyring.deb
sudo apt install ./radicle-archive-keyring.deb
echo "deb [signed-by=/usr/share/radicle/radicle-archive-keyring.asc] https://radicle.dev/apt release main" \
  | sudo tee -a /etc/apt/sources.list
sudo apt-get update && sudo apt-get install radicle
```

### Homebrew

```
$ brew install radicle
```

### Arch Linux (pacman)

Install [`radicle-bin`](https://aur.archlinux.org/packages?O=0&K=radicle) from the AUR.

### Nix

Install [`radicle-node`](https://search.nixos.org/packages?show=radicle-node&query=radicle) from Nixpkgs.

### Windows

Currently, the best way to install on Windows is building it [from source](#from-source).

### Binary download

Pre-built binaries and verification instructions are available on the [download page](/download).

## Creating Your Radicle Identity

Before using Radicle, you need to create an identity — a cryptographic key pair that uniquely identifies you and your node on the network:

```
$ rad auth
```

You will be prompted for an **alias** (a human-readable name for your node) and a **passphrase** to protect your key pair:

```
Initializing your radicle 👾 identity

✓ Enter your alias: alice
✓ Enter a passphrase: ********
✓ Creating your Ed25519 keypair...
✓ Adding your radicle key to ssh-agent...
✓ Your Radicle DID is did:key:z6Mkux1...
✓ You're all set.
```

Your [DID] (Decentralized Identifier) is your unique identity across the network.
You can view it at any time with `rad self`.

```
$ rad self --did
did:key:z6Mkux1...
```

> 👻
>
> Your passphrase and private key **cannot be recovered** if lost.
> Store them somewhere safe.
> Losing access to your key means losing your identity and any repositories associated with it.

> 🧠
>
> Radicle uses `ssh-agent` to cryptographically sign data that is pushed to the network.
> After you have initialized your identity, `rad auth` will allow you to add the private key to the `ssh-agent`.

> 🧠
>
> Radicle does not currently support using a single identity across multiple devices, nor rotating keys.
> Each device requires its own identity.

## Your Node and the Network

Radicle is a decentralized code forge — there is no central server.
You participate in the network by running a node, which connects to other nodes to discover and replicate repositories.

To start your node, run:

```
$ rad node start
```

You can then check that it is running and connected to other nodes:

```
$ rad node status
✓ Node is running with Node ID z6Mkux1… and listening on 0.0.0.0:8776.

╭────────────────────────────────────────────────────────────────────────╮
│ Node ID    Address                                    ?       Since    │
├────────────────────────────────────────────────────────────────────────┤
│ z6Mkv7G…   seed.example.xyz:8776                      ✓   ↗   3m       │
│ z6MkszH…   radicle.example.net:8776                   ✓   ↗   3m       │
│ z6Mko5W…   garden.example.org:8776                    ✗   ↗   2m       │
╰────────────────────────────────────────────────────────────────────────╯
```

The status table shows your connections to other nodes on the network.
A `✓` indicates that your node is connected to the other node.
Conversely, an `✗` indicates that you are disconnected from the other node.
The arrow `↗` indicates an outbound connection (a connection that you initiated), whereas `↘` indicates an inbound connection (one that the other node initiated).

You can stop your node at any time by running:

```
$ rad node stop
```

> 🧠
>
> It is also possible to manage your node as a [systemd] service.
> An example systemd user service is available in the [heartwood repository][systemd-service].

> 🧠
>
> Your node configuration lives in `~/.radicle/config.json` — see the [User Guide](/guides/user) for details on customizing your setup.

[systemd-service]: https://radicle.network/nodes/iris.radicle.xyz/rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5/tree/systemd/user/radicle-node.service

## Your First Repository

Radicle is built on top of Git, so any existing Git repository can be published to the network.
To publish your first repository, you can navigate to the repository and run `rad init`.

When initializing the repository, you will have an option to choose its “Visibility”.
A `public` repository means that this repository will be announced to the network by your node.
Once the project has been announced and replicated, **deleting this repository is nearly impossible**.

Instead, if this is a repository that you do not wish to announce to the network and/or wish to test out Radicle with,
then choose `private`.
Note that the workflow for a `private` repository differs from `public`, and you can see how it works by [following the User Guide](/guides/user#3-selectively-revealing-repositories).

```
$ cd /path/to/my-project
$ rad init

Initializing radicle 👾 project in .

✓ Name: my-project
✓ Description: A short description of my project
✓ Default branch: main
✓ Visibility: public
✓ Project my-project created.

Your project's Repository ID (RID) is rad:z3gqc…
You can show it any time by running `rad .` from this directory.

✓ Project successfully announced to the network.
```

<aside>The <code>rad init</code> command provides a setup wizard and will prompt you for these details.</aside>

Your repository is now on the Radicle network!
You can see which nodes have replicated your repository by using `rad sync status`.

```
$ rad sync status
╭──────────────────────────────────────────────────────────────────╮
│ Node ID          Alias                    ?   SigRefs   Since    │
├──────────────────────────────────────────────────────────────────┤
│ (you)            alice                    ✓   a1b2c3d   3m ago   │
│ z6Mkv7G…         seed.example.xyz         ✓   a1b2c3d   2m ago   │
│ z6MkszH…         rad.example.net          ✓   a1b2c3d   2m ago   │
│ z6Mko5W…         garden.example.org       ✗   f4e5d6c   1d ago   │
╰──────────────────────────────────────────────────────────────────╯
```

A `✓` means the node is in sync with your latest changes, while `✗` means it is out of sync.

To push new changes, just use Git as usual:

```
$ git push
```

If you ever think the node has not announced changes, or that it needs to fetch changes, then you can always manually synchronize with the network:

```
$ rad sync
```

> 🧠
>
> You can also set your repository’s visibility to `private` during `rad init`.
> Private repositories are only replicated to nodes you explicitly allow.
> See the [User Guide](/guides/user#3-selectively-revealing-repositories) for details on managing access.

## Cloning a Repository

You can clone any repository from the network using its Repository ID (RID).
For example, to clone Heartwood, the Radicle protocol implementation itself:

```
$ rad clone rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5
✓ Seeding policy updated for rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5 with scope 'followed'
✓ Fetching rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5 from z6Mkk4R…SBiyXVM..
✓ Fetching rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5 from z6Mksmp…1DN6QSz..
✓ Creating checkout in ./heartwood..
✓ Repository successfully cloned under ./heartwood/
╭────────────────────────────────────╮
│ heartwood                          │
│ Radicle Heartwood Protocol & Stack │
│ 8 issues · 14 patches              │
╰────────────────────────────────────╯
```

This fetches the repository from connected peers and creates a working copy, just like `git clone`.
The difference is that Radicle will first ask the network for the repository, and clone it from the first available node.

## Your First Issue

Once you are working within a Radicle repository, it is easy to open an issue, whether your node is running or you are offline.

Running `rad issue open` will open your editor, and you will be prompted to write the title and body of the issue.
Similar to commit messages, the first line is taken as the title of the issue, and below that is the body.

You can easily list issues using `rad issue list`, or show an issue with `rad issue show`.

Here is an example of an issue in the `heartwood` repository:

```
╭───────────────────────────────────────────────────────────────────╮
│ Title   contributing: Feedback from the community                 │
│ Issue   b163597fae51a3f076d654294f695803dd5e221c                  │
│ Author  ade z6MkwGo…yS2aagA                                       │
│ Status  open                                                      │
│                                                                   │
│ Derived from the Zulip conversation.                              │
│                                                                   │
│ - [ ] First contribution guide                                    │
│ - [ ] "good first issues" label usage                             │
│ - [ ] Issue / Patch templates                                     │
│ - [ ] Source code overview map                                    │
│ - [ ] Increase time-to-first-feedback for new contributors        │
│ - [ ] Frequent and recurring open session for community to attend │
│ - [ ] Local CI checks                                             │
╰───────────────────────────────────────────────────────────────────╯
```

## Your First Patch

At this stage, you will likely want to propose changes to a repository.
As mentioned before, Radicle is built on top of Git, which means your `git` (or `jj`) workflow does not need to change too much.

The `git-remote-rad` binary allows you to push changes to a special reference called `refs/patches` in the `rad` remote.
When the remote helper sees this happening it will prompt you with your editor to write a title and body for the patch.
Similar to commit messages, the first line is taken as the title of the issue, and below that is the body.

The most common Git revision to push to `refs/patches` is the `HEAD` revision.
This will create a patch starting from the commit you are currently on, and the base of the patch will be the latest commit of your default branch (chosen during `rad init`).
From your command line you would run:

```
$ git push rad HEAD:refs/patches
```

In fact, this is so common that we would recommend adding the following to your `.git/config`:

```
[alias]
    patch = push self HEAD:refs/patches
```

Which allows you to create a new patch by running `git patch`.

At any point, you can view a repository’s patches using `rad patch`, or you can show a specific one with `rad patch show`.

Here is an example of a patch in the `heartwood` repository:

```
╭──────────────────────────────────────────────────────────────────────────╮
│ Title    fetch: Update gix packages                                      │
│ Patch    76f1369e7bab4126e97b175bcddea58f55f3c741                        │
│ Author   fintohaps (you)                                                 │
│ Head     aed9c2603884a8cd76c433262657d72289bd36bb                        │
│ Base     caee776c388ffac2ea55cc9d1e3d7fa108ca6df5                        │
│ Commits  ahead 1, behind 0                                               │
│ Status   open                                                            │
│                                                                          │
│ Several vulnerabilities were found in the gix packages[^1][^2][^3].      │
│                                                                          │
│ Update the packages to their latest versions which include the fixes.    │
│                                                                          │
│ The only required change is in `ls_refs`.                                │
│ `RefPrefixes` was introduced and this fixes the issue with `ref-prefix`. │
│ This should now improve the ls-refs stage and only return references     │
│ that the client is asking for, as opposed to all references.             │
│                                                                          │
│ [^1]: https://github.com/radicle-dev/heartwood/security/dependabot/38    │
│ [^2]: https://github.com/radicle-dev/heartwood/security/dependabot/39    │
│ [^3]: https://github.com/radicle-dev/heartwood/security/dependabot/36    │
├──────────────────────────────────────────────────────────────────────────┤
│ aed9c26 fetch: Update gix packages                                       │
├──────────────────────────────────────────────────────────────────────────┤
│ ● Revision 76f1369 @ caee776..aed9c26 by fintohaps (you) 5 hours ago     │
╰──────────────────────────────────────────────────────────────────────────╯
```

We never write the perfect set of changes the first time (or at least I do not), so you may need to update a patch after you have modified or added new commits.
The process is similar to before; however, the reference you target with the remote helper should now contain the identifier of the patch.
For example, to update the patch above, you would run:

```
$ git push rad HEAD:patches/76f1369e7bab4126e97b175bcddea58f55f3c741
```

For convenience, another way is to create a branch called `patches/76f1369e7bab4126e97b175bcddea58f55f3c741` and run:

```
$ git push rad patches/76f1369e7bab4126e97b175bcddea58f55f3c741
```

Alternatively, you can create an upstream branch that points to `patches/76f1369e7bab4126e97b175bcddea58f55f3c741`.
In fact, `rad patch checkout` will do this for you.

## Next Steps

Now you know enough about Radicle to be dangerous!

If you want to learn more about how to collaborate, set up your own seed, or dive into the protocol details, then here are some useful links:

- **Collaborate** — Learn about issues and patches in the [User Guide](/guides/user#2-collaborating-the-radicle-way)
- **Install [Radicle Desktop]** — A simple, intuitive way to interact with the Radicle network
- **Run a seed node** — Help the network by seeding repositories with the [Seeder Guide](/guides/seeder)
- **Understand the protocol** — Dive into how Radicle works in the [Protocol Guide](/guides/protocol)

We are a growing community who love to help out when we can.
If you need help or want to chat to us further about everything Radicle, join us on [Zulip](https://radicle.zulipchat.com)!

[Git remote helper]: https://git-scm.com/docs/gitremote-helpers
[DID]: https://www.w3.org/TR/did-1.0/
[systemd]: https://systemd.io/
[Radicle Desktop]: /install
