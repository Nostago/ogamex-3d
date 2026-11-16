import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { shipPreviewAssets } from '../../resources/js/live3d/shipAssets.js'
const root = new URL('../../public/', import.meta.url)
test('uploaded fighter is a bounded self-contained standard GLB with a small image fallback', async () => {
    const asset = shipPreviewAssets.light_fighter,
        data = await readFile(new URL(asset.model.slice(1), root))
    assert.equal(data.toString('ascii', 0, 4), 'glTF')
    assert.equal(data.readUInt32LE(4), 2)
    assert.equal(data.readUInt32LE(8), data.length)
    assert.ok(data.length < 2 * 1024 * 1024)
    const gltf = JSON.parse(
        data.toString('utf8', 20, 20 + data.readUInt32LE(12)),
    )
    assert.equal(gltf.meshes.length, 1)
    const primitive = gltf.meshes[0].primitives[0],
        indices = gltf.accessors[primitive.indices],
        positions = gltf.accessors[primitive.attributes.POSITION]
    assert.ok(indices.count / 3 > 20000 && indices.count / 3 <= 60000)
    assert.ok(
        positions.min.every(Number.isFinite) &&
            positions.max.every(Number.isFinite),
    )
    assert.ok(gltf.buffers.every((buffer) => !buffer.uri))
    assert.ok(
        gltf.images.every(
            (image) => image.bufferView !== undefined && !image.uri,
        ),
    )
    assert.deepEqual(gltf.extensionsRequired || [], [])
    const indexView = gltf.bufferViews[indices.bufferView],
        binaryStart = 28 + data.readUInt32LE(12),
        offset =
            binaryStart +
            (indexView.byteOffset || 0) +
            (indices.byteOffset || 0)
    const stride = indices.componentType === 5125 ? 4 : 2
    for (let i = 0; i < indices.count; i++)
        assert.ok(
            (stride === 4
                ? data.readUInt32LE(offset + i * 4)
                : data.readUInt16LE(offset + i * 2)) < positions.count,
        )
    const image = await readFile(new URL(asset.image.slice(1), root))
    assert.equal(image.toString('ascii', 0, 4), 'RIFF')
    assert.equal(image.toString('ascii', 8, 12), 'WEBP')
    assert.ok(image.length < 80000)
    assert.equal(asset.azimuth, 35)
})
