import * as THREE from './vendor/three.module.min.js'

import { shipCatalog } from './shipCatalog.js'

export function createShip(type, palette) {
    if (!Object.hasOwn(shipCatalog, type)) throw new Error('Unknown ship model')
    const group = new THREE.Group()
    function part(geometry, material, x = 0, y = 0, z = 0) {
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(x, y, z)
        group.add(mesh)
        return mesh
    }
    function box(material, x, y, z, w, h, d) {
        return part(new THREE.BoxGeometry(w, h, d), material, x, y, z)
    }
    if (type === 'lightFighter') {
        const nose = part(
            new THREE.ConeGeometry(0.22, 0.8, 6),
            palette.painted,
            0,
            0,
            -0.4,
        )
        nose.rotation.x = -Math.PI / 2
        box(palette.steel, 0, 0, 0.15, 0.4, 0.22, 0.8)
        box(palette.window, 0, 0.16, -0.08, 0.22, 0.09, 0.3)
        for (const side of [-1, 1]) {
            const wing = box(
                palette.painted,
                side * 0.42,
                -0.02,
                0.18,
                0.55,
                0.055,
                0.5,
            )
            wing.rotation.z = side * 0.16
            box(palette.dark, side * 0.6, 0, -0.08, 0.07, 0.09, 0.65)
            box(palette.gold, side * 0.32, 0.02, 0.46, 0.12, 0.13, 0.1)
        }
    } else if (type === 'smallCargo') {
        box(palette.painted, 0, 0, 0, 0.48, 0.35, 1.25)
        box(palette.window, 0, 0.12, -0.63, 0.35, 0.12, 0.03)
        for (const side of [-1, 1]) {
            box(palette.insulation, side * 0.39, -0.02, 0.1, 0.3, 0.35, 0.85)
            for (let i = 0; i < 3; i++)
                box(
                    palette.steel,
                    side * 0.39,
                    0.17,
                    -0.2 + i * 0.29,
                    0.34,
                    0.035,
                    0.035,
                )
            box(palette.gold, side * 0.55, 0, 0.1, 0.025, 0.08, 0.5)
        }
    } else {
        part(new THREE.IcosahedronGeometry(0.27, 0), palette.insulation)
        const dish = part(
            new THREE.SphereGeometry(
                0.24,
                12,
                8,
                0,
                Math.PI * 2,
                0,
                Math.PI / 2,
            ),
            palette.steel,
            0,
            0.3,
        )
        dish.scale.y = 0.3
        for (const side of [-1, 1]) {
            box(palette.steel, side * 0.32, 0, 0, 0.4, 0.025, 0.025)
            box(palette.panel, side * 0.52, 0, 0, 0.28, 0.03, 0.45)
        }
        box(palette.gold, 0, 0.46, 0, 0.025, 0.3, 0.025)
    }
    const engine = part(
        new THREE.CylinderGeometry(0.1, 0.13, 0.18, 10),
        palette.dark,
        0,
        0,
        type === 'probe' ? 0.26 : 0.65,
    )
    engine.rotation.x = Math.PI / 2
    const glow = part(
        new THREE.SphereGeometry(0.09, 10, 6),
        palette.cyan,
        0,
        0,
        type === 'probe' ? 0.35 : 0.78,
    )
    glow.scale.z = 1.7
    return group
}
