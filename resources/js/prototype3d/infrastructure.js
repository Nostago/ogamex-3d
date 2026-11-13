import * as THREE from './vendor/three.module.min.js'
import { surfacePosition } from './layout.js'

export function createInfrastructure(palette, colonySites, radius) {
    const group = new THREE.Group(),
        positions = [],
        lines = [],
        markers = []
    const nodes = [{ id: 'hub', normal: [0, 1, 0] }, ...colonySites]
    const point = (node, radius) =>
        new THREE.Vector3(...surfacePosition(node, radius))
    const edges = [],
        seen = new Set()
    function connect(a, b) {
        if (!a || !b || a.id === b.id) return
        const key = [a.id, b.id].sort().join(':')
        if (seen.has(key)) return
        seen.add(key)
        edges.push([a, b])
    }
    for (let i = 1; i < nodes.length; i++) {
        const nearest = nodes
            .slice(0, i)
            .sort(
                (a, b) =>
                    point(nodes[i], radius).distanceToSquared(
                        point(a, radius),
                    ) -
                    point(nodes[i], radius).distanceToSquared(point(b, radius)),
            )[0]
        connect(nearest, nodes[i])
    }
    for (const [a, b] of [
        [0, 1],
        [1, 3],
        [3, 2],
        [2, 0],
    ])
        connect(colonySites[a], colonySites[b])
    for (const [a, b] of edges) {
        const start = point(a, radius),
            end = point(b, radius)
        let previous
        const conduitPoints = []
        for (let step = 0; step <= 16; step++) {
            const p = start
                .clone()
                .lerp(end, step / 16)
                .normalize()
                .multiplyScalar(radius + 0.035)
            const normal = p.clone().normalize(),
                tangent = end.clone().sub(start).normalize()
            const side = new THREE.Vector3()
                .crossVectors(normal, tangent)
                .normalize()
                .multiplyScalar(0.2)
            const left = p.clone().add(side),
                right = p.clone().sub(side)
            if (previous) {
                for (const v of [
                    previous.left,
                    previous.right,
                    left,
                    left,
                    previous.right,
                    right,
                ])
                    positions.push(...v.toArray())
                // A separate utility conduit follows one road edge.
                lines.push(
                    ...previous.right
                        .clone()
                        .normalize()
                        .multiplyScalar(radius + 0.052)
                        .toArray(),
                    ...right
                        .clone()
                        .normalize()
                        .multiplyScalar(radius + 0.052)
                        .toArray(),
                )
            }
            conduitPoints.push(
                right
                    .clone()
                    .normalize()
                    .multiplyScalar(radius + 0.085),
            )
            if (step % 3 === 1) {
                // Inset lane dashes and edge lights follow the surface normal.
                const orientation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
                markers.push({ position: p.clone().normalize().multiplyScalar(radius + 0.055), orientation })
            }
            previous = { left, right }
        }
        if (
            colonySites.slice(0, 4).includes(a) &&
            colonySites.slice(0, 4).includes(b)
        ) {
            const conduit = new THREE.Mesh(
                new THREE.TubeGeometry(
                    new THREE.CatmullRomCurve3(conduitPoints),
                    16,
                    0.035,
                    6,
                    false,
                ),
                palette.steel,
            )
            group.add(conduit)
        }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3),
    )
    geometry.computeVertexNormals()
    const roads = new THREE.Mesh(geometry, palette.dark)
    roads.receiveShadow = true
    group.add(roads)
    if (markers.length) {
        const lane = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.012, 0.09), palette.gold, markers.length)
        const transform = new THREE.Matrix4()
        markers.forEach(({ position, orientation }, i) => {
            transform.compose(position, orientation, new THREE.Vector3(1, 1, 1))
            lane.setMatrixAt(i, transform)
        })
        group.add(lane)
    }
    const utilityGeometry = new THREE.BufferGeometry()
    utilityGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(lines, 3),
    )
    const utilityMaterial = new THREE.LineBasicMaterial({ color: 0x8c9586 })
    group.add(new THREE.LineSegments(utilityGeometry, utilityMaterial))
    function block(parent, material, x, y, z, w, h, d) {
        const object = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
        object.position.set(x, y, z)
        parent.add(object)
        return object
    }
    const hub = new THREE.Group()
    hub.position.set(0, radius + 0.05, 0)
    group.add(hub)
    block(hub, palette.concrete, 0, 0.05, 0, 0.9, 0.13, 0.9)
    block(hub, palette.painted, 0, 0.32, 0, 0.65, 0.45, 0.65)
    block(hub, palette.window, 0, 0.43, 0.34, 0.5, 0.12, 0.02)
    block(hub, palette.steel, 0, 0.6, 0, 0.04, 0.3, 0.04)
    // A decorative traffic-control tower marks the connected settlement centre.
    for (const side of [-1, 1]) {
        block(hub, palette.painted, side * 0.28, 0.97, -0.1, 0.16, 1.45, 0.2)
        block(hub, palette.cyan, side * 0.28, 1.12, 0.01, 0.025, 1.2, 0.015)
        block(hub, palette.steel, side * 0.28, 1.87, -0.1, 0.025, 0.48, 0.025)
        block(hub, palette.warmWindow, side * 0.28, 2.12, -0.1, 0.055, 0.04, 0.055)
    }
    block(hub, palette.insulation, 0, 1.31, -0.1, 0.7, 0.27, 0.48)
    block(hub, palette.window, 0, 1.33, 0.15, 0.62, 0.12, 0.02)
    const vehicles = []
    for (let i = 0; i < Math.min(3, edges.length); i++) {
        const vehicle = new THREE.Group()
        block(vehicle, palette.steel, 0, 0.08, 0, 0.25, 0.12, 0.4)
        block(vehicle, palette.gold, 0, 0.18, -0.07, 0.23, 0.13, 0.23)
        block(vehicle, palette.window, 0, 0.15, 0.17, 0.2, 0.12, 0.1)
        for (const side of [-1, 1])
            for (const z of [-0.13, 0.13]) {
                const wheel = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.065, 0.065, 0.055, 8),
                    palette.dark,
                )
                wheel.rotation.z = Math.PI / 2
                wheel.position.set(side * 0.14, 0.04, z)
                vehicle.add(wheel)
            }
        group.add(vehicle)
        vehicles.push(vehicle)
    }
    function animate(time, moving) {
        vehicles.forEach((vehicle, index) => {
            // Shuttle along an existing road, reversing at its endpoints.
            const phase = ((moving ? time * 0.06 : 0) + index * 0.55) % 2
            const edge = edges[index % edges.length]
            const start = point(edge[phase < 1 ? 0 : 1], radius),
                end = point(edge[phase < 1 ? 1 : 0], radius)
            const normal = start
                .clone()
                .lerp(end, phase % 1)
                .normalize()
            const forward = end.clone().sub(start)
            forward.addScaledVector(normal, -forward.dot(normal)).normalize()
            const right = new THREE.Vector3()
                .crossVectors(normal, forward)
                .normalize()
            vehicle.position.copy(normal).multiplyScalar(radius + 0.13)
            vehicle.quaternion.setFromRotationMatrix(
                new THREE.Matrix4().makeBasis(right, normal, forward),
            )
        })
    }
    animate(0, false)
    return {
        group,
        roadCount: edges.length,
        animate,
        dispose() {
            utilityMaterial.dispose()
        },
    }
}
