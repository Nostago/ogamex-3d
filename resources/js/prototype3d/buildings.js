import * as THREE from './vendor/three.module.min.js'

// Shared architecture for the live globe, detail inspection and offline demo.
export const buildingModelTypes = Object.freeze([
    'metal', 'crystal', 'deuterium', 'solar', 'fusion',
    'metalStorage', 'crystalStorage', 'deuteriumStorage',
    'robotics', 'shipyard', 'research', 'nanite', 'terraformer',
    'depot', 'silo', 'dock', 'lunar', 'phalanx', 'jumpGate',
    'rocket', 'laser', 'heavyLaser', 'gauss', 'ion', 'plasma',
    'smallShield', 'largeShield', 'interceptor', 'missile',
])

// Bake hundreds of architectural details into a few material batches.
function consolidate(root) {
    root.updateMatrixWorld(true)
    const batches = new Map()
    for (const object of [...root.children]) {
        const geometry = object.geometry.index
            ? object.geometry.toNonIndexed() : object.geometry.clone()
        geometry.applyMatrix4(object.matrixWorld)
        if (!batches.has(object.material)) batches.set(object.material, [])
        batches.get(object.material).push(geometry)
        object.geometry.dispose()
        root.remove(object)
    }
    for (const [material, parts] of batches) {
        const geometry = new THREE.BufferGeometry()
        for (const [name, size] of [['position', 3], ['normal', 3], ['uv', 2]]) {
            const count = parts.reduce((n, part) => n + part.attributes.position.count, 0)
            const array = new Float32Array(count * size)
            let offset = 0
            for (const part of parts) {
                if (part.getAttribute(name)) array.set(part.getAttribute(name).array, offset)
                offset += part.attributes.position.count * size
            }
            geometry.setAttribute(name, new THREE.BufferAttribute(array, size))
        }
        parts.forEach((part) => part.dispose())
        geometry.computeBoundingSphere()
        const object = new THREE.Mesh(geometry, material)
        object.castShadow = object.receiveShadow = true
        root.add(object)
    }
}

export function createBuilding(id, level, palette) {
    if (!buildingModelTypes.includes(id)) throw new Error(`Unknown model: ${id}`)
    const group = new THREE.Group(), motion = [],
        tier = Math.min(3, Math.max(0, Math.floor((Math.max(1, level) - 1) / 2)))
    const { steel, painted, dark, concrete, insulation, gold, cyan,
        window: glass, warmWindow, panel, purple, ore } = palette
    function mesh(geometry, material, x, y, z) {
        const object = new THREE.Mesh(geometry, material)
        object.position.set(x, y, z)
        group.add(object)
        return object
    }
    const box = (m, x, y, z, w, h, d) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z)
    function hull(m, x, y, z, w, h, d) {
        const shape = new THREE.Shape(), b = Math.min(w, h, d, 0.16) * 0.25
        shape.moveTo(-w / 2 + b, -h / 2)
        for (const p of [[w / 2 - b, -h / 2], [w / 2, -h / 2 + b],
            [w / 2, h / 2 - b], [w / 2 - b, h / 2], [-w / 2 + b, h / 2],
            [-w / 2, h / 2 - b], [-w / 2, -h / 2 + b]]) shape.lineTo(...p)
        shape.closePath()
        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: d - b * 2, steps: 1, bevelEnabled: true,
            bevelThickness: b, bevelSize: b, bevelSegments: 2,
        })
        geometry.translate(0, 0, -d / 2 + b)
        return mesh(geometry, m, x, y, z)
    }
    const cylinder = (m, x, y, z, r, h) =>
        mesh(new THREE.CylinderGeometry(r, r, h, 24), m, x, y, z)
    function ring(m, x, y, z, r, thickness = 0.025) {
        const object = mesh(new THREE.TorusGeometry(r, thickness, 6, 48), m, x, y, z)
        object.rotation.x = Math.PI / 2
        return object
    }
    function beam(m, a, b, radius = 0.025) {
        const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b)
        const object = cylinder(m, 0, 0, 0, radius, from.distanceTo(to))
        object.position.copy(from).add(to).multiplyScalar(0.5)
        object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize())
        return object
    }
    function pipe(points, radius = 0.035, material = steel) {
        return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(
            points.map((p) => new THREE.Vector3(...p))), 18, radius, 6, false), material, 0, 0, 0)
    }
    function rail(x, y, z, length) {
        for (let i = 0; i <= 4; i++) box(steel, x - length / 2 + i * length / 4, y + 0.11, z, 0.018, 0.22, 0.018)
        for (const h of [0.11, 0.22]) box(steel, x, y + h, z, length, 0.015, 0.015)
    }
    function windows(x, y, z, width, rows = 2) {
        for (let row = 0; row < rows; row++) {
            box(dark, x, y + row * 0.15, z, width, 0.085, 0.025)
            for (let i = 0; i < 5; i++) box((i + row) % 3 ? warmWindow : glass,
                x - width * 0.4 + i * width * 0.2, y + row * 0.15,
                z + 0.016, width * 0.13, 0.052, 0.012)
        }
    }
    function vents(x, y, z, width = 0.4) {
        box(dark, x, y, z, width, 0.27, 0.035)
        for (let i = 0; i < 6; i++) box(steel, x, y - 0.1 + i * 0.04, z + 0.025, width * 0.86, 0.015, 0.025)
    }
    function tower(x, z, height, width = 0.5) {
        hull(painted, x, 0.18 + height / 2, z, width, height, width * 0.8)
        hull(dark, x, height + 0.12, z, width * 1.2, 0.12, width)
        for (const side of [-1, 1]) {
            box(steel, x + side * width * 0.43, height / 2 + 0.2, z + width * 0.43, 0.04, height, 0.05)
            box(cyan, x + side * width * 0.34, height / 2 + 0.2, z + width * 0.44, 0.018, height * 0.7, 0.025)
        }
        windows(x, height * 0.6, z + width * 0.41, width * 0.7, 2 + tier)
        beam(steel, [x, height + 0.2, z], [x, height + 0.65, z], 0.013)
        box(warmWindow, x, height + 0.66, z, 0.06, 0.045, 0.06)
    }
    function tank(x, z, height, radius = 0.29, material = insulation) {
        cylinder(dark, x, 0.25, z, radius * 1.1, 0.13)
        cylinder(material, x, height / 2 + 0.27, z, radius, height)
        const cap = mesh(new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), steel, x, height + 0.27, z)
        cap.scale.y = 0.45
        for (const y of [0.4, height * 0.5 + 0.27, height + 0.19]) ring(steel, x, y, z, radius + 0.006, 0.018)
        for (let y = 0.4; y < height + 0.2; y += 0.14) box(steel, x + radius * 0.86, y, z + radius * 0.65, 0.13, 0.013, 0.025)
        box(gold, x, 0.65, z + radius + 0.005, radius * 0.6, 0.15, 0.014)
        pipe([[x, height + 0.3, z], [x, height + 0.46, z], [x * 0.5, height + 0.46, z * 0.5]])
    }
    function hall(x, z, width = 1, depth = 0.6, height = 0.6) {
        hull(painted, x, 0.2 + height / 2, z, width, height, depth)
        hull(steel, x, 0.24 + height, z, width + 0.06, 0.08, depth + 0.05)
        windows(x, height * 0.65, z + depth / 2 + 0.025, width * 0.8)
        vents(x, 0.37, z + depth / 2 + 0.03, width * 0.38)
        for (const s of [-1, 1]) box(dark, x + s * width * 0.35, height + 0.32, z, width * 0.18, 0.09, depth * 0.7)
    }
    // Terraced industrial plot; the open entrance meets the road network.
    hull(concrete, 0, 0.065, 0, 2.65, 0.16, 2.55)
    hull(dark, 0, 0.15, 0, 2.55, 0.065, 2.45)
    for (const s of [-1, 1]) {
        box(steel, s * 1.26, 0.22, 0, 0.035, 0.12, 2.4)
        box(cyan, s * 1.28, 0.23, -0.3, 0.018, 0.025, 1.3)
        rail(s * 0.9, 0.2, -1.15, 0.6)
        for (let i = 0; i < 4; i++) box(gold, s * 0.55 + (i - 1.5) * 0.09, 0.191, 1.08, 0.04, 0.009, 0.18).rotation.y = -0.45
        beam(steel, [s * 1.15, 0.18, 0.9], [s * 1.15, 0.68, 0.9], 0.018)
        box(warmWindow, s * 1.15, 0.69, 0.9, 0.12, 0.035, 0.07)
    }
    box(dark, 0, 0.19, 1.22, 0.5, 0.04, 0.24)
    hull(painted, -1.05, 0.37, -0.93, 0.25, 0.34, 0.28)
    box(warmWindow, -1.05, 0.43, -0.78, 0.13, 0.065, 0.012)

    if (id === 'metal') {
        cylinder(ore, -0.43, 0.2, 0.12, 0.64, 0.035)
        for (let i = 0; i < 3; i++) ring(dark, -0.43, 0.22 + i * 0.015, 0.12, 0.55 - i * 0.12, 0.045)
        const h = 1.65 + tier * 0.26
        for (const x of [-0.84, -0.05]) for (const z of [-0.27, 0.45]) {
            beam(steel, [x, 0.22, z], [x * 0.8 - 0.09, h, z * 0.8], 0.045)
            beam(steel, [x, 0.4, z], [x === -0.84 ? -0.13 : -0.76, h - 0.15, z], 0.022)
        }
        hull(painted, -0.44, h, 0.06, 1.05, 0.22, 0.85)
        rail(-0.44, h + 0.13, 0.51, 1.02)
        windows(-0.44, h, 0.5, 0.65, 1)
        ring(gold, -0.44, h + 0.35, 0.06, 0.23, 0.035).rotation.x = 0
        for (let i = 0; i < 6; i++) box(steel, -0.44, h + 0.35, 0.06, 0.42, 0.018, 0.025).rotation.z = i * Math.PI / 6
        beam(dark, [-0.53, 0.25, 0.08], [-0.53, h + 0.35, 0.08], 0.012)
        hall(0.67, -0.25, 0.73, 1.35, 0.9 + tier * 0.1)
        for (let i = 0; i < 5; i++) {
            box(dark, -0.43, 0.32 + i * 0.025, 0.57 + i * 0.12, 0.4, 0.04, 0.1).rotation.x = -0.18
            mesh(new THREE.DodecahedronGeometry(0.055), ore, -0.48 + (i % 2) * 0.09, 0.39 + i * 0.025, 0.57 + i * 0.12)
        }
        tank(0.85, -0.82, 0.95, 0.13, steel)
    } else if (id === 'crystal') {
        cylinder(dark, 0, 0.28, 0.08, 0.67, 0.18)
        ring(steel, 0, 0.41, 0.08, 0.69, 0.05)
        for (let i = 0; i < 6 + tier * 2; i++) {
            const a = i * 2.39996, r = 0.18 + (i % 3) * 0.13
            mesh(new THREE.ConeGeometry(0.1 + i % 2 * 0.03, 0.52 + (i % 3) * 0.2, 6), i % 2 ? purple : cyan, Math.cos(a) * r, 0.65, 0.08 + Math.sin(a) * r).rotation.z = Math.cos(a) * 0.2
        }
        for (const s of [-1, 1]) {
            tower(s * 0.91, -0.57, 1.2 + tier * 0.16, 0.31)
            beam(steel, [s * 0.91, 1.4, -0.57], [s * 0.35, 1.75, 0.12], 0.04)
            pipe([[s * 0.9, 0.4, -0.4], [s * 0.9, 0.4, 0.66], [s * 0.3, 0.4, 0.66]])
        }
        hall(0, -0.85, 1.15, 0.45, 0.5)
        rail(0, 0.22, 0.84, 1.5)
    } else if (id === 'deuterium' || id === 'deuteriumStorage') {
        for (let i = 0; i < 3 + (tier > 1 ? 1 : 0); i++) tank((i % 2 - 0.5) * 0.85, Math.floor(i / 2) * 0.86 - 0.55, (id === 'deuteriumStorage' ? 1.45 : 1.1) + tier * 0.18, 0.31)
        hall(0.6, 0.68, 0.66, 0.45, 0.44)
        pipe([[-0.9, 0.32, -0.6], [-0.9, 0.32, 0.85], [0.6, 0.32, 0.85]], 0.055)
    } else if (id === 'solar') {
        for (let i = 0; i < 4 + tier * 2; i++) {
            const x = (i % 2 - 0.5) * 1.12, z = Math.floor(i / 2) * 0.39 - 0.78, h = 0.58 + Math.floor(i / 2) * 0.08
            for (const s of [-1, 1]) beam(steel, [x + s * 0.37, 0.2, z], [x + s * 0.37, h, z], 0.02)
            box(steel, x, h, z, 1.04, 0.055, 0.35).rotation.x = -0.32
            box(panel, x, h + 0.035, z, 0.99, 0.015, 0.31).rotation.x = -0.32
        }
        hall(0, 1.02, 0.75, 0.22, 0.36)
        pipe([[-1.04, 0.24, -0.85], [-1.04, 0.24, 0.94], [0, 0.24, 0.94]], 0.025, dark)
    } else if (id === 'shipyard' || id === 'dock') {
        hull(steel, 0, 0.28, 0.08, 1.35, 0.22, 2.12)
        box(dark, 0, 0.4, 0.08, 0.94, 0.03, 1.96)
        for (const s of [-1, 1]) {
            box(cyan, s * 0.53, 0.42, 0.08, 0.035, 0.02, 1.9)
            for (const z of [-0.75, 0.55]) {
                hull(painted, s * 0.98, 0.88, z, 0.28, 1.4, 0.34)
                beam(steel, [s * 0.98, 0.35, z], [s * 0.98, 1.43, z + 0.27])
            }
            hall(s * 0.98, -0.09, 0.31, 0.55, 0.7)
        }
        for (const z of [-0.75, 0.55]) {
            hull(steel, 0, 1.63 + tier * 0.12, z, 2.24, 0.16, 0.27)
            box(gold, 0.13, 1.5 + tier * 0.12, z, 0.35, 0.13, 0.25)
            beam(dark, [0.13, 1.5, z], [0.13, 0.78, z], 0.012)
        }
        tower(-0.85, -0.93, 1.75 + tier * 0.18, 0.35)
        for (let i = 0; i < 6; i++) box(gold, 0, 0.425, -0.65 + i * 0.27, 0.16, 0.008, 0.045)
    } else if (['research', 'nanite', 'robotics'].includes(id)) {
        hall(0, 0, 1.7, 1.25, 0.72)
        hull(insulation, 0, 1.02, -0.12, 1.12, 0.4, 0.92)
        windows(0, 1.02, 0.36, 0.92)
        for (const s of [-1, 1]) tower(s * 0.68, -0.42, 1.4 + tier * 0.32 + (id === 'research' ? 0.2 : 0), 0.38)
        if (id === 'research') {
            mesh(new THREE.SphereGeometry(0.37, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), glass, 0, 1.24, -0.1).scale.y = 0.7
            ring(steel, 0, 1.25, -0.1, 0.39)
            for (let i = 0; i < 8; i++) {
                const a = i * Math.PI / 4
                beam(steel, [Math.cos(a) * 0.37, 1.25, -0.1 + Math.sin(a) * 0.37], [0, 1.52, -0.1], 0.01)
            }
        } else {
            for (const s of [-1, 1]) {
                beam(steel, [s * 0.63, 0.25, 0.77], [s * 0.63, 0.85, 0.77], 0.055)
                beam(gold, [s * 0.63, 0.85, 0.77], [s * 0.28, 1.05, 0.82], 0.045)
                beam(steel, [s * 0.28, 1.05, 0.82], [s * 0.12, 0.63, 0.82])
                cylinder(dark, s * 0.63, 0.42, 0.77, 0.11, 0.12)
            }
            box(id === 'nanite' ? purple : cyan, 0, 0.38, 0.85, 0.28, 0.12, 0.3)
        }
        rail(0, 0.84, 0.65, 1.5)
    } else if (['metalStorage', 'crystalStorage', 'depot'].includes(id)) {
        hall(0, -0.14, 1.9, 1.35, 0.95 + tier * 0.14)
        for (let i = 0; i < 3; i++) {
            const x = -0.59 + i * 0.59
            hull(dark, x, 0.61, 0.57, 0.43, 0.7, 0.04)
            for (let y = 0.32; y < 0.92; y += 0.1) box(steel, x, y, 0.601, 0.38, 0.02, 0.012)
            box(id === 'crystalStorage' ? cyan : gold, x, 1.02, 0.59, 0.4, 0.035, 0.02)
        }
        for (let i = 0; i < 2 + tier; i++) hull(id === 'crystalStorage' ? insulation : painted, (i % 2 - 0.5) * 0.6, 0.33, 0.83 + Math.floor(i / 2) * 0.16, 0.46, 0.25, 0.14)
        rail(0, 1.07 + tier * 0.14, 0.52, 1.8)
    } else if (['fusion', 'terraformer', 'jumpGate'].includes(id)) {
        const gate = id === 'jumpGate'
        hall(0, -0.18, 1.8, 1.3, 0.55)
        const reactor = ring(steel, 0, gate ? 1.35 : 1.02, 0, gate ? 0.83 : 0.61, 0.11)
        const glow = ring(id === 'terraformer' ? purple : cyan, 0, gate ? 1.35 : 1.09, 0, gate ? 0.79 : 0.6, 0.035)
        if (gate) reactor.rotation.x = glow.rotation.x = 0
        for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4
            if (gate) hull(insulation, Math.cos(a) * 0.84, 1.35 + Math.sin(a) * 0.84, 0, 0.17, 0.23, 0.24).rotation.z = a
            else {
                hull(insulation, Math.cos(a) * 0.7, 0.93, Math.sin(a) * 0.7, 0.18, 0.5, 0.18)
                pipe([[Math.cos(a) * 0.7, 0.9, Math.sin(a) * 0.7], [Math.cos(a) * 0.95, 0.5, Math.sin(a) * 0.95]])
            }
        }
        tower(-0.96, -0.69, 1.55 + tier * 0.2, 0.3)
        tank(0.96, -0.68, 1.15 + tier * 0.15, 0.18, steel)
    } else if (id === 'lunar') {
        hall(0, 0.6, 1.6, 0.55, 0.45)
        for (const s of [-1, 1]) {
            mesh(new THREE.SphereGeometry(0.57, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), insulation, s * 0.56, 0.26, -0.29)
            ring(steel, s * 0.56, 0.28, -0.29, 0.58, 0.045)
        }
        tower(0.93, 0.56, 1.2 + tier * 0.2, 0.27)
    } else if (id === 'phalanx') {
        hall(0, 0.35, 1.2, 0.9, 0.6)
        cylinder(steel, 0, 1.03, -0.16, 0.15, 1.25)
        const dish = mesh(new THREE.SphereGeometry(0.83, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), insulation, 0, 1.65, -0.16)
        dish.scale.y = 0.32
        dish.rotation.x = 0.6
        beam(steel, [-0.55, 1.77, -0.25], [0, 2.2, 0.16])
        beam(steel, [0.55, 1.77, -0.25], [0, 2.2, 0.16])
        box(cyan, 0, 2.2, 0.16, 0.1, 0.12, 0.12)
        tower(-0.91, -0.76, 1.3 + tier * 0.2, 0.25)
    } else if (['smallShield', 'largeShield'].includes(id)) {
        cylinder(dark, 0, 0.34, 0, 0.85, 0.3)
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3, x = Math.cos(a) * 0.72, z = Math.sin(a) * 0.72
            cylinder(steel, x, 0.85, z, 0.1, 1.05)
            box(cyan, x, 1.4, z, 0.14, 0.15, 0.14)
            beam(steel, [x, 0.6, z], [0, 0.7, 0])
        }
        mesh(new THREE.SphereGeometry(0.91, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), glass, 0, 0.6, 0).scale.y = id === 'largeShield' ? 1.25 : 0.8
        ring(cyan, 0, 0.62, 0, 0.92)
    } else if (['silo', 'rocket', 'interceptor', 'missile'].includes(id)) {
        hall(-0.7, -0.45, 0.45, 0.8, 0.65)
        for (let i = 0; i < 4 + tier; i++) {
            const x = (i % 2 - 0.5) * 0.68 + 0.18, z = Math.floor(i / 2) * 0.59 - 0.65
            cylinder(steel, x, 0.3, z, 0.25, 0.2)
            cylinder(dark, x, 0.41, z, 0.2, 0.025)
            if (id !== 'silo') {
                cylinder(insulation, x, 0.76, z, 0.065, 0.65)
                mesh(new THREE.ConeGeometry(0.065, 0.22, 16), gold, x, 1.18, z)
                for (let f = 0; f < 4; f++) box(steel, x, 0.52, z, 0.19, 0.18, 0.025).rotation.y = f * Math.PI / 2
            } else {
                ring(gold, x, 0.43, z, 0.21, 0.012)
                box(steel, x, 0.44, z, 0.35, 0.025, 0.05)
            }
        }
    } else {
        const heavy = ['gauss', 'plasma', 'heavyLaser'].includes(id)
        cylinder(steel, 0, 0.39, 0, 0.72, 0.36)
        ring(gold, 0, 0.59, 0, 0.66, 0.018)
        hull(painted, 0, 0.85, -0.1, heavy ? 1.2 : 0.9, 0.52, 0.9)
        const count = id === 'heavyLaser' ? 2 : 1
        for (let i = 0; i < count; i++) {
            const x = count === 2 ? (i - 0.5) * 0.44 : 0
            cylinder(steel, x, 0.98, 0.69, id === 'plasma' ? 0.17 : 0.1, 1.15).rotation.x = Math.PI / 2 + 0.12
            for (let j = 0; j < 5; j++) ring(id === 'ion' || id === 'plasma' ? cyan : dark, x, 0.98, 0.28 + j * 0.17, id === 'plasma' ? 0.2 : 0.12).rotation.x = 0
            box(id === 'plasma' ? purple : cyan, x, 1.04, 1.23, 0.11, 0.11, 0.025)
        }
        for (const s of [-1, 1]) {
            tank(s * 0.86, -0.55, 0.65, 0.13, steel)
            vents(s * 0.47, 0.88, 0.37, 0.23)
            pipe([[s * 0.83, 0.65, -0.55], [s * 0.7, 0.65, -0.15], [s * 0.46, 0.85, -0.1]])
        }
    }
    for (let i = 0; i < tier; i++) {
        const z = -0.68 + i * 0.36
        hull(steel, -1.04, 0.37, z, 0.22, 0.3, 0.27)
        vents(-1.04, 0.38, z + 0.145, 0.16)
        box(cyan, -1.04, 0.55, z, 0.1, 0.025, 0.18)
    }
    if (id === 'dock') {
        for (const s of [-1, 1]) {
            hull(steel, s * 0.62, 0.65, 0.91, 0.22, 0.45, 0.22)
            box(cyan, s * 0.62, 0.89, 0.91, 0.2, 0.025, 0.18)
        }
    }
    if (id === 'depot') tower(0.85, -0.7, 1.8 + tier * 0.2, 0.34)
    consolidate(group)
    // A few moving mechanical parts give life to the colony without extra lights.
    {
        const fan = new THREE.Group()
        fan.position.set(-1.05, 0.42, -0.74)
        const casing = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.035, 20), dark, -1.05, 0.42, -0.77)
        casing.rotation.x = Math.PI / 2
        for (let i = 0; i < 3; i++) {
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.016, 0.012), steel)
            blade.rotation.z = i * Math.PI / 3
            fan.add(blade)
        }
        group.add(fan)
        motion.push((time) => { fan.rotation.z = time * 1.1 })
    }
    group.scale.y = 1 + tier * 0.015
    const bounds = new THREE.Box3().setFromObject(group)
    group.userData.modelRevision = 'colony-2'
    group.userData.modelType = id
    group.userData.visualTier = tier
    return { group, motion, labelHeight: bounds.max.y + 0.22 }
}
