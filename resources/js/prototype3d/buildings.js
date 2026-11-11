import * as THREE from './vendor/three.module.min.js'

// Compact industrial assemblies, all procedural and using shared materials.
export function createBuilding(id, level, palette) {
    const group = new THREE.Group(),
        motion = []
    const {
        steel,
        painted,
        dark,
        concrete,
        insulation,
        gold,
        cyan,
        window: glass,
        warmWindow,
        panel,
        purple,
        ore,
    } = palette
    function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
        const object = new THREE.Mesh(geometry, material)
        object.position.set(x, y, z)
        object.castShadow = object.receiveShadow = true
        parent.add(object)
        return object
    }
    function box(parent, material, x, y, z, width, height, depth) {
        return mesh(
            new THREE.BoxGeometry(width, height, depth),
            material,
            parent,
            x,
            y,
            z,
        )
    }
    function housing(parent, material, x, y, z, width, height, depth) {
        const shape = new THREE.Shape()
        shape.moveTo(-width / 2, -height / 2)
        shape.lineTo(width / 2, -height / 2)
        shape.lineTo(width / 2, height / 2)
        shape.lineTo(-width / 2, height / 2)
        shape.closePath()
        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: depth - 0.04,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.02,
            bevelSegments: 1,
            steps: 1,
        })
        geometry.translate(0, 0, -depth / 2 + 0.02)
        return mesh(geometry, material, parent, x, y, z)
    }
    function cylinder(
        parent,
        material,
        x,
        y,
        z,
        radius,
        height,
        segments = 16,
    ) {
        return mesh(
            new THREE.CylinderGeometry(radius, radius, height, segments),
            material,
            parent,
            x,
            y,
            z,
        )
    }
    function beam(parent, material, from, to, width = 0.04) {
        const a = new THREE.Vector3(...from),
            b = new THREE.Vector3(...to)
        const member = cylinder(
            parent,
            material,
            0,
            0,
            0,
            width,
            a.distanceTo(b),
            6,
        )
        member.position.copy(a).add(b).multiplyScalar(0.5)
        member.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            b.sub(a).normalize(),
        )
        return member
    }
    function pipe(parent, material, points, radius = 0.045) {
        const curve = new THREE.CatmullRomCurve3(
            points.map((point) => new THREE.Vector3(...point)),
        )
        return mesh(
            new THREE.TubeGeometry(curve, 12, radius, 6, false),
            material,
            parent,
        )
    }
    function fan(parent, x, y, z, radius = 0.16) {
        cylinder(parent, dark, x, y, z, radius * 1.15, 0.06).rotation.x =
            Math.PI / 2
        const rotor = new THREE.Group()
        rotor.position.set(x, y, z + 0.04)
        parent.add(rotor)
        for (let blade = 0; blade < 3; blade++) {
            const vane = box(rotor, steel, 0, 0, 0, radius * 1.7, 0.045, 0.025)
            vane.rotation.z = (blade * Math.PI) / 3
            vane.castShadow = false
        }
        motion.push((time) => {
            rotor.rotation.z = time * 1.4
        })
    }
    function ladder(parent, x, bottom, top, z) {
        for (const side of [-1, 1])
            beam(
                parent,
                steel,
                [x + side * 0.1, bottom, z],
                [x + side * 0.1, top, z],
                0.018,
            )
        for (let y = bottom + 0.08; y < top; y += 0.13)
            beam(parent, steel, [x - 0.1, y, z], [x + 0.1, y, z], 0.012)
    }
    function railing(parent, x, y, z, width) {
        for (const side of [-1, 0, 1])
            beam(
                parent,
                gold,
                [x + (side * width) / 2, y, z],
                [x + (side * width) / 2, y + 0.27, z],
                0.014,
            )
        for (const h of [0.14, 0.27])
            beam(
                parent,
                gold,
                [x - width / 2, y + h, z],
                [x + width / 2, y + h, z],
                0.012,
            )
    }
    const foot = cylinder(group, concrete, 0, 0.03, 0, 1.38, 0.34, 16)
    foot.receiveShadow = true
    const contact = mesh(
        new THREE.CircleGeometry(1.65, 40),
        palette.contact,
        group,
        0,
        0.012,
        0,
    )
    contact.rotation.x = -Math.PI / 2
    contact.castShadow = contact.receiveShadow = false
    mesh(
        new THREE.TorusGeometry(1.29, 0.025, 6, 48),
        steel,
        group,
        0,
        0.21,
        0,
    ).rotation.x = Math.PI / 2
    for (let stripe = 0; stripe < 6; stripe++) {
        const a = (stripe * Math.PI) / 3
        const marking = box(
            group,
            gold,
            Math.cos(a) * 1.21,
            0.207,
            Math.sin(a) * 1.21,
            0.15,
            0.01,
            0.06,
        )
        marking.rotation.y = -a
    }
    const h = 1.15 + level * 0.085
    if (id === 'metal') {
        cylinder(group, dark, -0.32, 0.22, 0, 0.38, 0.04, 20)
        for (const x of [-0.72, 0.08]) {
            for (const z of [-0.38, 0.38]) {
                beam(group, painted, [x, 0.23, z], [x, h + 0.3, z], 0.055)
            }
            beam(group, steel, [x, 0.3, -0.38], [x, h + 0.2, 0.38], 0.025)
            beam(group, steel, [x, 0.3, 0.38], [x, h + 0.2, -0.38], 0.025)
        }
        box(group, steel, -0.32, h + 0.32, 0, 1, 0.11, 0.85)
        box(group, dark, -0.32, h - 0.08, 0, 0.95, 0.08, 0.86)
        railing(group, -0.32, h - 0.04, 0.44, 0.95)
        ladder(group, -0.86, 0.25, h - 0.02, 0.25)
        const wheel = mesh(
            new THREE.TorusGeometry(0.24, 0.04, 8, 24),
            gold,
            group,
            -0.32,
            h + 0.54,
            0,
        )
        for (let spoke = 0; spoke < 4; spoke++)
            box(wheel, steel, 0, 0, 0, 0.45, 0.022, 0.025).rotation.z =
                (spoke * Math.PI) / 4
        wheel.castShadow = false
        motion.push((time) => {
            wheel.rotation.z = -time * 0.65
        })
        beam(group, dark, [-0.54, 0.35, 0], [-0.54, h + 0.54, 0], 0.014)
        beam(group, dark, [-0.1, 0.35, 0], [-0.1, h + 0.54, 0], 0.014)
        const drill = cylinder(group, steel, -0.32, 0.64, 0, 0.12, 0.68, 8)
        box(drill, dark, 0, 0, 0, 0.32, 0.08, 0.08)
        motion.push((time) => {
            drill.rotation.y = time * 0.8
        })
        housing(group, painted, 0.69, 0.56, -0.22, 0.52, 0.64, 1.04)
        box(group, dark, 0.69, 0.9, -0.22, 0.62, 0.06, 1.12)
        for (let i = 0; i < 3; i++)
            box(
                group,
                warmWindow,
                0.69,
                0.69,
                0.313 + i * 0.002,
                0.34,
                0.035,
                0.02,
            )
        fan(group, 0.69, 0.44, 0.32)
        const conveyor = new THREE.Group()
        conveyor.position.set(-0.28, 0.35, 0.73)
        group.add(conveyor)
        conveyor.rotation.x = -0.14
        box(conveyor, dark, 0, 0, 0, 0.46, 0.09, 0.94)
        for (const side of [-1, 1])
            box(conveyor, steel, side * 0.25, 0, 0, 0.04, 0.17, 1)
        for (let i = 0; i < 4; i++) {
            const rock = mesh(
                new THREE.IcosahedronGeometry(0.08 + (i % 2) * 0.025),
                ore,
                conveyor,
                ((i % 2) - 0.5) * 0.12,
                0.13,
                0,
            )
            rock.castShadow = false
            motion.push((time) => {
                rock.position.z = (((time * 0.18 + i / 4) % 1) - 0.5) * 0.8
            })
        }
    } else if (id === 'crystal') {
        cylinder(group, dark, 0, 0.36, 0, 0.78, 0.3, 24)
        cylinder(group, painted, 0, 0.52, 0, 0.72, 0.18, 24)
        const count = 3 + Math.floor(level / 2)
        for (let i = 0; i < count; i++) {
            const a = (i * Math.PI * 2) / count,
                x = Math.cos(a) * 0.44,
                z = Math.sin(a) * 0.44
            cylinder(group, steel, x, 0.65, z, 0.145, 0.15, 12)
            const mineral = mesh(
                new THREE.ConeGeometry(0.125, 0.4 + level * 0.045, 5),
                i % 2 ? purple : cyan,
                group,
                x,
                0.8 + level * 0.0225,
                z,
            )
            mineral.rotation.z = Math.cos(a) * 0.12
        }
        for (const side of [-1, 1]) {
            beam(
                group,
                painted,
                [side * 0.9, 0.25, -0.6],
                [side * 0.9, h, -0.6],
                0.055,
            )
            beam(
                group,
                steel,
                [side * 0.9, h, -0.6],
                [side * 0.48, h + 0.15, 0],
                0.04,
            )
        }
        const collector = mesh(
            new THREE.TorusGeometry(0.74, 0.045, 8, 36),
            steel,
            group,
            0,
            h - 0.08,
            0,
        )
        collector.rotation.x = Math.PI / 2
        box(collector, cyan, 0.74, 0, 0, 0.12, 0.14, 0.06)
        motion.push((time) => {
            collector.rotation.z = time * 0.3
        })
        housing(group, insulation, 0.93, 0.48, 0.45, 0.37, 0.48, 0.5)
        fan(group, 0.93, 0.5, 0.72, 0.11)
        pipe(group, steel, [
            [0.8, 0.5, 0.4],
            [0.65, 0.38, 0.65],
            [0, 0.38, 0.75],
        ])
        railing(group, 0, 0.23, 0.97, 1.2)
        ladder(group, -0.95, 0.25, h - 0.1, -0.43)
    } else if (id === 'deuterium') {
        const count = 2 + Math.floor(level / 3),
            tankHeight = 0.7 + level * 0.08
        for (let i = 0; i < count; i++) {
            const a = (i * Math.PI * 2) / count,
                x = Math.cos(a) * 0.6,
                z = Math.sin(a) * 0.6 - 0.12
            cylinder(group, dark, x, 0.3, z, 0.31, 0.15)
            cylinder(
                group,
                insulation,
                x,
                0.4 + tankHeight / 2,
                z,
                0.28,
                tankHeight,
                24,
            )
            mesh(
                new THREE.SphereGeometry(0.28, 20, 10),
                steel,
                group,
                x,
                0.4 + tankHeight,
                z,
            ).scale.y = 0.5
            for (const y of [0.48, 0.32 + tankHeight])
                cylinder(group, steel, x, y, z, 0.29, 0.045)
            box(group, gold, x, 0.7, z + 0.282, 0.14, 0.11, 0.01)
            pipe(group, steel, [
                [x, 0.55 + tankHeight, z],
                [x, 0.68 + tankHeight, z],
                [x * 0.5, 0.68 + tankHeight, 0.05],
            ])
        }
        housing(group, painted, 0, 0.5, 0.74, 0.58, 0.48, 0.36)
        fan(group, 0, 0.5, 0.94)
        pipe(group, steel, [
            [-0.75, 0.43, 0.4],
            [-0.75, 0.35, 0.75],
            [-0.3, 0.35, 0.75],
        ])
        const valve = mesh(
            new THREE.TorusGeometry(0.12, 0.023, 6, 20),
            gold,
            group,
            -0.7,
            0.53,
            0.72,
        )
        box(valve, steel, 0, 0, 0, 0.23, 0.025, 0.025)
        motion.push((time) => {
            valve.rotation.z = Math.sin(time * 0.4) * 0.15
        })
        ladder(group, 0.97, 0.24, tankHeight + 0.4, -0.13)
    } else {
        const count = 2 + Math.floor(level / 2)
        const mountHeight = 0.62 + level * 0.035
        for (let i = 0; i < count; i++) {
            const x = ((i % 2) - 0.5) * 1.04,
                z = (Math.floor(i / 2) - 0.5) * 0.64
            for (const side of [-1, 1])
                beam(
                    group,
                    steel,
                    [x + side * 0.3, 0.24, z],
                    [x, mountHeight, z],
                    0.026,
                )
            const array = new THREE.Group()
            array.position.set(x, mountHeight + 0.04, z)
            group.add(array)
            array.rotation.x = -0.3
            box(array, steel, 0, 0, 0, 0.98, 0.055, 0.56)
            box(array, panel, 0, 0.035, 0, 0.92, 0.02, 0.5)
            motion.push((time) => {
                array.rotation.x = -0.3 + Math.sin(time * 0.25) * 0.07
            })
            pipe(
                group,
                dark,
                [
                    [x, 0.55, z],
                    [x * 0.7, 0.28, z],
                    [0, 0.27, -0.7],
                ],
                0.025,
            )
        }
        housing(group, insulation, 0, 0.43, -0.82, 0.45, 0.38, 0.4)
        box(group, glass, 0, 0.5, -0.6, 0.24, 0.1, 0.02)
        for (let i = 0; i < 4; i++)
            box(group, dark, 0, 0.35 + i * 0.035, -0.605, 0.26, 0.012, 0.02)
    }
    // Bolted electrical cabinets and subdued area lighting establish a common scale.
    housing(group, painted, -0.84, 0.4, -0.74, 0.28, 0.33, 0.28)
    box(group, glass, -0.84, 0.47, -0.588, 0.17, 0.08, 0.012)
    for (const side of [-1, 1]) {
        beam(
            group,
            steel,
            [side * 1.07, 0.22, 0.84],
            [side * 1.07, 0.55, 0.84],
            0.02,
        )
        box(group, warmWindow, side * 1.07, 0.56, 0.84, 0.1, 0.035, 0.07)
    }
    return {
        group,
        motion,
        labelHeight: id === 'metal' ? h + 0.9 : Math.max(1.6, h + 0.4),
    }
}
