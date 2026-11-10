#!/bin/sh
set -eu
. "$(dirname "$0")/common.sh"

mkdir -p "$OGAMEX_CLOUD_STATE_DIR/cargo" "$OGAMEX_CLOUD_STATE_DIR/rust-target"
docker run --rm --user "$(id -u):$(id -g)" \
    -e CARGO_HOME=/cargo -e CARGO_TARGET_DIR=/target -e CARGO_BUILD_JOBS=4 \
    -e CARGO_HTTP_CAINFO=/run/cloud-ca.pem \
    -v "$OGAMEX_CLOUD_STATE_DIR/ca.pem:/run/cloud-ca.pem:ro" \
    -v "$ogamex_repo_dir:/app" \
    -v "$OGAMEX_CLOUD_STATE_DIR/cargo:/cargo" \
    -v "$OGAMEX_CLOUD_STATE_DIR/rust-target:/target" \
    -w /app rust:1.90-bookworm \
    cargo build --manifest-path rust/Cargo.toml --release --locked
cp "$OGAMEX_CLOUD_STATE_DIR/rust-target/release/libbattle_engine_ffi.so" "$ogamex_repo_dir/storage/rust-libs/"
cp "$OGAMEX_CLOUD_STATE_DIR/rust-target/release/libtest_ffi.so" "$ogamex_repo_dir/storage/rust-libs/"
chmod 644 "$ogamex_repo_dir/storage/rust-libs/"*.so
