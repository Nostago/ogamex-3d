import * as THREE from './vendor/three.module.min.js'

// Fit every corner in both axes, including tall antennae and wide foundations.
export function fitModelCamera(camera, size) {
    const direction = new THREE.Vector3(1.5, 1.05, 1.7).normalize()
    const right = new THREE.Vector3(direction.z, 0, -direction.x).normalize()
    const up = new THREE.Vector3().crossVectors(direction, right)
    const vertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const horizontal = vertical * camera.aspect
    let distance = 1
    for (const x of [-1, 1])
        for (const y of [-1, 1])
            for (const z of [-1, 1]) {
                const corner = new THREE.Vector3(x * size.x, y * size.y, z * size.z).multiplyScalar(0.5)
                const depth = corner.dot(direction)
                distance = Math.max(distance,
                    depth + Math.abs(corner.dot(up)) / vertical,
                    depth + Math.abs(corner.dot(right)) / horizontal)
            }
    camera.position.copy(direction).multiplyScalar(distance * 1.16)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
}
