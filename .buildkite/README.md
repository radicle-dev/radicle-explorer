# Buildkite CI

The Garden Buildkite integration stores a bare `buildkite-agent pipeline
upload`, so the agent finds `pipeline.yml` by its default name. The integration
makes one pipeline per repo, so all suites land in the same build.

## Cache volumes and artifacts

A **cache volume** carries state between builds. It is an input: content that a
step needs, but that the repo does not contain. Volume names are scoped to the
pipeline.

An **artifact** is a file that one build produces. It is an output: evidence for
a person to read in the Buildkite UI. The agent uploads artifacts whatever the
exit code of the step, so a failed step still reports its results.

The visual suite uses both. The volume `visual-snapshots` holds the baseline
images, which are gitignored and exist nowhere else. `artifact_paths` uploads
the actual, expected, and diff images that a failed comparison writes. The two
cannot be swapped: a volume is not visible in the UI, and an artifact does not
persist as an input to the next build.

A step can attach **one** volume only. This is why each volume holds every
input its steps need, rather than one volume per kind of input.

## One writer per volume

A job does not read its volume in place. It gets a private copy at start. That
copy becomes the version that the next job sees, but only when the job exits 0.
Every successful job is therefore a writer, whether or not it changed a file.

Two consequences follow.

Keep the volume names distinct across the uploaded files. A step that commits a
version discards what a concurrent step wrote to the same volume. This is why
`rust.yml` gives test, doc, and lint a separate volume each.

The visual suite keeps exactly one writer. `master` updates the baselines, and
`concurrency: 1` serializes the group. Other branches always exit non-zero, so
Buildkite discards their copy and no branch can republish a stale baseline set.
The branch step then cannot use the exit code to report the test result, so two
codes carry both: 100 means no differences, which `soft_fail` keeps green, and
any other non-zero code fails the build. An annotation reports the outcome in
both cases.

## Docker images

Two images cover all Node steps:

- `node:24-bookworm` tracks the major version in `.nvmrc` and the `engines`
  field in `package.json`.
- `mcr.microsoft.com/playwright:v1.61.1-noble` ships the browsers at
  `/ms-playwright`, so no step installs them. The tag must match
  `@playwright/test` in `package.json`. Playwright refuses browsers built for
  another version.

Cache paths are relative to the step working directory, which the docker plugin
mounts into the container. A `~`-rooted path does not work, because the agent
home is not visible inside a container. The Rust steps run on the agent instead,
so their `~`-rooted paths work.

## Node dependencies

All the Node steps share `deps` and need no ordering. A step only adds to the
paths it uses, so the content accumulates. When two concurrent steps add
something, one version wins and the next build adds the rest.

The `visual.yml` steps hold the baselines in their one volume slot, so
`visual-snapshots` carries the other two paths too.
