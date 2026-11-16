#!/usr/bin/env bash
# Development only: preserve topology, compress geometry and embedded texture.
# No installation or asset processing is required on the game server.
set -euo pipefail
umask 022
if [[ $# != 2 || ! -f $1 || $1 == "$2" ]]; then
    echo 'Usage: compress-ship-preview.sh source.glb destination.glb' >&2
    exit 1
fi
ship_work_dir=$(mktemp -d)
trap 'rm -rf "$ship_work_dir"' EXIT
npm exec --yes --package=@gltf-transform/cli@4.5.1 -- gltf-transform webp \
    "$1" "$ship_work_dir/texture.glb" --quality 85 --effort 6
npm exec --yes --package=@gltf-transform/cli@4.5.1 -- gltf-transform meshopt \
    "$ship_work_dir/texture.glb" "$2" --level high \
    --quantize-position 14 --quantize-normal 10 --quantize-texcoord 12
