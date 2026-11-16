# Meshopt decoder

`meshopt_decoder.mjs` is an unmodified copy from npm `meshoptimizer@1.2.0`.
Upstream: https://github.com/zeux/meshoptimizer
License: MIT, included in `LICENSE.md`.

Only the decoder is shipped. Its WebAssembly is embedded in the module; no CDN,
external WASM download, or separately deployed worker is required. The existing
Three.js GLTFLoader uses it for `EXT_meshopt_compression` in the four ship
previews. It is imported with the lazy ship loader, not by image-only lists.

Models were encoded using `@gltf-transform/cli@4.5.1` and the corresponding
meshoptimizer version. See `scripts/assets/compress-ship-preview.sh` and
`docs/OGAMEX-3D-SHIP-LOADING.md` for reproduction and validation.
