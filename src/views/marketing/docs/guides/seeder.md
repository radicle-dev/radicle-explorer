---
title: Radicle Seeder Guide
subtitle: How to run a Radicle seed node
---

<script>
  import Meta from '@app/views/marketing/Meta.svelte';
</script>

<svelte:head>

  <title>Seeder Guide | Radicle</title>
</svelte:head>

<Meta title="Seeder Guide | Radicle" description="Run a public seed node to keep repositories available 24/7." />

# Radicle Seeder Guide

To seed is to give back. By seeding repositories on the Radicle network, you offer bandwidth, storage, and data availability to Radicle users.

In this guide, we’ll go through the various steps required to set up a Radicle _seed node_ on a Linux system. Seeding only requires an internet connection, a public, static IP address, and modest hardware.

We’ll cover public seed nodes with an _open_ seeding policy, as well as community seed nodes with more _selective_ policies.

## Introduction

The term _seed node_ originally comes from [BitTorrent][bittorrent]. In the BitTorrent protocol, nodes that possess the data for a given torrent file and begin uploading it to peers are called _seeders_.

In Radicle, while all users contribute to the network by seeding data, the term _seed node_ specifically refers to a server that is accessible through the internet and hosts content for peers. Seed nodes need to remain online and accessible to provide their service to the network.

### The need for seed nodes

While a peer-to-peer network without seed nodes is feasible, it is impractical. This is because regular “user” nodes go online and offline all the time, so finding a user from which to download a certain piece of content can be challenging, or even impossible if all users with that content are offline.

Therefore, a healthy peer-to-peer network necessitates at least _some_ highly available nodes that participate in the network like regular peers, but seldom go offline. These are called seed nodes.

> By running a _permissive_ node (see below for further explanation), you are contributing to the growth and resilience of the Radicle network, but it is important to be aware of the potential implications of hosting data in a permissionless network. Use your best judgment. If you have any concerns, consider starting with the selective seeding policy, described in the following section, and expanding as you become more comfortable with the network.

## Getting Started

For this guide, we’ll focus on setting up a seed node using `systemd`. If you’re running a different service manager, you should be able to follow along just fine, as we’ll be explaining the steps. Using a service manager is not required, but highly recommended.

### What you will need

To run a Radicle seed node, you will need a server with:

- `curl`
- `git`
- `systemctl` version `232` or newer
- `sudo` privileges
- A DNS name pointing to your server

### Server

If you already have a VPS (Virtual Private Server) or home server running a Linux distribution, you should be all set. If not, any VPS will do. Between 1-2GB of RAM with a shared CPU and 10GB of disk space should be enough to get started. Once you’ve logged into your server, proceed with user setup and installation. For this setup process, you’ll need `sudo` capabilities.

> **Tip**: If you have trouble choosing a VPS, we recommend getting a small instance on [Hetzner][hetzner] or [Digital Ocean][do]. These are priced fairly and have good documentation and support.

[hetzner]: https://www.hetzner.com/
[do]: https://www.digitalocean.com/

### User setup

If you wish to create a new user under which to run the seed node services, this is the time. In this guide, we’ve chosen to run our services under a user called `seed`. Radicle data and configuration will be stored under this user’s home folder. This ensures that if your Radicle services were to be compromised, the attacker would have very limited access to your system.

Here’s an example user setup with `seed` as the user and group name:

```bash
sudo groupadd --system seed
sudo useradd --system --gid seed --create-home seed
```

If you’re administering your server via a non-root account, you’ll want to add it to the `seed` group as well:

```bash
sudo usermod -a -G seed $(whoami)
```

### Installation

For a seed node, you will need to install at minimum the Radicle CLI (`rad`), and network daemon (`radicle-node`).

To install these, head over to the [download](/install#cli) page and follow the instructions there. You will have to download, verify and extract the binaries and manuals to your preferred location.

For this guide, we recommend installing Radicle under `/usr/local`. This will require you to have write permissions to `/usr/local/bin` and `/usr/local/man`. You can give yourself these permission by changing ownership of these directories to the current user and group:

```bash
sudo chown $(whoami): /usr/local/{bin,man,man/man1}
```

You should then be able to extract the archive you downloaded and verified with:

```bash
tar -xvJf <archive> --strip-components=1 -C /usr/local/
```

Finally, login as the `seed` user and proceed with installation:

```bash
sudo su seed
```

To check your installation, run the `rad` command, and confirm where your Radicle home is with the `rad path` command.

To offer web browsing and HTTP access to your seed node, you will additionally need to run `radicle-httpd`, the HTTP daemon. We’ll cover this after we’ve set up our basic node.

### Creating a profile

Once the Radicle binaries are installed, we can create a Radicle _profile_. This consists of an Ed25519 key pair and a directory under which Radicle stores user data.

```bash
rad auth --alias seed.radicle.example
```

The above command will create a profile with the given node _alias_ in `~/.radicle`, or `$RAD_HOME` if set. We recommend setting your alias to the domain name that points to your node’s host.

For seed nodes, it’s not generally necessary to set up a passphrase for your key, so you can simply skip that prompt by pressing _enter_.

<aside>
Seed nodes do not typically sign any permanent artifacts with their key. It
is mainly used for securing connections with peers.
</aside>

> **Tip**: If you wish to set a passphrase anyway, you will have to set the `RAD_PASSPHRASE` environment variable in your node’s `systemd` unit file.

Once your profile is initialized, a decentralized identifier (DID) will be output. The part after the `did:key:` prefix is your Node ID. This is how your seed node will be identified on the network. The Node ID is the public part of the Ed25519 key pair generated above, via `rad auth`.

You can view information about your Radicle profile by running `rad self`. The `--nid` and `--alias` flags can be used to return the Node ID and alias.

## Configuring Your Node

There are a couple of things we need to set up a seed node.

First, we must set the node’s default _seeding policy_.

The seeding policy tells the node which repositories and reference namespaces to fetch and offer to the network. For _public seed nodes_, a _permissive_ seeding policy is often set, such that _all data_ on the network is stored and replicated.

Second, we must set an _External Address_ for the node to be reached on the network. This address will be advertised to peers, allowing them to connect to your seed node. Generally, this will be a DNS name with port `8776`, for example `seed.radicle.example:8776`.

Here’s an example minimal configuration file with a permissive seeding policy and an external address set:

```json
{
  "node": {
    "alias": "seed.radicle.example",
    "listen": ["0.0.0.0:8776"],
    "externalAddresses": ["seed.radicle.example:8776"],
    "seedingPolicy": {
      "default": "allow",
      "scope": "all"
    }
  }
}
```

> In the above example the server listen to any IPv4 interface. If your host supports only IPv6 or if you want to support both IPv4 and IPv6, replace `0.0.0.0` with `[::]`.

Your node is configured with a file named `config.json` in your Radicle home directory. You can get the full path of the config file with the `rad self --config` command. Additionally, you can output the current configuration with `rad config`. Attributes that aren’t set in `config.json` will take on default values. You can open your configuration file for editing with `rad config edit`.

Let’s start by configuring your seeding policy.

### Seeding policies

The most important setting when it comes to seeding is your _default seeding policy_. This setting will determine what content your seed node fetches and replicates on the network when it encounters a repository it doesn’t know or hasn’t been given special instructions for.

The setting is configured under the `node.seedingPolicy` field in your configuration (`~/.radicle/config.json`). You can open your configuration file directly using the `rad config edit` command, or use your preferred editor. You can also enter the following command to display your current default policy:

```bash
rad config get node.seedingPolicy
```

When a seeding policy is _not set_ for a specific repository or node, the default policy is applied, hence the importance of this setting.

Broadly, there are two options for the default policy.

#### A _permissive_ seeding policy

A _permissive_ or “open” policy is said to be _fully-replicating_, meaning your seed will try to have a full copy of all repository data available on the network.

An example of a node with this policy is `iris.radicle.xyz`, a node operated by the Radicle team, for the Radicle community.

This is a good default for seeders who want to support the network without having to think about it too much.

Set `node.seedingPolicy.default` to `allow` and `node.seedingPolicy.scope` to `all` to configure your node this way.

```json
{
  "node": {
    ...
    "seedingPolicy": {
      "default": "allow",
      "scope": "all"
    }
  }
}
```

#### A _selective_ seeding policy

A _selective_ or “restricted” policy requires you, the operator, to _manually allow repositories to be seeded_. This means that the node will ignore all repositories, except the ones that are pre-configured to allow seeding.

An example is the `seed.radicle.xyz` node, which only seeds Radicle team repositories.

This is a good policy for communities, teams, companies and individuals who want to limit the data hosted by their seed, or node operators who want to require some form of authentication or payment for seeding.

Set `node.seedingPolicy.default` to `block` to enable this, and call `rad seed` to configure `allow` policies for specific repositories you want to seed. Your seed node won’t seed anything until you explicitly allow it to.

```json
{
  "node": {
    ...
    "seedingPolicy": {
      "default": "block"
    }
  }
}
```

#### Setting a repository’s seeding policy

To override the default policy for a specific repository, the `seed` or `block` commands are used.

For example, in the case of a _permissive_ seeding policy, where the default is `allow`, we can explicitly _block_ certain repositories from being seeded:

```bash
rad block rad:z9DV738hJpCa6aQXqvQC4SjaZvsi
```

This will override the default policy and ensure that this repository is never replicated on your node.

On the other hand, in the case of a _selective_ seeding policy, where the default policy is `block`, we can decide to _allow_ a repository to be seeded by calling `rad seed`. For example:

```bash
rad seed rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5
```

This will override the default `block` rule for this one specific repository.

To remove an override configured for a repository in either case, `unseed` can be used:

```bash
rad unseed rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5
```

For both cases, the default policy will apply if a seeding policy is not defined for a repository.

#### Viewing seeding policies

You can view your node’s _default policy_ by entering `rad config get node.seedingPolicy`.

To view the policy of a specific repository, use the `rad inspect` command. For example:

```bash
rad inspect rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5 --policy
```

This will return the default policy if you haven’t set a specific policy for that repository.

Finally, to view all seeding policies that have been configured on repositories, simply enter `rad seed` with no options.

### Addressing

Now that you’ve configured your seeding policy, it’s time to consider how your node is addressed on the network.

#### Your external address

You should set your node’s external address. This is a public address, typically a DNS name that points to your node. Though a single external address is sufficient, you are free to set up to 16 external addresses.

You’ll find this setting in your configuration file, under `node.externalAddresses`. External addresses are JSON strings of the form `<host>:<port>`, for example `seed.radicle.example:8776`, where `<host>` is a DNS name, and `<port>` is usually `8776`.

```json
{
  "node": {
    ...
    "externalAddresses": ["seed.radicle.example:8776"]
  }
}
```

Once at least one external address is set, you’re ready to start your node for the first time.

#### Your node address

For others to be able to connect to your node directly, they need your _Node Address_. This is a combination of your Node ID and your External Address.

If you’ve configured one or more external addresses, simply entering the following command from the `seed` user will output your node addresses:

```bash
rad node config --addresses
```

Share this with others, and they will be able to connect to your node using `rad node connect <address>`, or by adding your address to their configuration, under the `node.connect` field.

#### DNS-Based Service Discovery

If you would like to facilitate discovery of your node via DNS, you can do so via [DNS-Based Service Discovery (DNS-SD)][dnssd]. This requires you to set three DNS records per node you are running.

1.  A `SRV` record, which communicates the external address of your node (DNS name and TCP port number).
2.  A `TXT` record, which communicates the Node ID of your node.
3.  A `PTR` record, which makes the other two records discoverable.

Taken together, the `SRV` and `TXT` records contain all the information required to reconstruct your node address.

Suppose the node address you want others to discover is `z6MkXB…Z6sTAz@seed.radicle.example:58776` and the domain name you want it to be discovered for is `radicle.example`, then the three DNS records required are:

```
seed._radicle-node._tcp.radicle.example.  3600  IN  SRV  32767 32767 58776 seed.radicle.example.
seed._radicle-node._tcp.radicle.example.  3600  IN  TXT  "nid=z6MkXB…Z6sTAz"
_radicle-node._tcp.radicle.example.       3600  IN  PTR  seed._radicle-node._tcp.radicle.example.
```

With most nameservers, there are shorter versions to denote these records, like dropping TTL and record class, as well as abbreviating names by omitting the origin. The variant above is purposely verbose to avoid ambiguity. Of course, you may choose different values for the TTL.

With these records set, anyone can discover your nodes from the domain name `radicle.example`. This method of discovery is ideal if you maintain a set of nodes, and want to have them discovered by a group of people, such as your collaborators or coworkers. It also works if your nodes addresses and/or ports change frequently.

To find out more about the the interpretation of `SRV` records, refer to [RFC 2782][srv].

## Running Your Node

Before setting up your node as a system service, it’s a good idea to run it once to make sure everything is working properly. Enter the following command to start your node in the foreground:

```bash
rad node start --foreground
```

You should see log output as your node starts to sync with the network. If there are any errors or issues connecting to the network, you should see errors in the output.

If the node started without problem, stop it with `Ctrl-C`, and exit the `seed` session by entering:

```bash
exit
```

This should return you to the original session you opened via SSH.

### Configuring your node’s system service

Though it’s possible to simply run the Radicle node as a background process, it’s recommended to set up a service to ensure the node is started on boot.

In this guide, we will only cover setup using `systemd`, but the process is fairly similar for other service managers.

The first thing to do is to get a copy of the [`radicle-node.service`][radicle-node] unit file. Place it in `/etc/systemd/system/radicle-node.service` for it to be found by `systemctl`:

```bash
curl -sSL https://seed.radicle.xyz/raw/rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5/570a7eb141b6ba001713c46345d79b6fead1ca15/systemd/radicle-node.service -o /etc/systemd/system/radicle-node.service
```

Make sure it fits your needs by editing the file directly, or creating an override using `systemctl edit`.

> The downloaded `systemd` unit file is configured to run your node process as the `seed` user and group, for security reasons. If you set up a different user or group name, or set a passphrase during `rad auth`, or if you want to listen on an IPv6 interface, you will have to make edits to this file before proceeding.

When you’re ready, you can **enable** and **run** the service:

```bash
systemctl enable --now radicle-node
```

### Checking your node status

To check the service status of your node, run:

```bash
systemctl status radicle-node
```

Besides using `systemctl status`, you can also check your node’s status using `rad node status`. This will give you information on the peers connected to your node. You’ll have to run this as the `seed` user, like so:

```bash
sudo -u seed -- rad node status
```

To tail your node’s logs, use:

```bash
journalctl --unit radicle-node --follow
```

### Changing your node’s configuration

If you change your node’s configuration while the node is running, you’ll need to restart your node for the changes to take effect.

First, verify that the new configuration is valid by running `rad config`, then restart your node with:

```bash
systemctl restart radicle-node
```

### Securing the `seed` user

Now that your node is configured and working, you can secure the `seed` user by disabling shell access. This is optional, though recommended.

```bash
chsh -s /usr/sbin/nologin seed
```

This will prevent anyone from logging in as the `seed` user. Note that from this point onwards, if you chose to disable the `seed` user’s shell, you’ll have to run all commands via `sudo`, like we’ve been doing so far.

> To facilitate running commands as the `seed` user by simply using `rad` as usual, add this alias to your admin shell’s init scripts:
>
> ```bash
> alias rad='sudo -u seed -- rad'
> ```

### Firewalls

If you are running a firewall, ensure that port `8776` is open for TCP connections. This will allow inbound connections to your node.

> It’s recommended to run a basic firewall to further lock down your server, using something like `iptables`, though this is out of scope for this guide.

## Running the HTTP Daemon

In the prior sections, we set up `radicle-node`, a background process that actively and continuously discovers and replicates repositories on the network, based on your seeding policy. This node allows users to collaborate, host, share, and publish repositories on the network via the Radicle CLI or any compatible application. However, at this stage, the repositories on your seed node cannot be browsed or viewed without cloning them first, using the Radicle CLI. To enable web browsing of the content of your seed node, the Radicle HTTP Daemon `radicle-httpd` needs to be deployed alongside `radicle-node`.

The HTTP Daemon is a background process that functions as a _gateway_ between the Radicle protocol and the HTTP protocol. It is configured to have direct read-only access to the node’s storage and database and expose this data via an HTTP JSON API. For seed nodes, the HTTP Daemon is always configured as a _read-only_ service over the node’s state.

### Installation

Head over to the [download](/install#cli) page, and follow the instructions there. The process is the same as for the Radicle Node. You will have to download, verify and extract the binary (`radicle-httpd`) and manuals to your preferred location.

We recommend installing the daemon under `/usr/local`, just as we did for the node.

### Configuring your HTTP daemon’s system service

As with `radicle-node`, we can start by downloading an example `systemd` unit file for the daemon:

```bash
curl -sSL https://seed.radicle.xyz/raw/rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5/570a7eb141b6ba001713c46345d79b6fead1ca15/systemd/radicle-httpd.service -o /etc/systemd/system/radicle-httpd.service
```

Make sure it fits your needs by editing the file directly, or creating an override using `systemctl edit`.

> In this guide, all `systemd` unit files are configured to run the process as the `seed` user and group, for security reasons. If you set up a different user or group name, you will have to make edits to these files before running the services.

Then, **enable** and **run** the service:

```bash
systemctl enable --now radicle-httpd
```

You can check that your node service is running with:

```bash
systemctl status radicle-httpd
```

You can query the API with `curl` to ensure everything is working properly:

```bash
curl http://127.0.0.1:8080/api/v1
```

### Adding support for HTTPS

For your HTTP Daemon to be accessible from a frontend such as <https://radicle.network>, it needs to respond to HTTPS requests. To do this, we recommend using [Caddy][caddy].

Start by installing `caddy`; most Linux distributions have a package you can install. If you are using Debian or Ubuntu, you can run:

```bash
apt-get install caddy
```

If you’re having trouble installing Caddy, check the [installation guide][caddy-install]. Once installed, run `caddy version` to ensure that everything was installed correctly.

```
caddy version
v2.6.4 h1:2hwYqiRwk1tf3VruhMpLcYTg+11fCdr8S3jhNAdnPy8=
```

Then, download the `caddy` unit file from Caddy’s GitHub repository:

```bash
curl https://raw.githubusercontent.com/caddyserver/dist/master/init/caddy.service -o /etc/systemd/system/caddy.service
```

Edit the file and change the `User` and `Group` attributes to `seed`, as we have for the other services. Also ensure that `ExecStart` and `ExecReload` are set to the correct path. You can find the path under which `caddy` is installed by running the `which caddy` command.

Finally, edit or create the `Caddyfile` at `/etc/caddy/Caddyfile`, and _replace_ its contents with the following configuration, using the correct domain name for your seed:

```
seed.radicle.example {
    reverse_proxy 127.0.0.1:8080
}
```

This will proxy all HTTPS requests from port `443` to your HTTP daemon running on port `8080`. Make sure your firewall has port `443` open for incomning TCP connections.

Finally, enable and start the Caddy service:

```bash
systemctl enable --now caddy
```

If you encounter issues setting up Caddy, you can try following their [guide][caddy-guide] instead.

If everything worked, you should now have HTTPS support for your daemon. To check, run the following command, replacing `seed.radicle.example` with your seed’s domain:

```bash
curl https://seed.radicle.example/api/v1
```

You should now be able to visit your seed node via any Radicle web frontend as well. For example, <https://radicle.network/nodes/seed.radicle.example>.

> On some distributions, installing `caddy` will start the system service automatically. If you’re not able to connect to your HTTP daemon from the outside, try running `systemctl reload caddy` after you’ve updated the configuration.

## You’re All Set

If you got this far, congratulations, you now have a Radicle seed node up and running!

Come join us on our community chat and tell us about your seed node on the [#seeds][zulip] channel.

[radicle-node]: https://seed.radicle.xyz/raw/rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5/570a7eb141b6ba001713c46345d79b6fead1ca15/systemd/radicle-node.service
[caddy]: https://caddyserver.com/
[caddy-guide]: https://caddyserver.com/docs/running#linux-service
[caddy-install]: https://caddyserver.com/docs/install
[zulip]: https://radicle.zulipchat.com/#narrow/stream/384534-seeds
[bittorrent]: https://en.wikipedia.org/wiki/BitTorrent
[dnssd]: https://datatracker.ietf.org/doc/html/rfc6763
[srv]: https://datatracker.ietf.org/doc/html/rfc2782

<style>
  aside {
    background: var(--color-background-alt, #f5f5f5);
    padding: 1rem;
    border-radius: 0.5rem;
    margin: 1rem 0;
    font-size: 0.9em;
  }
</style>
