import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { shipPreviewAssets } from '../../resources/js/live3d/shipAssets.js'
import { MeshoptDecoder } from '../../resources/js/prototype3d/vendor/meshopt/meshopt_decoder.mjs'
const root = new URL('../../public/', import.meta.url)
for (const [key, asset] of Object.entries(shipPreviewAssets)) {
    if (!asset.model.endsWith('-v2.glb')) continue
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

// The thirteen additional uploads are standard GLB files, not the four older
// Meshopt/WebP assets. Missing uploads intentionally fail rather than being skipped.
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
            `/models/live3d/${key}-v1.glb`,
        )
        assert.equal(
            shipPreviewAssets[key].image,
            `/img/live3d/ships/${key}-35-v1.webp`,
        )
    }
})
for (const key of addedShips) {
    test(`${key}: uploaded standard GLB, processing report and thumbnail are present and self-contained`, async () => {
        const asset = shipPreviewAssets[key],
            data = await readFile(new URL(asset.model.slice(1), root))
        assert.equal(data.toString('ascii', 0, 4), 'glTF')
        assert.equal(data.readUInt32LE(4), 2)
        assert.equal(data.readUInt32LE(8), data.length)
        assert.ok(
            data.length <= 5_000_000,
            `${key}: optimized model exceeds download budget`,
        )
        assert.equal(data.toString('ascii', 16, 20), 'JSON')
        const jsonLength = data.readUInt32LE(12),
            gltf = JSON.parse(data.toString('utf8', 20, 20 + jsonLength)),
            binStart = 28 + jsonLength
        for (const extension of gltf.extensionsRequired || [])
            assert.ok(
                ![
                    'KHR_draco_mesh_compression',
                    'EXT_meshopt_compression',
                    'KHR_texture_basisu',
                ].includes(extension),
                `${key}: standard uploads must not require an external compression decoder`,
            )
        assert.equal(
            data.toString('ascii', 24 + jsonLength, 28 + jsonLength),
            'BIN\0',
        )
        assert.ok(binStart + data.readUInt32LE(20 + jsonLength) <= data.length)
        assert.ok(
            gltf.buffers.every(
                (buffer) =>
                    !buffer.uri && buffer.byteLength <= data.length - binStart,
            ),
        )
        for (const view of gltf.bufferViews) {
            assert.equal(view.buffer, 0)
            assert.ok(
                (view.byteOffset || 0) + view.byteLength <=
                    data.length - binStart,
            )
        }
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
                const view = gltf.bufferViews[indices.bufferView],
                    bytes = new DataView(
                        data.buffer,
                        data.byteOffset + binStart + (view.byteOffset || 0),
                        view.byteLength,
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
            assert.ok(['image/png', 'image/jpeg'].includes(image.mimeType))
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
        assert.match(
            report.source_sha256,
            /^[a-f0-9]{64}$/i,
            'Processing report must retain the original SHA-256',
        )
    })
}
