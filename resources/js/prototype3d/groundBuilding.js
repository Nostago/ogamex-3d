import * as THREE from './vendor/three.module.min.js'
// Shape only the lowest parts into the spherical ground. Upper architecture stays straight.
export function groundBuilding(group, radius) {
    group.updateMatrixWorld(true)
    const point = new THREE.Vector3()
    group.traverse((part) => {
        if (!part.isMesh || !part.geometry?.attributes.position) return
        const positions = part.geometry.attributes.position,
            inverse = part.matrixWorld.clone().invert()
        for (let index = 0; index < positions.count; index++) {
            point
                .fromBufferAttribute(positions, index)
                .applyMatrix4(part.matrixWorld)
            const blend = 1 - THREE.MathUtils.smoothstep(point.y, 0.35, 1.1)
            if (!blend) continue
            const surface =
                Math.sqrt(
                    Math.max(
                        0,
                        radius * radius - point.x * point.x - point.z * point.z,
                    ),
                ) - radius
            point.y += (surface - 0.018) * blend
            point.applyMatrix4(inverse)
            positions.setXYZ(index, point.x, point.y, point.z)
        }
        part.geometry.computeVertexNormals()
        part.geometry.computeBoundingBox()
        part.geometry.computeBoundingSphere()
        positions.needsUpdate = true
    })
    group.userData.sphericalGround = true
}
