import * as THREE from './vendor/three.module.min.js'

// Fit every corner in both axes, including tall antennae and wide foundations.
export function fitModelCamera(camera, size, viewDirection = [1.5, 1.05, 1.7]) {
    const direction = new THREE.Vector3(...viewDirection).normalize()
    const right = new THREE.Vector3(direction.z, 0, -direction.x).normalize()
    const up = new THREE.Vector3().crossVectors(direction, right)
    const vertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const horizontal = vertical * camera.aspect
    let distance = 1
    for (const x of [-1, 1])
        for (const y of [-1, 1])
            for (const z of [-1, 1]) {
                const corner = new THREE.Vector3(
                    x * size.x,
                    y * size.y,
                    z * size.z,
                ).multiplyScalar(0.5)
                const depth = corner.dot(direction)
                distance = Math.max(
                    distance,
                    depth + Math.abs(corner.dot(up)) / vertical,
                    depth + Math.abs(corner.dot(right)) / horizontal,
                )
            }
    camera.position.copy(direction).multiplyScalar(distance * 1.16)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
}

// Tight framing for long, pointed imported hulls. Empty box corners otherwise
// force the ship far away even though the actual nose and wings fit comfortably.
export function fitModelGeometryCamera(camera, model, viewDirection) {
    const direction = new THREE.Vector3(...viewDirection).normalize(),
        right = new THREE.Vector3(direction.z, 0, -direction.x).normalize(),
        up = new THREE.Vector3().crossVectors(direction, right),
        vertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)),
        horizontal = vertical * camera.aspect,
        point = new THREE.Vector3()
    let distance = 0.1
    model.updateMatrixWorld(true)
    model.traverse((mesh) => {
        const positions = mesh.geometry?.getAttribute('position')
        if (!mesh.isMesh || !positions) return
        for (let index = 0; index < positions.count; index++) {
            point
                .fromBufferAttribute(positions, index)
                .applyMatrix4(mesh.matrixWorld)
            const depth = point.dot(direction)
            distance = Math.max(
                distance,
                depth + Math.abs(point.dot(up)) / vertical,
                depth + Math.abs(point.dot(right)) / horizontal,
            )
        }
    })
    camera.position.copy(direction).multiplyScalar(distance * 1.08)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
}
