# Changelog

## 0.24.0

- **Windows support**: The HTTP daemon now runs on Windows with platform-specific adaptations
- **Faster API responses**: Improved `/node` endpoint performance
- **Git namespace paths**: Direct access to node ref namespaces via `/{rid}.git/{nid}/` remote URLs, simplifying clones and fetches from specific nodes
- Updated dependencies and internal improvements

## 0.23.0

- **Live config reload**: Update configuration without restarting by sending a SIGHUP signal
