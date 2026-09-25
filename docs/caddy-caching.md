# Cache radicle-httpd behind Caddy

This guide is for operators who run a `radicle-httpd` node and want to put an HTTP cache in front of it.

All cached routes are unauthenticated `GET` requests so a shared cache is safe.

## Cache headers set by radicle-httpd

`radicle-httpd` sets the `Cache-Control` header for each handler as follows.

### Immutable content-addressed routes

Header: `public, max-age=604800, immutable, stale-while-revalidate=86400, stale-if-error=86400`

- `/api/v1/repos/{rid}/commits?parent={sha}`, only with the `parent` query parameter
- `/api/v1/repos/{rid}/commits/{sha}` (the `branches` isn't immutable, but also doesn't change frequently)
- `/api/v1/repos/{rid}/diff/{base}/{oid}`
- `/api/v1/repos/{rid}/diff/{base}/{oid}/stats`
- `/api/v1/repos/{rid}/tree/{sha}/`
- `/api/v1/repos/{rid}/tree/{sha}/{path}`
- `/api/v1/repos/{rid}/stats/tree/{sha}`
- `/api/v1/repos/{rid}/stats/commits/{sha}`
- `/api/v1/repos/{rid}/blob/{sha}/{path}`
- `/api/v1/repos/{rid}/readme/{sha}`
- `/raw/{rid}/{sha}.tar.gz`, also `.tar` and `.zip`
- `/raw/{rid}/{sha}/{path}`
- `/raw/{rid}/blobs/{oid}`

### Revalidated routes

Header: `public, max-age=N, must-revalidate`

The cache keeps the response for N seconds. After that, it must fetch a new response before it answers.

- `/api/v1/info` and `/api/v1/node` — 600 s
- `/api/v1/repos/search` — 600 s
- `/api/v1/repos/{rid}/activity` — 3600 s

### Stale-tolerant route

Header: `public, max-age=120, stale-while-revalidate=120, stale-if-error=3600`

- `/api/v1/stats`, since 0.30.0. Older nodes send no cache header on this route.

### Routes with no `Cache-Control`

- `/api/v1`
- `/api/v1/repos`
- `/api/v1/repos/{rid}`
- `/api/v1/repos/{rid}/commits` without `parent`, because the result follows the default branch head
- `/api/v1/repos/{rid}/remotes`
- `/api/v1/repos/{rid}/remotes/{peer}`
- `/api/v1/repos/{rid}/issues` and `/api/v1/repos/{rid}/issues/{id}`
- `/api/v1/repos/{rid}/patches` and `/api/v1/repos/{rid}/patches/{id}`
- `/api/v1/repos/{rid}/releases` and `/api/v1/repos/{rid}/releases/{id}`
- `/api/v1/repos/{rid}/jobs/{sha}`
- `/api/v1/delegates/{did}/repos`
- `/api/v1/node/policies/repos`
- `/api/v1/node/policies/repos/{name}`
- `/api/v1/nodes/{nid}`
- `/api/v1/nodes/{nid}/inventory`
- `/raw/{rid}/head/{path}`
- `/raw/{rid}/archive/{refname}`
- `/{rid}/{path}`, the Git smart HTTP routes that `git clone` and `git fetch` use

`radicle-httpd` sets no `ETag` and no `Last-Modified` header. It does not answer conditional requests. Every revalidation is a full refetch.

## Recommended configuration

Scope the `cache` directive with matchers. A matcher is a Caddy rule that selects requests by path. The matchers decide which routes get a cache at all. This is the part that matters, because the routes with no `Cache-Control` must not get one.

Let `radicle-httpd` supply the TTL (time to live, how long the cache keeps a response). It already sends the correct `max-age` on every route in the matcher, so do not repeat those numbers in Caddy.

```caddyfile
{
  cache {
    # Disk stores name each file after the key. Keys over 255 bytes fail
    # to write, but Souin still reports "stored". A hash keeps them short.
    key {
      hash
    }
  }
}

example.com {
  # radicle-httpd supplies the TTL and the stale window for each route.
  @cached path_regexp ^/api/v1/(info|node|stats|repos/search)$|^/api/v1/repos/[^/]+/(commits/|diff|tree|blob|readme|stats|activity)|^/raw/[^/]+/(blobs/|[0-9a-f]{40})
  cache @cached

  # The commit list is immutable only when it starts from a fixed parent.
  @commit_history {
    path_regexp ^/api/v1/repos/[^/]+/commits$
    query parent=*
  }
  cache @commit_history

  # Everything else, the COB routes, the commit list without a parent and
  # /raw/ head and archive included, stays uncached.
  reverse_proxy radicle-httpd:8080
}
```
