import * as THREE from './vendor/three.module.min.js'

// Fixed visual budget: a shipyard orbital platform is independent of ship counts.
export function createOrbitalRing(palette) {
    const group = new THREE.Group()
    const hull = new THREE.MeshStandardMaterial({
        color: 0x233c50,
        map: palette.steel.map,
        roughness: 0.4,
        metalness: 0.72,
    })
    const lights = new THREE.MeshBasicMaterial({
        color: 0x59eaff,
        toneMapped: false,
    })
    group.userData.dispose = () => {
        hull.dispose()
        lights.dispose()
    }
    const add = (geometry, material, parent = group) => {
        const mesh = new THREE.Mesh(geometry, material)
        parent.add(mesh)
        return mesh
    }
    const ring = add(new THREE.TorusGeometry(1, 0.025, 6, 128), palette.dark)
    ring.rotation.x = Math.PI / 2
    const rail = add(new THREE.TorusGeometry(1, 0.004, 4, 128), lights)
    rail.rotation.x = Math.PI / 2
    rail.position.y = 0.025
    const platformGeometry = new THREE.BoxGeometry(0.16, 0.04, 0.1),
        windowsGeometry = new THREE.BoxGeometry(0.14, 0.006, 0.102)
    const decks = new THREE.InstancedMesh(platformGeometry, hull, 32),
        windows = new THREE.InstancedMesh(windowsGeometry, lights, 32)
    const transform = new THREE.Object3D()
    for (let i = 0; i < 32; i++) {
        const angle = (i * Math.PI * 2) / 32
        transform.position.set(Math.cos(angle), 0, Math.sin(angle))
        transform.rotation.y = -angle
        transform.updateMatrix()
        decks.setMatrixAt(i, transform.matrix)
        transform.position.y = 0.014
        transform.updateMatrix()
        windows.setMatrixAt(i, transform.matrix)
    }
    group.add(decks, windows)
    for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3,
            hub = new THREE.Group()
        hub.position.set(Math.cos(angle), 0, Math.sin(angle))
        hub.rotation.y = -angle
        group.add(hub)
        add(new THREE.BoxGeometry(0.17, 0.07, 0.24), palette.dark, hub)
        for (let j = 0; j < 3; j++) {
            const tower = add(
                new THREE.BoxGeometry(0.025, 0.1 + j * 0.07, 0.035),
                hull,
                hub,
            )
            tower.position.set((j - 1) * 0.045, 0.09 + j * 0.03, 0)
            const lamp = add(
                new THREE.BoxGeometry(0.008, 0.08 + j * 0.05, 0.038),
                lights,
                hub,
            )
            lamp.position.copy(tower.position)
        }
        const dock = add(
            new THREE.BoxGeometry(0.32, 0.012, 0.08),
            palette.panel,
            hub,
        )
        dock.position.set(0.15, -0.02, 0)
    }
    group.rotation.z = 0.09
    return group
}
