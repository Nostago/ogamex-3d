import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { shipPreviewAssets } from '../../resources/js/live3d/shipAssets.js'
import { MeshoptDecoder } from '../../resources/js/prototype3d/vendor/meshopt/meshopt_decoder.mjs'
const root = new URL('../../public/', import.meta.url)
const legacyKeys = new Set([
    'light_fighter',
    'heavy_fighter',
    'large_cargo',
    'colony_ship',
])
for (const [key, asset] of Object.entries(shipPreviewAssets)) {
    if (!legacyKeys.has(key)) continue
    test(`${key}: compressed self-contained GLB decodes to valid detailed geometry`, async () => {
        const data = await readFile(new URL(asset.model.slice(1), root))
        assert.equal(data.toString('ascii', 0, 4), 'glTF')
        assert.equal(data.readUInt32LE(4), 2)
        assert.equal(data.readUInt32LE(8), data.length)
        assert.ok(data.length < 1_000_000, `${key}: preview download budget`)
        const gltf = JSON.parse(
            data.toString('utf8', 20, 20 + data.readUInt32LE(12)),
        )
        assert.equal(gltf.meshes.length, 1)
        const primitive = gltf.meshes[0].primitives[0],
            indices = gltf.accessors[primitive.indices],
            positions = gltf.accessors[primitive.attributes.POSITION],
            report = JSON.parse(
                await readFile(
                    new URL(
                        asset.model.slice(1).replace('.glb', '.json'),
                        root,
                    ),
                ),
            )
        assert.ok(indices.count / 3 > 40000 && indices.count / 3 <= 60000)
        assert.equal(indices.count / 3, report.triangles)
        assert.equal(
            report.triangles,
            report.previousTriangles,
            'Compression must retain the triangle count',
        )
        assert.equal(data.length, report.modelBytes)
        assert.ok(
            positions.min.every(Number.isFinite) &&
                positions.max.every(Number.isFinite),
        )
        assert.ok(gltf.buffers.every((buffer) => !buffer.uri))
        assert.ok(
            gltf.images.every(
                (image) =>
                    image.bufferView !== undefined &&
                    !image.uri &&
                    image.mimeType === 'image/webp',
            ),
        )
        assert.deepEqual([...gltf.extensionsRequired].sort(), [
            'EXT_meshopt_compression',
            'EXT_texture_webp',
            'KHR_mesh_quantization',
        ])
        const binaryStart = 28 + data.readUInt32LE(12),
            binary = data.subarray(binaryStart)
        await MeshoptDecoder.ready
        const decoded = gltf.bufferViews.map((view) => {
            const compression = view.extensions?.EXT_meshopt_compression
            if (!compression) {
                assert.equal(view.buffer, 0)
                return binary.subarray(
                    view.byteOffset || 0,
                    (view.byteOffset || 0) + view.byteLength,
                )
            }
            assert.equal(compression.buffer, 0)
            const offset = compression.byteOffset || 0
            assert.ok(offset + compression.byteLength <= binary.length)
            assert.equal(
                view.byteLength,
                compression.count * compression.byteStride,
            )
            const output = new Uint8Array(view.byteLength)
            MeshoptDecoder.decodeGltfBuffer(
                output,
                compression.count,
                compression.byteStride,
                binary.subarray(offset, offset + compression.byteLength),
                compression.mode,
                compression.filter,
            )
            return output
        })
        const indexBytes = decoded[indices.bufferView],
            view = new DataView(
                indexBytes.buffer,
                indexBytes.byteOffset,
                indexBytes.byteLength,
            )
        const stride = indices.componentType === 5125 ? 4 : 2,
            offset = indices.byteOffset || 0
        for (let i = 0; i < indices.count; i++)
            assert.ok(
                (stride === 4
                    ? view.getUint32(offset + i * 4, true)
                    : view.getUint16(offset + i * 2, true)) < positions.count,
            )
        const texture = decoded[gltf.images[0].bufferView]
        assert.equal(Buffer.from(texture.subarray(0, 4)).toString(), 'RIFF')
        assert.equal(Buffer.from(texture.subarray(8, 12)).toString(), 'WEBP')
        const image = await readFile(new URL(asset.image.slice(1), root))
        assert.equal(image.toString('ascii', 0, 4), 'RIFF')
        assert.equal(image.toString('ascii', 8, 12), 'WEBP')
        assert.ok(image.length < 80000)
        assert.equal(asset.azimuth, 35)
    })
}

// All thirteen additional uploads use the existing Meshopt/WebP decoder.
// Geometry repairs are separately tracked; decoding does not prove visual quality.
const addedShips = [
    'bomber',
    'crawler',
    'small_cargo',
    'cruiser',
    'pathfinder',
    'reaper',
    'recycler',
    'battlecruiser',
    'battle_ship',
    'solar_satellite',
    'espionage_probe',
    'deathstar',
    'destroyer',
]
const compressedKeys = addedShips
const repairedKeys = new Set([
    'bomber',
    'crawler',
    'reaper',
    'solar_satellite',
    'small_cargo',
])
const portraitKeys = new Set(['espionage_probe', 'pathfinder'])
test('all seventeen ships have distinct versioned model and thumbnail mappings', () => {
    assert.equal(Object.keys(shipPreviewAssets).length, 17)
    assert.equal(
        new Set(Object.values(shipPreviewAssets).map((a) => a.model)).size,
        17,
    )
    assert.equal(
        new Set(Object.values(shipPreviewAssets).map((a) => a.image)).size,
        17,
    )
    for (const key of addedShips) {
        assert.equal(
            shipPreviewAssets[key].model,
            `/models/live3d/${key}-${repairedKeys.has(key) ? 'v3' : 'v2'}.glb`,
        )
        assert.equal(
            shipPreviewAssets[key].image,
            `/img/live3d/ships/${key}-35-${portraitKeys.has(key) ? 'v2' : 'v3'}.webp`,
        )
    }
})
for (const key of addedShips) {
    test(`${key}: versioned GLB decodes, matches its processing report and has a self-contained thumbnail`, async () => {
        const compressed = compressedKeys.includes(key),
            asset = shipPreviewAssets[key],
            data = await readFile(new URL(asset.model.slice(1), root))
        assert.equal(data.toString('ascii', 0, 4), 'glTF')
        assert.equal(data.readUInt32LE(4), 2)
        assert.equal(data.readUInt32LE(8), data.length)
        assert.ok(
            data.length <= (compressed ? 1_400_000 : 5_000_000),
            `${key}: optimized model exceeds download budget`,
        )
        assert.equal(data.toString('ascii', 16, 20), 'JSON')
        const jsonLength = data.readUInt32LE(12),
            gltf = JSON.parse(data.toString('utf8', 20, 20 + jsonLength)),
            binStart = 28 + jsonLength
        if (compressed)
            assert.deepEqual([...gltf.extensionsRequired].sort(), [
                'EXT_meshopt_compression',
                'EXT_texture_webp',
                'KHR_mesh_quantization',
            ])
        else
            assert.ok(
                !(gltf.extensionsRequired || []).includes(
                    'EXT_meshopt_compression',
                ),
            )
        assert.equal(
            data.toString('ascii', 24 + jsonLength, 28 + jsonLength),
            'BIN\0',
        )
        assert.ok(binStart + data.readUInt32LE(20 + jsonLength) <= data.length)
        assert.ok(gltf.buffers.every((buffer) => !buffer.uri))
        assert.ok(gltf.buffers[0].byteLength <= data.length - binStart)
        await MeshoptDecoder.ready
        const decoded = gltf.bufferViews.map((view) => {
            const compression = view.extensions?.EXT_meshopt_compression
            if (!compression) {
                assert.equal(view.buffer, 0)
                const offset = view.byteOffset || 0
                assert.ok(offset + view.byteLength <= data.length - binStart)
                return data.subarray(
                    binStart + offset,
                    binStart + offset + view.byteLength,
                )
            }
            assert.equal(compression.buffer, 0)
            const offset = compression.byteOffset || 0
            assert.ok(offset + compression.byteLength <= data.length - binStart)
            assert.equal(
                view.byteLength,
                compression.count * compression.byteStride,
            )
            const output = new Uint8Array(view.byteLength)
            MeshoptDecoder.decodeGltfBuffer(
                output,
                compression.count,
                compression.byteStride,
                data.subarray(
                    binStart + offset,
                    binStart + offset + compression.byteLength,
                ),
                compression.mode,
                compression.filter,
            )
            return output
        })
        let triangles = 0
        for (const mesh of gltf.meshes)
            for (const primitive of mesh.primitives) {
                assert.equal(primitive.mode ?? 4, 4)
                const positions = gltf.accessors[primitive.attributes.POSITION],
                    indices = gltf.accessors[primitive.indices]
                assert.equal(positions.type, 'VEC3')
                assert.equal(positions.min.length, 3)
                assert.equal(positions.max.length, 3)
                assert.ok(positions.count > 0)
                assert.ok([5121, 5123, 5125].includes(indices.componentType))
                assert.ok(
                    positions.min.every(Number.isFinite) &&
                        positions.max.every(Number.isFinite),
                )
                assert.equal(indices.count % 3, 0)
                triangles += indices.count / 3
                const indexBytes = decoded[indices.bufferView],
                    bytes = new DataView(
                        indexBytes.buffer,
                        indexBytes.byteOffset,
                        indexBytes.byteLength,
                    ),
                    width =
                        indices.componentType === 5125
                            ? 4
                            : indices.componentType === 5123
                              ? 2
                              : 1
                for (let i = 0; i < indices.count; i++) {
                    const offset = (indices.byteOffset || 0) + i * width
                    const index =
                        width === 4
                            ? bytes.getUint32(offset, true)
                            : width === 2
                              ? bytes.getUint16(offset, true)
                              : bytes.getUint8(offset)
                    assert.ok(index < positions.count)
                }
            }
        assert.ok(triangles > 0 && triangles <= 65_000)
        for (const image of gltf.images || []) {
            assert.ok(Number.isInteger(image.bufferView) && !image.uri)
            assert.ok(
                (compressed
                    ? ['image/webp']
                    : ['image/png', 'image/jpeg']
                ).includes(image.mimeType),
            )
            assert.ok(decoded[image.bufferView].length > 0)
        }
        const thumbnail = await readFile(new URL(asset.image.slice(1), root))
        assert.equal(thumbnail.toString('ascii', 0, 4), 'RIFF')
        assert.equal(thumbnail.toString('ascii', 8, 12), 'WEBP')
        assert.ok(thumbnail.length <= 300_000)
        const report = JSON.parse(
            await readFile(
                new URL(asset.model.slice(1).replace('.glb', '.json'), root),
            ),
        )
        assert.equal(report.model_id, key)
        assert.equal(report.output_bytes, data.length)
        assert.equal(report.output_triangles, triangles)
        if (repairedKeys.has(key)) {
            assert.equal(report.geometry_repair_pending, false)
            assert.equal(
                report.output_sha256,
                createHash('sha256').update(data).digest('hex'),
            )
            const reference = report.surface_check
            assert.ok(reference.sample_count >= 4096)
            assert.ok(
                reference.max_boundary_error <= reference.source_extent * 0.01,
            )
            assert.ok(
                reference.nearest_original_vertex_p99 <=
                    reference.source_extent * 0.01,
            )
            assert.ok(
                reference.nearest_original_vertex_max <=
                    reference.source_extent * 0.025,
            )
            assert.ok(report.source_comparison.silhouette_iou > 0.97)
        }
        if (compressed) {
            assert.equal(report.previous_output_triangles, triangles)
            assert.ok(report.output_bytes < report.previous_output_bytes)
            assert.equal(report.compression.topology_unchanged, true)
        }
        assert.match(
            report.source_sha256,
            /^[a-f0-9]{64}$/i,
            'Processing report must retain the original SHA-256',
        )
    })
}
