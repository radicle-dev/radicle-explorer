# Merge and review fixes: summary

I resolved the conflicts and fixed all four open findings, in five jj commits. Two follow-up commits came after. All checks pass.

## Merge (`ryrosrrr`)

- httpd now sends the release counts by bucket (delegate, delegate redacted, other, other redacted) in the top-level `cobs`. The legacy `meta` gets them from a copy of `cobs`.
- I kept API version 7.0.0, because the new releases shape is a breaking change.
- `REFS_HEADS` from the payload branch is kept.
- The client accepts either a single release count or the buckets, in both `cobs` and the legacy `meta`. The UI now reads release counts from `cobs`.
- I changed the httpd test expectations for `cobs.releases` from a number to the buckets.

## Review fixes, one commit each

- **Item 7 (`zvzqystq`):** on older nodes, `cobs` now takes only `patches`, `issues` and `releases` from `meta`, so `head` no longer gets in.
- **Items 4 and 6 (`pnspoykw`):** source and history pages now need the default branch only when the URL gives no revision. `loadHistoryView` returns `Promise<RepoLoadedRoute>` again. `parseRevisionToOid` now takes one revision. Because of this, `defaultBranch` can be `undefined` in the source and history routes.
- **Item 5 (`ozxnyypx`):** when the node reports no count, "Show more" appears if every page loaded so far was full.
- **Notes (`xlmqrqoq`):** I took the fixed findings and the checks list out of `REVIEW-NOTES.md` and added one new decision for you, below.

## Follow-ups

- **`vnpwyzkk`:** the client schema now treats `meta` as optional. Without this, this explorer would fail on every repo with a project payload once httpd 0.30.0 removes `meta`.
- **`npvrxsnm`:** the landing page carousel now shows repos without a project payload. It uses the RID as the name and leaves the description empty.

## Decision for you

The legacy `meta.releases` now holds the buckets, not a number. An explorer older than this one expects a number there, so it cannot read the repo at all from a node with this change. The artifact branch made this change already, but it now also reaches the legacy `meta`. If older explorers must keep working, httpd can put the bucket total in `meta` as a single number.

## Side note: no "Show redacted" on the releases list

The releases list has no "Show redacted" button. A release whose artifacts
are all redacted by a trusted party is hidden, and the user cannot reveal
it.

- `Releases.svelte` renders no toggle.
- `releasesQuery` never sends `showRedacted`.
- `delegateRedacted` and `otherRedacted` are parsed in `releaseCountsSchema`
  (`http-client/lib/repo.ts`) but nothing reads them.
- The only "Show redacted" button is in `Release.svelte`. It counts
  artifacts in one release, not releases.

Possible fix:

- Add a toggle to `Releases.svelte`. Show it when the count for the active
  scope is above 0.
- Pass `showRedacted: true` through `releasesQuery` when the toggle is on.
  Use a route param so the list reloads.
- Treat the counts as optional. Hide the button on older nodes that do not
  send them.

## Checks

- cargo clippy, fmt and test: pass
- `npm run check`: pass
- Unit tests: pass (153)
- http-client tests: pass against the stable httpd (23, 1 skipped) and the local build (24)
- E2E: pass against the stable httpd (86, 9 skipped) and the local build (94, 1 skipped)

For the follow-ups, I ran `npm run check`, the unit tests, the http-client tests against the stable httpd, and the marketing e2e tests. All pass. I did not run the full e2e suite again.

To run the tests, I moved `config/local.json` aside and put it back afterwards. `build/` still has the test config, so rebuild it before you use the preview server for anything else.

## Repo response changes

This change is the first use of the expand and contract pattern in [ADR 0001](docs/adr/0001-expand-and-contract-api-changes.md).

A repository does not need an `xyz.radicle.project` payload. Its default branch can come from `xyz.radicle.crefs` alone. But the API reported COB counts and the default branch only inside the project payload, so the explorer could not render such repositories. The repo response now reports them at the top level as `cobs` and `defaultBranch`, whichever payloads exist.

### Affected endpoints

httpd builds one repo object in `repo_info` ([api.rs](crates/radicle-httpd/src/api.rs)). Three endpoints return it:

| Endpoint | Client function | Returns |
| --- | --- | --- |
| `GET /repos/{rid}` | `repo.getByRid` | one repo |
| `GET /repos` | `repo.getAll` | a list of repos |
| `GET /delegates/{did}/repos` | `repo.getByDelegate` | a list of repos |

The client parses all three with `repoSchema` ([repo.ts](http-client/lib/repo.ts)). The schema transform fills `cobs` and `defaultBranch` from the nested `meta` when an older node leaves them out, so the views read only the top-level fields. The client accepts a project payload without `meta`, so it keeps working after the contract.

### Response

Before:

```json
{
  "rid": "rad:z3gqc...",
  "payloads": {
    "xyz.radicle.project": {
      "data": { "name": "heartwood", "description": "...", "defaultBranch": "main" },
      "meta": {
        "head": "4d3f...",
        "issues": { "open": 3, "closed": 10 },
        "patches": { "open": 1, "draft": 0, "archived": 2, "merged": 8 },
        "releases": 3
      }
    }
  },
  "delegates": [...], "threshold": 1, "visibility": {...}, "seeding": 4, "refs": {...}
}
```

After (API 7.0.0):

```json
{
  "rid": "rad:z3gqc...",
  "payloads": { "xyz.radicle.project": { "data": {...}, "meta": {...} } },
  "cobs": {
    "issues": { "open": 3, "closed": 10 },
    "patches": { "open": 1, "draft": 0, "archived": 2, "merged": 8 },
    "releases": { "delegate": 2, "delegateRedacted": 0, "other": 1, "otherRedacted": 0 }
  },
  "defaultBranch": "refs/heads/main",
  "delegates": [...], "threshold": 1, "visibility": {...}, "seeding": 4, "refs": {...}
}
```

| Field | Change |
| --- | --- |
| `cobs` | **New.** Always present. It holds the counts that `meta` holds, except `head`. Each member is optional: httpd leaves out a count that it cannot read, for example when the COB cache is unreadable. `releases` is present only on builds with the `artifacts` feature. |
| `defaultBranch` | **New.** Optional. A qualified ref name (`refs/heads/main`), the same as in `xyz.radicle.crefs` and the `refs` keys. It comes from the crefs symbolic `HEAD`, or from the project payload when crefs has none. httpd leaves it out when `HEAD` is not a branch, because the explorer assumes branches everywhere. |
| `payloads["xyz.radicle.project"].meta` | **No change** in shape or rules, except `releases` (see below). It is still present only when httpd can fill every field. If one is missing (no head, or an unreadable COB cache), httpd leaves out the whole project payload, as before. **Deprecated**, to be removed in 0.30.0. |
| `payloads["xyz.radicle.project"].data.defaultBranch` | **No change.** It is still the short form (`main`), because it is delegate-signed data. When it falls back to it, the client adds `refs/heads/`, so consumers always see one spelling. |

The same release also changed `releases` from a single number to an object with one count per bucket (a separate change). This applies to `cobs` and to `meta`, so older explorers cannot read `meta` from this release (see "Decision for you"). The client accepts both shapes from older nodes.

`meta.head` has no top-level replacement. The default branch tip is `refs[defaultBranch]`. Nodes older than 0.26.0 send no `refs`, so `defaultBranchTip` ([utils.ts](src/lib/utils.ts)) falls back to `meta.head` until the contract.

### Frontend consumers

- **Repo pages** ([router.ts](src/views/repos/router.ts)): every repo route calls `getByRid`. The Source and History views use `defaultBranch` as the default revision.
- **Repo header and tabs**: [Header.svelte](src/views/repos/Header.svelte) shows the open issue and patch counts. [Patches.svelte](src/views/repos/Patches.svelte) shows a count for each patch status. [Releases.svelte](src/views/repos/Releases.svelte) and the releases route read `cobs.releases`. If `cobs` is missing, the releases route tells the user that the node is too old.
- **Repo lists**: [RepoCard.ts](src/components/RepoCard.ts) calls `getAll` or `getByDelegate`. [RepoCard.svelte](src/components/RepoCard.svelte) shows the name, description, and counts. The explore page, the node page, and the user page use these cards.
- **Landing page** ([Landing.svelte](src/marketing/Landing.svelte)): calls `getAll` and shows the name, description, and open issue and patch counts. A repo without a project payload shows its RID as the name.

### Known limits

- A repository without a project payload still fails on a frontend older than this change. Listings parse as one array, so it fails the whole page. This was already true, so it is not a regression.
- When httpd cannot fill every field of `meta`, it leaves out the whole project payload. The new explorer then has no name or description and shows the RID. This goes away in 0.30.0, when httpd always sends the project payload.
