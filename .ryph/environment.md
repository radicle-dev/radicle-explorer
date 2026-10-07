# radicle-explorer environment

`.ryph/setup.yml` installs the npm dependencies and the pinned Radicle
binaries (`tests/tmp/bin`), warms clippy, the Rust test builds and the
workspace docs (`--no-deps`) in `target/`, and, at image build, installs
Playwright's Chromium headless shell when the egress allowlist lets it.
Node 24.15.0 (`.nvmrc`) and Rust 1.97.1 (`rust-toolchain`) come from mise
and rustup. The machine itself, from radicle-desktop's Dockerfile,
carries Playwright's OS libraries and `bzip2`.

## Checks (what CI runs)

`.ryph/checks.yml` runs these as four checks: `js`, `rust-lint`, `rust-test`
and `e2e`.

```sh
npm run check
npm run test:unit
npm run test:http-client:unit
RUSTFLAGS="-D warnings" cargo clippy --workspace --all-features --tests
RUSTFLAGS="-D warnings" cargo clippy -p radicle-httpd --no-default-features --tests
cargo fmt --all -- --check
cargo test --workspace --all-features
cargo test -p radicle-httpd
RUSTDOCFLAGS="-D warnings" cargo doc --workspace --all-features --no-deps
```

## What does not work here

- `npm run test:e2e -- --project chromium` and the build smoke test, unless
  `storage.googleapis.com` is on the egress allowlist: Playwright's Chromium
  download redirects there. Without it, leave e2e to CI.
- Visual tests: their baselines exist only as CI artifacts.
