# Changelog

## [unreleased]

- **Git archive downloads**: Additional formats ZIP and TAR are now supported. Also, a prefix is added to the archive by default, which can be disabled by using the query `?prefix=false`. This query string is immediately deprecated. It only exists as a workaround for users to adapt their download scripts etc. to accommodate for the prefix. It will be removed in a future version.

## 0.25.0

- **Canonical and peer refs in repo API**: The repo endpoint now exposes canonical refs and per-peer refs, letting clients discover branches and tags resolved by delegate quorum as well as those from individual nodes
- **Job COBs endpoint**: New `/repos/{rid}/jobs/{sha}` endpoint serves job collaborative objects, enabling clients to query CI/CD job state

## 0.24.0

- **Windows support**: The HTTP daemon now runs on Windows with platform-specific adaptations
- **Faster API responses**: Improved `/node` endpoint performance
- **Git namespace paths**: Direct access to node ref namespaces via `/{rid}.git/{nid}/` remote URLs, simplifying clones and fetches from specific nodes
- Updated dependencies and internal improvements

## 0.23.0

- **Live config reload**: Update configuration without restarting by sending a SIGHUP signal
