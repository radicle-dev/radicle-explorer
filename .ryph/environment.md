# radicle-explorer environment

`.ryph/setup.yml` installs the npm dependencies and the pinned Radicle
binaries (`tests/tmp/bin`), and warms clippy and the Rust test build in
`target/`. Node 24.15.0 (`.nvmrc`) and Rust 1.97.1 (`rust-toolchain`) come
from mise and rustup. The machine itself, from radicle-desktop's Dockerfile,
carries Playwright's OS libraries and `bzip2`.

## Checks (what CI runs)

```sh
npm run check
npm run test:unit
npm run test:http-client:unit
RUSTFLAGS="-D warnings" cargo clippy --workspace --all-features --tests
RUSTFLAGS="-D warnings" cargo clippy -p radicle-httpd --no-default-features --tests
cargo fmt --all -- --check
cargo test --workspace --all-features
cargo test -p radicle-httpd
RUSTDOCFLAGS="-D warnings" cargo doc --workspace --all-features
```

## What does not work here

- `npm run test:e2e -- --project chromium` and the build smoke test: Playwright's
  Chromium download redirects to `storage.googleapis.com`, which the egress
  allowlist refuses. Leave e2e to CI.
- Visual tests: their baselines exist only as CI artifacts.
