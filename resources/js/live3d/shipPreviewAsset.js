import * as THREE from '../prototype3d/vendor/three.module.min.js'
import { GLTFLoader } from '../prototype3d/vendor/loaders/GLTFLoader.js'
import { MeshoptDecoder } from '../prototype3d/vendor/meshopt/meshopt_decoder.mjs'
import { shipPreviewAssets } from './shipAssets.js'

const pending = new Map()
const cacheLimit = 4
// Retain at most four decoded CPU masters, rather than all seventeen models.
// Each visible preview owns/disposes its GPU resources independently. Cloned
// textures retain their shared image until their last owner is collected.
// Start downloading and decoding the selected ship as soon as its detail view opens.
// This shares the request with the WebGL renderer, so rapid re-renders never redownload it.
export function preloadShipPreview(key) {
    const asset = shipPreviewAssets[key]
    if (!asset) return Promise.resolve(null)
    const cached = pending.get(key)
    if (cached) {
        pending.delete(key)
        pending.set(key, cached)
        return cached.promise
    }
    if (!pending.has(key)) {
        const entry = { promise: null, model: null }
        const request = new GLTFLoader()
            .setMeshoptDecoder(MeshoptDecoder)
            .loadAsync(asset.model)
            .then((gltf) => {
                entry.model = gltf.scene
                // In-flight loads still have consumers; only evict decoded masters.
                const decoded = [...pending].filter(([, value]) => value.model)
                while (decoded.length > cacheLimit) {
                    const [oldKey, oldEntry] = decoded.shift()
                    pending.delete(oldKey)
                    disposeShipPreview(oldEntry.model)
                }
                return gltf
            })
            .catch((error) => {
                pending.delete(key)
                throw error
            })
        entry.promise = request
        pending.set(key, entry)
    }
    return pending.get(key).promise
}
export async function loadShipPreview(key) {
    const asset = shipPreviewAssets[key]
    const gltf = await preloadShipPreview(key)
    if (!gltf) return null
    const instance = gltf.scene.clone(true)
    const textures = new Map()
    instance.traverse((mesh) => {
        if (!mesh.isMesh) return
        mesh.geometry = mesh.geometry.clone()
        const clone = (material) => {
            const owned = material.clone()
            for (const [name, texture] of Object.entries(owned)) {
                if (!texture?.isTexture) continue
                if (!textures.has(texture))
                    textures.set(texture, texture.clone())
                owned[name] = textures.get(texture)
            }
            return owned
        }
        mesh.material = Array.isArray(mesh.material)
            ? mesh.material.map(clone)
            : clone(mesh.material)
        mesh.castShadow = mesh.receiveShadow = true
    })
    const bounds = new THREE.Box3().setFromObject(instance),
        size = bounds.getSize(new THREE.Vector3())
    const extent = Math.max(size.x, size.y, size.z)
    if (!Number.isFinite(extent) || extent <= 0) {
        disposeShipPreview(instance)
        throw new Error('Invalid ship model bounds')
    }
    instance.scale.setScalar(5 / extent)
    instance.userData.modelRevision = asset.revision
    instance.userData.importedPreview = true
    return instance
}
export function disposeShipPreview(model) {
    const textures = new Set(),
        materials = new Set()
    model.traverse((mesh) => {
        mesh.geometry?.dispose()
        if (!mesh.isMesh) return
        for (const material of Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material]) {
            materials.add(material)
            for (const texture of Object.values(material))
                if (texture?.isTexture) textures.add(texture)
        }
    })
    for (const material of materials) material.dispose()
    for (const texture of textures) texture.dispose()
}
