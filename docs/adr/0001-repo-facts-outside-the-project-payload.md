# Move repo-level facts out of the project payload

A repository need not carry a `xyz.radicle.project` payload — its Default Branch
can come from `xyz.radicle.crefs` alone. The API nevertheless reported COB counts
and the default branch only inside that payload, so such repositories were
unrenderable. We now report them at the top level of the repo response, as
`cobs` and `defaultBranch`, independent of which payloads exist.

The old location is kept in parallel rather than replaced, because the explorer's
seed picker lets any deployed frontend point at any seed: an instance deployed a
year ago routinely talks to a seed running today's httpd. A clean break would
have broken those instances with no warning.

## Considered options

**Replace the nested `meta` outright.** Rejected: only one codebase consumes this
API, but it is deployed as many independent instances that upgrade on their own
schedules, and any of them can be aimed at any seed.

**Keep both indefinitely.** Rejected: the nested `meta` is absent for exactly the
repositories this change exists to support, so anything still reading it degrades
over time rather than staying stable. An undated deprecation is permanent cruft
with a note attached.

## Forward compatibility

Forward compatibility here means an **already-deployed frontend talking to a
newer httpd**. It is the direction the seed picker makes unavoidable: any
explorer instance can be pointed at any seed, so we cannot assume a frontend and
the httpd it queries were released together. (The opposite direction — a current
frontend talking to an older httpd — is backward compatibility, handled by the
client falling back to the nested `meta`.)

**During expand (0.28.x through 0.29.x)** an older frontend is unaffected:

- `payloads["xyz.radicle.project"].meta` keeps its exact shape, `head` included.
  Anything reading it continues to work.
- `cobs` and `defaultBranch` are additive. The client schemas parse with Zod's
  default object behaviour, which strips unknown keys, so a frontend that
  predates these fields silently ignores them rather than failing to parse.

**At contract (0.30.0) that guarantee ends deliberately.** Older frontends
declare `meta` as required, with a required `head`, so removing it turns every
repo response into a schema violation — not a degraded render, a hard
`ResponseParseError`. Any instance not upgraded by then breaks against upgraded
seeds. That is the announced cost of the contract, and 0.30.0 is the notice.

**Two limits worth being explicit about.**

Expand preserves what older frontends could already do; it does not grant them
what this change adds. A repository with no project payload stays unrenderable
on an older frontend — its schema demands the payload — and because listings are
parsed as an array, one such repository still fails a whole page for those
clients. That was equally true before this change, so it is not a regression,
but it is also not something expand can fix.

There is no mechanism that will warn an operator before 0.30.0 breaks them.
`requiredApiVersion` looks like it should serve this purpose but does not: it
gates nothing, is only used to word an error message after a parse has already
failed, and is stale (`~0.18.0` against an httpd at 0.28.0). Fixing it was
considered and deliberately left out of this change. Until it is fixed, the
contract's only notice is this document and the release notes.

## Consequences

- `payloads` stays a verbatim passthrough of delegate-signed data. Nothing in it
  is ever deprecated by us — including the project payload's own short-form
  `defaultBranch`. Only the synthetic `meta` httpd injects alongside `data` is in
  scope for removal.
- `payloads["xyz.radicle.project"].meta` is to be removed in httpd **0.30.0**.
- Top-level `defaultBranch` is a qualified reference name (`refs/heads/main`),
  matching `xyz.radicle.crefs` and the keys of `refs`. The project payload's
  short form is qualified by the client when falling back to older nodes, so
  consumers see one spelling regardless of node version.
- `meta.head` has no top-level successor: the tip of the Default Branch is
  `refs[defaultBranch]`. Nodes older than 0.26.0 send no `refs`, so the client
  falls back to the nested `meta.head` until the contract lands.
- `defaultBranch` is reported only when `HEAD` resolves under `refs/heads/`. The
  explorer is branch-shaped end to end — branch icons, canonical badges, clone
  refnames, peer namespacing — so a tag-targeted `HEAD` is reported as no
  Default Branch rather than rendered as a branch it is not.
- Every member of `cobs` is independently optional, and absence means "this node
  cannot tell you" — an unreadable COB cache, or a build without the `artifacts`
  feature. A count is never defaulted to zero, because zero is a claim.
