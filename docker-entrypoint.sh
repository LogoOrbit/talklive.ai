#!/bin/sh
# Fly mounts volumes owned by root, so the store's DATA_DIR is not writable by
# the unprivileged `node` user until we hand it over. Do that here rather than
# in the Dockerfile — the mount happens at runtime and would overwrite a
# build-time chown.
set -e

DIR="${DATA_DIR:-/data}"
mkdir -p "$DIR"
chown -R node:node "$DIR"

exec su-exec node "$@"
