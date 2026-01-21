# Release Process

## Prerequisites

- Git signing configured via SSH:
  ```sh
  git config set gpg.format ssh
  git config set user.signingKey "key::$(rad self --ssh-key)"
  ```
- Working `podman` setup (see [Podman Setup](#podman-setup) below)
- Required tools: `podman`, `rad`, `sha256sum`

## Prepare Release

1. Create release branch:
   ```sh
   git checkout -b releases/<version>
   ```

2. Bump version in `radicle-httpd/Cargo.toml`

3. Update lockfiles:
   ```sh
   cargo build
   ```

4. Generate changelog:
   ```sh
   radicle-httpd/build/changelog >> radicle-httpd/CHANGELOG.md
   ```

5. Edit changelog and remove irrelevant entries

6. Commit release:
   ```sh
   git commit -m "httpd: Release <version>"
   ```

7. Push for review:
   ```sh
   git push rad HEAD:refs/patches
   ```

## Review & Merge

1. Wait for delegate approvals
2. Merge patch into `master`

## Tag Release

Create and sign the release tag:
```sh
build/tag <version>
```

Publish the tag to Radicle:
```sh
git push rad --tags
```

Request delegate approval to make the tag canonical:
```sh
rad sync
git push -f self <username>/tags/releases/<version>:refs/tags/releases/<version>
```

## Build Artifacts

Run the reproducible build (Linux x86_64 or macOS):
```sh
build/build
```

> **Note:** Artifacts are written to `build/artifacts/`. A tagged commit is required; versioning uses `git describe`.

## Upload Artifacts

```sh
SSH_LOGIN=<username> build/upload
```

> **Warning:** Uploading immediately publishes the release.

## Announce Release

1. Mark the previous release as resolved in Zulip `#Announcements`

2. Create a new announcement with the following template:

   **Topic:** `radicle-httpd <version>`

   **Message:**
   ````markdown
   # 👾 radicle-httpd <version>

   `radicle-httpd` <version> (<build-id>) is released.

   ## Installation

   Download binaries from:
   - https://files.radicle.xyz/releases/radicle-httpd/<version>
   - https://radicle.xyz/download

   ## Changelog

   <copy output from radicle-httpd/build/changelog>

   ## Checksums

   ```
   <copy output from radicle-httpd/build/checksums>
   ```

   :info: This release was built on <platform>. Build reproducibility across platforms is unsupported; checksums may differ if rebuilt elsewhere.
   ````

## Notes

> **Important:**
> - macOS binaries are unsigned and not notarized; download via CLI only
> - Build reproducibility across platforms is not guaranteed

## Podman Setup

We use `podman` for reproducible builds across machines. It's preferred over Docker because it runs without a daemon and doesn't require root access.

On first run, you may need to configure UID/GID ranges:

```sh
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER
podman system migrate
```
