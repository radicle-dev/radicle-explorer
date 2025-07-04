# Builds release binaries for Radicle.
ARG RUST_VERSION="1.87"
ARG ALPINE_VERSION="3.20"
FROM rust:${RUST_VERSION}-alpine${ALPINE_VERSION} as builder
LABEL maintainer="Radicle Team <team@radicle.xyz>"
WORKDIR /src
COPY . .

ARG TZ
ARG LC_ALL
ARG SOURCE_DATE_EPOCH
ARG RADICLE_VERSION
ARG GIT_HEAD

# Copy cargo configuration we're going to use to specify compiler options.
RUN mkdir -p .cargo && cp build/config.toml .cargo/config.toml
# Install dependencies.
RUN apk update && apk add --no-cache git musl-dev xz asciidoctor zig
# Build man pages and strip metadata. Removes all comments, since they include
# non-reproducible information, such as version numbers.
RUN asciidoctor --doctype manpage --backend manpage --destination-dir . *.1.adoc && \
    find . -maxdepth 1 -type f -name '*.1' -exec sed -i '/^.\\\"/d' '{}' \;
RUN echo "{ "name": "radicle-httpd", "version": "${RADICLE_VERSION}", "commit": "${GIT_HEAD}", "timestamp": ${SOURCE_DATE_EPOCH} }" > /src/radicle-httpd.json
# Add cargo targets.
RUN rustup target add \
    x86_64-unknown-linux-musl \
    aarch64-unknown-linux-musl \
    x86_64-apple-darwin \
    aarch64-apple-darwin

# Install dependencies for cross-compiling to macOS.
# We use Zig as the linker to perform the compilation from a Linux host.
# Compilation is done via `cargo-zigbuild` which is a wrapper around `zig`.
RUN cargo install cargo-zigbuild@0.20.0 --locked


# Parts of the macOS SDK are required to build Radicle, we make these available
# here. So far only `CoreFoundation` and `Security` frameworks are needed.
RUN xz -d -c build/macos-sdk-11.3.tar.xz | tar -x
# This env var is used by `cargo-zigbuild` to find the SDK.
ENV SDKROOT /src/macos-sdk-11.3

# Build binaries.
RUN cargo zigbuild --locked --release \
    --target=x86_64-apple-darwin \
    --target=aarch64-apple-darwin \
    --target=aarch64-unknown-linux-musl \
    --target=x86_64-unknown-linux-musl \
    -p radicle-httpd

# Now copy the files to a new image without all the intermediary artifacts to
# save some space.
FROM alpine:3.21 as packager

ARG RADICLE_VERSION
ARG SOURCE_DATE_EPOCH

COPY --from=builder \
    /src/radicle-httpd.json \
    /builds/
COPY --from=builder \
    /src/target/x86_64-unknown-linux-musl/release/radicle-httpd \
    /builds/x86_64-unknown-linux-musl/bin/
COPY --from=builder \
    /src/target/aarch64-unknown-linux-musl/release/radicle-httpd \
    /builds/aarch64-unknown-linux-musl/bin/
COPY --from=builder \
    /src/target/aarch64-apple-darwin/release/radicle-httpd \
    /builds/aarch64-apple-darwin/bin/
COPY --from=builder \
    /src/target/x86_64-apple-darwin/release/radicle-httpd \
    /builds/x86_64-apple-darwin/bin/
COPY --from=builder /src/*.1 /builds/x86_64-unknown-linux-musl/man/man1/
COPY --from=builder /src/*.1 /builds/aarch64-unknown-linux-musl/man/man1/
COPY --from=builder /src/*.1 /builds/aarch64-apple-darwin/man/man1/
COPY --from=builder /src/*.1 /builds/x86_64-apple-darwin/man/man1/

# Create and compress reproducible archive.
WORKDIR /builds
RUN apk update && apk add --no-cache tar xz
RUN find * -maxdepth 0 -type d -exec mv '{}' "radicle-httpd-$RADICLE_VERSION-{}" \; && \
    find * -maxdepth 0 -type d -exec tar \
    --sort=name \
    --verbose \
    --mtime="@$SOURCE_DATE_EPOCH" \
    --owner=0 \
    --group=0 \
    --numeric-owner \
    --format=posix \
    --pax-option=exthdr.name=%d/PaxHeaders/%f,delete=atime,delete=ctime \
    --mode='go+u,go-w' \
    --remove-files \
    --create --xz \
    --file="{}.tar.xz" \
    '{}' \;
