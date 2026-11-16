import * as THREE from '../prototype3d/vendor/three.module.min.js'
import { GLTFLoader } from '../prototype3d/vendor/loaders/GLTFLoader.js'
import { MeshoptDecoder } from '../prototype3d/vendor/meshopt/meshopt_decoder.mjs'
import { shipPreviewAssets } from './shipAssets.js'

const pending = new Map()
// Keep one CPU master. Each visible preview owns/disposes its GPU resources.
export async function loadShipPreview(key) {
    const asset = shipPreviewAssets[key]
    if (!asset) return null
    if (!pending.has(key)) {
        const request = new GLTFLoader()
            .setMeshoptDecoder(MeshoptDecoder)
            .loadAsync(asset.model)
            .catch((error) => {
                pending.delete(key)
                throw error
            })
        pending.set(key, request)
    }
    const gltf = await pending.get(key),
        instance = gltf.scene.clone(true)
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
    instance.scale.setScalar(5 / Math.max(size.x, size.y, size.z))
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
