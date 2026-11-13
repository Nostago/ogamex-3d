import * as THREE from './vendor/three.module.min.js'
import { createShip } from './ships.js'

// Visual silhouettes only; no cargo, combat, speed or production values.
export function createShipVariant(type, palette) {
    if (['lightFighter', 'smallCargo', 'probe'].includes(type))
        return createShip(type, palette)
    const group = new THREE.Group()
    const add = (geometry, material, x = 0, y = 0, z = 0) => {
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(x, y, z)
        group.add(mesh)
        return mesh
    }
    const box = (material, x, y, z, w, h, d) =>
        add(new THREE.BoxGeometry(w, h, d), material, x, y, z)
    if (type === 'deathstar') {
        add(new THREE.SphereGeometry(0.85, 24, 16), palette.steel)
        const trench = add(
            new THREE.TorusGeometry(0.855, 0.025, 4, 48),
            palette.dark,
        )
        trench.rotation.x = Math.PI / 2
        const dish = add(
            new THREE.CylinderGeometry(0.23, 0.16, 0.04, 16),
            palette.dark,
            0.35,
            0.25,
            -0.72,
        )
        dish.rotation.x = Math.PI / 2
        for (let i = 0; i < 12; i++) {
            const a = (i * Math.PI) / 6
            box(
                palette.warmWindow,
                Math.cos(a) * 0.82,
                0.07,
                Math.sin(a) * 0.82,
                0.035,
                0.025,
                0.035,
            )
        }
        return group
    }
    const civil = ['largeCargo', 'colonyShip', 'recycler'].includes(type),
        heavy = ['destroyer', 'reaper', 'battleShip', 'battlecruiser'].includes(
            type,
        )
    const length = heavy ? 2.7 : civil ? 2.1 : 1.8,
        width = heavy ? 0.65 : 0.45
    box(palette.painted, 0, 0, 0, width, 0.2, length)
    const nose = add(
        new THREE.ConeGeometry(width * 0.65, 0.65, 4),
        palette.steel,
        0,
        0,
        -length / 2,
    )
    nose.rotation.x = -Math.PI / 2
    nose.rotation.z = Math.PI / 4
    box(palette.dark, 0, 0.15, 0.1, width * 0.8, 0.15, length * 0.65)
    box(palette.window, 0, 0.28, -0.12, width * 0.5, 0.06, 0.3)
    for (const side of [-1, 1]) {
        box(
            palette.steel,
            side * width * 0.75,
            -0.04,
            0.2,
            width * 0.65,
            0.13,
            length * 0.65,
        )
        for (let i = 0; i < 5; i++)
            box(
                palette.insulation,
                side * width * 0.75,
                0.05,
                -length * 0.2 + i * length * 0.11,
                width * 0.7,
                0.035,
                0.035,
            )
        if (civil)
            for (let i = 0; i < 3; i++)
                box(
                    type === 'colonyShip' ? palette.window : palette.insulation,
                    side * width,
                    -0.05,
                    -0.45 + i * 0.5,
                    0.32,
                    0.32,
                    0.42,
                )
        else
            for (let i = 0; i < (heavy ? 4 : 2); i++)
                box(
                    palette.dark,
                    side * width,
                    0.08,
                    -0.5 + i * 0.35,
                    0.075,
                    0.07,
                    0.35,
                )
        const engine = add(
            new THREE.CylinderGeometry(0.1, 0.14, 0.23, 10),
            palette.dark,
            side * width * 0.5,
            0,
            length * 0.52,
        )
        engine.rotation.x = Math.PI / 2
        const flame = add(
            new THREE.ConeGeometry(0.09, 0.45, 10),
            palette.cyan,
            side * width * 0.5,
            0,
            length * 0.68,
        )
        flame.rotation.x = Math.PI / 2
        if (type === 'reaper' || type === 'heavyFighter') {
            const wing = box(
                palette.painted,
                side * width * 1.15,
                -0.08,
                0.2,
                0.65,
                0.04,
                0.6,
            )
            wing.rotation.z = side * 0.3
        }
    }
    if (type === 'recycler') {
        const dish = add(
            new THREE.TorusGeometry(0.3, 0.04, 6, 16),
            palette.gold,
            0,
            0.25,
            -0.5,
        )
        dish.rotation.x = 0.5
    }
    return group
}
