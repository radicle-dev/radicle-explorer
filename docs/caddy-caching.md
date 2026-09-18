# Cache radicle-httpd behind Caddy

This guide is for operators who run a `radicle-httpd` node and want to put an HTTP cache in front of it. Scrapers now generate most of the traffic on public nodes, and a cache is the cheapest defence. A wrong cache config makes things worse, so the defaults below are matched to the headers that `radicle-httpd` actually sends.

All cached routes are unauthenticated `GET` requests. A shared cache is safe.

## What radicle-httpd sends

`radicle-httpd` sets `Cache-Control` per handler with two helpers in `crates/radicle-httpd/src/axum_extra.rs`. Paths below are relative to `/api/v1`.

### Content-addressed — `public, max-age=604800, immutable`

These responses are keyed by a commit or object ID. They can never change.

- `/repos/{rid}/commits` and `/repos/{rid}/commits/{sha}`
- `/repos/{rid}/diff/{base}/{oid}` and `/repos/{rid}/diff/{base}/{oid}/stats`
- `/repos/{rid}/tree/{sha}/` and `/repos/{rid}/tree/{sha}/{path}`
- `/repos/{rid}/stats/tree/{sha}` and `/repos/{rid}/stats/commits/{sha}`
- `/repos/{rid}/blob/{sha}/{path}`
- `/repos/{rid}/readme/{sha}`

### Revalidated — `public, max-age=N, must-revalidate`

- `/info` and `/node` — 600 s
- `/repos/search` — 600 s
- `/repos/{rid}/activity` — 3600 s

### No `Cache-Control` at all

- `/` and `/repos`
- `/repos/{rid}`, `/repos/{rid}/remotes`, `/repos/{rid}/remotes/{peer}`
- `/repos/{rid}/issues`, `/patches`, `/releases`, `/jobs/{sha}`
- `/stats`, `/delegates/{did}/repos`
- `/node/policies/repos`, `/node/policies/repos/{name}`
- `/nodes/{nid}`, `/nodes/{nid}/inventory`
- every route under `/raw/`

`radicle-httpd` sets no `ETag` and no `Last-Modified`, and it does not answer conditional requests. Every revalidation is a full refetch.

It also keeps an internal LRU cache of `/tree` responses, keyed by `(RepoId, Oid, path)`. The `--cache` option sets its size. The default is 100 entries. Issues, patches and releases read through the COB caches. These are storage caches, not HTTP caches.

## Recommended configuration

Scope the `cache` directive with matchers. The matchers decide which routes get a cache at all. That is the part that matters, because the endpoints with no `Cache-Control` must not get one.

Let `radicle-httpd` supply the TTL. It already sends the correct `max-age` on every route below, so do not repeat those numbers here. See "Confirm the fallback on your build" for the exception.

```caddyfile
{
  cache
}

example.com {
  # radicle-httpd supplies the TTL: 604800 immutable, 600 or 3600 revalidated.
  @cached path_regexp ^/api/v1/(info|node|repos/search)$|^/api/v1/repos/[^/]+/(commits|diff|tree|blob|readme|stats|activity)
  cache @cached {
    stale 86400s
  }

  # Expensive and sends no Cache-Control. Supply one here.
  # Raise both numbers freely if a stale repo count does not bother you.
  @stats path /api/v1/stats
  cache @stats {
    ttl 120s
    stale 120s
    default_cache_control "public, max-age=120"
  }

  # Everything else, the COB routes included, stays uncached.
  reverse_proxy radicle-httpd:8080
}
```

`stale` reaches only the content-addressed routes. The listings carry `must-revalidate`, which forbids stale delivery, so the directive does nothing for them.

`/api/v1/stats` scans all of storage on every call. On a node with thousands of repositories it can take seconds cold, and the instance answers nothing else while it runs, including its own health check. A 120 s cache stops a crawler from making it expensive. If you want it fully safe, fetch it on a timer and serve the file. Two traps if you do: `OPTIONS` must still reach `radicle-httpd`, because a static file handler answers preflight with 405, and your proxy's own 5xx does not carry the `Access-Control-Allow-Origin` header, so browsers see an opaque "Failed to fetch".

`@stats` keeps its own block because it is the only cached route where `radicle-httpd` sends no header of its own. Its numbers must not reach the other routes, in case your build caps the upstream `max-age` instead of falling back to it.

### Confirm the fallback on your build

Souin honours the upstream `Cache-Control` and uses `ttl` only when the response has none. Souin's own documentation does not state this, and the precedence has changed between versions, so confirm it once after you build:

```sh
curl -sI https://example.com/api/v1/repos/{rid}/blob/{sha}/README.md | grep -i cache-status
```

A second request should report a `ttl` counting down from 604800. If it counts down from something much smaller, your build caps the upstream value. Only then split `@cached` in two, because one `ttl` cannot serve both groups: a content-addressed matcher with `ttl 604800s` and `stale 86400s`, and a listing matcher (`info`, `node`, `repos/search`, `activity`) with `ttl 600s`.

## Rate limiting

Caching alone does not stop a distributed crawl. Recent scrapes came from hundreds of IPs in two /16 blocks, each IP staying under any per-IP limit. Rate limit per network, not per address:

```caddyfile
rate_limit {
  zone api_per_network {
    key         {remote_host}
    ipv4_prefix 16
    ipv6_prefix 32
    events      300
    window      1m
  }
}
```

Put the rate limiter at the top of the site block so it applies to all routes.

## Build and storage

Both directives are third-party modules. Build Caddy with them:

```sh
xcaddy build \
  --with github.com/mholt/caddy-ratelimit \
  --with github.com/caddyserver/cache-handler
```

The `cache-handler` module stores entries in memory by default. Under a scrape, a week-long TTL on tree and blob responses can use a lot of RAM. Configure a disk or Redis backend for production, and watch memory use.

## Verify

Check the `Cache-Status` response header:

```sh
curl -sI https://example.com/api/v1/repos/{rid}/tree/{sha}/ | grep -i cache
```

A hit shows `Cache-Status: Souin; hit; ttl=...`. An uncached route shows no header.

Three checks are enough:

- A repeated blob or tree request is a hit, with a `ttl` near 604800.
- A new issue comment appears at once, which proves the COB routes are uncached.
- `/api/v1/stats` is a hit on the second call.

## Backend changes required

These need changes in `radicle-httpd`. They are listed here so operators know what the cache cannot solve:

- No `ETag` and no `If-None-Match` handling. The object ID is the natural `ETag` value. Conditional requests would make revalidation and stale-while-revalidate cheap.
- `/api/v1/stats` does unbounded work on every call.
- Routes under `/raw/` send no `Cache-Control`, although archive and blob responses are content-addressed.
- The content-addressed responses carry no `stale-while-revalidate` and no `stale-if-error`. The `stale` line in the Caddy config stands in for them, but only for that one cache. Sent by `radicle-httpd`, every cache in the chain would honour them, browsers included.
