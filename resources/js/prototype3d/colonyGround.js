import * as THREE from './vendor/three.module.min.js'

export const colonyDeckHeight = 0.04
export const colonyEntrance = 1.38

// A graded piece of the planet, using the planet's own material, replaces the
// raised concrete plinth. Its outer boundary meets the exact spherical surface.
export function siteGroundHeight(radius, x, z) {
    const sphericalY =
        Math.sqrt(Math.max(0, radius * radius - x * x - z * z)) - radius
    const blend = THREE.MathUtils.smoothstep(
        Math.max(Math.abs(x), Math.abs(z)),
        1.4,
        1.6,
    )
    return THREE.MathUtils.lerp(colonyDeckHeight, sphericalY - 0.003, blend)
}

export function createSiteGround(radius) {
    const geometry = new THREE.PlaneGeometry(3.2, 3.2, 20, 20)
    geometry.rotateX(-Math.PI / 2)
    const positions = geometry.attributes.position
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i),
            z = positions.getZ(i)
        positions.setY(i, siteGroundHeight(radius, x, z))
    }
    geometry.computeVertexNormals()
    return geometry
}

export function sitePort(site, radius, grounded = true, toward = null) {
    const normal = new THREE.Vector3(...site.normal)
    const rotation = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        normal,
    )
    const reach = site.id === 'hub' ? 0.6 : colonyEntrance
    const offset = new THREE.Vector3(
        0,
        grounded ? colonyDeckHeight + 0.015 : 0.23,
        reach,
    )
    if (toward) {
        const local = new THREE.Vector3(...toward.normal)
            .addScaledVector(
                normal,
                -normal.dot(new THREE.Vector3(...toward.normal)),
            )
            .applyQuaternion(rotation.clone().invert())
        const extent = Math.max(Math.abs(local.x), Math.abs(local.z))
        if (extent > 0.00001) {
            offset.x = (local.x * reach) / extent
            offset.z = (local.z * reach) / extent
        }
    }
    return offset.applyQuaternion(rotation).addScaledVector(normal, radius)
}

// Both asphalt and parcels sample the same curve. Endpoints stop at the gate,
// never at the building centre; smooth approaches meet the finished ground pad.
export function roadPoint(
    start,
    end,
    radius,
    progress,
    height = colonyDeckHeight,
) {
    const base = radius + height
    const approach =
        (start.length() - base) *
            (1 - THREE.MathUtils.smoothstep(progress, 0, 0.3)) +
        (end.length() - base) * THREE.MathUtils.smoothstep(progress, 0.7, 1)
    return start
        .clone()
        .lerp(end, progress)
        .normalize()
        .multiplyScalar(base + approach)
}

// Project a path onto every graded plot it crosses, so asphalt and parcels can
// never be hidden under the locally flattened terrain.
export function clearGround(point, radius, plots) {
    const direction = point.clone().normalize()
    let distance = point.length()
    for (const inverse of plots) {
        const local = direction.clone().applyQuaternion(inverse)
        if (local.y <= 0) continue
        let intersection = radius
        for (let pass = 0; pass < 4; pass++) {
            const x = local.x * intersection,
                z = local.z * intersection
            if (Math.max(Math.abs(x), Math.abs(z)) > 1.61) break
            intersection = (radius + siteGroundHeight(radius, x, z)) / local.y
            distance = Math.max(distance, intersection + 0.025)
        }
    }
    return direction.multiplyScalar(distance)
}
