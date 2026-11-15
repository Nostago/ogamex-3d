import * as THREE from './vendor/three.module.min.js'
import {
    sitePort,
    roadPoint,
    colonyDeckHeight,
} from './colonyGround.js'
import { surfacePosition } from './layout.js'

export function createInfrastructure(
    palette,
    colonySites,
    radius,
    { grounded = false } = {},
) {
    const group = new THREE.Group(),
        positions = [],
        lines = [],
        markers = []
    const nodes = [{ id: 'hub', normal: [0, 1, 0] }, ...colonySites]
    const point = (node, radius) =>
        new THREE.Vector3(...surfacePosition(node, radius))
    const deckHeight = grounded ? colonyDeckHeight : 0.23
    const routes = []
    const sample = (route, progress) => {
        const p = roadPoint(
            route.start,
            route.end,
            radius,
            progress,
            deckHeight,
        )
        return p
    }
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
        const start = sitePort(a, radius, grounded, b),
            end = sitePort(b, radius, grounded, a)
        routes.push({ start, end })
        let previous
        const conduitPoints = []
        for (let step = 0; step <= 32; step++) {
            const p = sample({ start, end }, step / 32)
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
                        .multiplyScalar(previous.right.length() + 0.017)
                        .toArray(),
                    ...right
                        .clone()
                        .normalize()
                        .multiplyScalar(right.length() + 0.017)
                        .toArray(),
                )
            }
            conduitPoints.push(
                right
                    .clone()
                    .normalize()
                    .multiplyScalar(right.length() + 0.05),
            )
            if (step % 3 === 1) {
                // Inset lane dashes and edge lights follow the surface normal.
                const orientation = new THREE.Quaternion().setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    normal,
                )
                markers.push({
                    position: p
                        .clone()
                        .normalize()
                        .multiplyScalar(p.length() + 0.02),
                    orientation,
                })
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
        const lane = new THREE.InstancedMesh(
            new THREE.BoxGeometry(0.07, 0.012, 0.09),
            palette.gold,
            markers.length,
        )
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
    hub.position.set(0, radius + (grounded ? -0.08 : 0.05), 0)
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
        block(
            hub,
            palette.warmWindow,
            side * 0.28,
            2.12,
            -0.1,
            0.055,
            0.04,
            0.055,
        )
    }
    block(hub, palette.insulation, 0, 1.31, -0.1, 0.7, 0.27, 0.48)
    block(hub, palette.window, 0, 1.33, 0.15, 0.62, 0.12, 0.02)
    const parcelBody = new THREE.MeshStandardMaterial({color:0xffb332,emissive:0x572400,roughness:0.45,metalness:0.3}), parcelStripe = new THREE.MeshStandardMaterial({color:0xf0f8ff,emissive:0x283b44,roughness:0.5})
    const parcels = []
    for (let i = 0; i < Math.min(6, routes.length * 2); i++) {
        const parcel = new THREE.Group()
        parcel.userData.transport = 'parcel'
        // Small cargo crates with securing bands; no cabins, wheels or chassis.
        block(parcel, parcelBody, 0, 0.095, 0, 0.23, 0.16, 0.29)
        block(parcel, parcelStripe, 0, 0.18, 0, 0.035, 0.012, 0.30)
        block(parcel, palette.cyan, 0, 0.10, 0.149, 0.12, 0.03, 0.008)
        group.add(parcel)
        parcels.push(parcel)
    }
    function animate(time, moving) {
        parcels.forEach((parcel, index) => {
            const phase = ((moving ? time * 0.045 : 0.35) + index * 0.29) % 2
            const route = routes[index % routes.length]
            const t = phase < 1 ? phase : 2 - phase
            const position = sample(route, t)
            const normal = position.clone().normalize()
            const forward = route.end
                .clone()
                .sub(route.start)
                .multiplyScalar(phase < 1 ? 1 : -1)
            forward.addScaledVector(normal, -forward.dot(normal)).normalize()
            const right = new THREE.Vector3()
                .crossVectors(normal, forward)
                .normalize()
            parcel.position.copy(position)
            parcel.quaternion.setFromRotationMatrix(
                new THREE.Matrix4().makeBasis(right, normal, forward),
            )
            // Crates load/unload outside the entrance instead of passing through walls.
            const fade = Math.min(1, t * 16, (1 - t) * 16)
            parcel.scale.setScalar(Math.max(0.001, fade))
        })
    }
    animate(0, false)
    return {
        group,
        roadCount: edges.length,
        parcelCount: parcels.length,
        routes,
        sample,
        animate,
        dispose() {
            parcelBody.dispose()
            parcelStripe.dispose()
            utilityMaterial.dispose()
        },
    }
}
