import * as THREE from './vendor/three.module.min.js'

// Procedural scene only. No remote textures, models, game services or mutations.
export function createPlanetScene(host, labelsHost, onSelect, names) {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 160)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.setClearColor(0x040b16, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    host.append(renderer.domElement)
    renderer.domElement.setAttribute('aria-label', names.scene)
    scene.add(new THREE.HemisphereLight(0x92dfff, 0x13222e, 2.5))
    const sun = new THREE.DirectionalLight(0xffecd0, 3.8)
    sun.position.set(-12, 22, 18)
    scene.add(sun)
    const rim = new THREE.DirectionalLight(0x168cff, 3)
    rim.position.set(8, 2, -12)
    scene.add(rim)
    const world = new THREE.Group()
    scene.add(world)
    const material = (color, emissive = 0) =>
        new THREE.MeshStandardMaterial({
            color,
            roughness: 0.65,
            metalness: 0.35,
            emissive,
            emissiveIntensity: 0.75,
        })
    const steel = material(0x7b98a5),
        dark = material(0x223a4b),
        cyan = material(0x60deff, 0x137dba),
        gold = material(0xd4ae65)
    const panel = material(0x17467b, 0x082750),
        purple = material(0x9483ef, 0x453694)
    const mesh = (geometry, mat, parent, x = 0, y = 0, z = 0) => {
        const object = new THREE.Mesh(geometry, mat)
        object.position.set(x, y, z)
        parent.add(object)
        return object
    }
    const box = (parent, mat, x, y, z, w, h, d) =>
        mesh(new THREE.BoxGeometry(w, h, d), mat, parent, x, y, z)
    const cylinder = (parent, mat, x, y, z, r, h, segments = 12) =>
        mesh(
            new THREE.CylinderGeometry(r, r, h, segments),
            mat,
            parent,
            x,
            y,
            z,
        )
    const terrain = new THREE.SphereGeometry(8, 96, 64)
    const colors = []
    const position = terrain.attributes.position
    for (let index = 0; index < position.count; index++) {
        const x = position.getX(index),
            y = position.getY(index),
            z = position.getZ(index)
        const noise =
            Math.sin(x * 0.8 + Math.sin(z)) +
            Math.cos(z * 0.7 + y * 0.6) +
            Math.sin(y * 1.4) * 0.45
        const color = new THREE.Color(
            noise > 0.35 ? 0x3a6970 : noise > -0.05 ? 0x426571 : 0x133f62,
        )
        color.multiplyScalar(0.82 + 0.18 * Math.sin(x * 3 + z * 2) ** 2)
        colors.push(color.r, color.g, color.b)
    }
    terrain.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    const globe = mesh(
        terrain,
        new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.95,
            metalness: 0.1,
        }),
        world,
    )
    const atmosphere = mesh(
        new THREE.SphereGeometry(8.22, 64, 48),
        new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexShader:
                'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.0); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p;}',
            fragmentShader:
                'varying vec3 n; varying vec3 v; void main(){float f=pow(1.0-max(dot(normalize(n),normalize(v)),0.0),3.5); gl_FragColor=vec4(0.13,0.55,1.0,f*0.65);}',
        }),
        world,
    )
    const starsGeometry = new THREE.BufferGeometry()
    const stars = []
    // Deterministic background; keep geometry reproducible and lightweight.
    for (let index = 0; index < 1100; index++) {
        const theta = index * 2.39996,
            y = 1 - (2 * (index + 0.5)) / 1100
        const radius = Math.sqrt(1 - y * y)
        stars.push(
            65 * radius * Math.cos(theta),
            65 * y,
            65 * radius * Math.sin(theta),
        )
    }
    starsGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(stars, 3),
    )
    scene.add(
        new THREE.Points(
            starsGeometry,
            new THREE.PointsMaterial({
                color: 0x91b8dd,
                size: 0.085,
                transparent: true,
                opacity: 0.65,
            }),
        ),
    )
    const colony = new THREE.Group()
    world.add(colony)
    const buildings = new Map()
    let selected = 'metal'
    const labels = new Map()
    const selectionMat = new THREE.MeshBasicMaterial({
        color: 0x70e1ff,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
    })
    function buildModel(data, index) {
        const group = new THREE.Group()
        group.userData.buildingId = data.id
        const x = ((index % 2) - 0.5) * 3.5,
            z = (Math.floor(index / 2) - 0.5) * 3.5
        const normal = new THREE.Vector3(
            x,
            Math.sqrt(64 - x * x - z * z),
            z,
        ).normalize()
        group.position.copy(normal).multiplyScalar(8.02)
        group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
        colony.add(group)
        cylinder(group, dark, 0, 0.1, 0, 1.38, 0.2, 6)
        const ring = mesh(
            new THREE.TorusGeometry(1.35, 0.035, 5, 36),
            selectionMat,
            group,
            0,
            0.23,
            0,
        )
        ring.rotation.x = Math.PI / 2
        ring.visible = data.id === selected
        const height = 0.4 + data.level * 0.13
        if (data.id === 'metal') {
            box(group, steel, 0, height / 2 + 0.2, 0, 1.1, height, 1.05)
            for (let floor = 0; floor < data.level; floor++) {
                box(
                    group,
                    cyan,
                    0,
                    0.35 + floor * 0.13,
                    0.535,
                    0.8,
                    0.035,
                    0.03,
                )
            }
            for (let side of [-1, 1]) {
                cylinder(group, dark, side * 0.85, 0.7, 0, 0.22, 1)
                cylinder(group, gold, side * 0.85, 1.22, 0, 0.15, 0.08)
            }
            const drill = mesh(
                new THREE.ConeGeometry(0.38, 0.8, 6),
                steel,
                group,
                0,
                height + 0.55,
                0,
            )
            drill.rotation.z = Math.PI
        } else if (data.id === 'crystal') {
            cylinder(group, steel, 0, 0.35, 0, 0.82, 0.35)
            for (let i = 0; i < data.level + 2; i++) {
                const angle = i * 2.4,
                    radius = i ? 0.65 : 0
                const crystal = mesh(
                    new THREE.ConeGeometry(0.25, height + (i % 3) * 0.25, 5),
                    i % 2 ? purple : cyan,
                    group,
                    Math.cos(angle) * radius,
                    0.6 + height / 2,
                    Math.sin(angle) * radius,
                )
                crystal.rotation.z = Math.cos(angle) * 0.18
            }
        } else if (data.id === 'deuterium') {
            for (let i = 0; i < 2 + Math.floor(data.level / 3); i++) {
                const angle =
                    (i * Math.PI * 2) / (2 + Math.floor(data.level / 3))
                const x = Math.cos(angle) * 0.65,
                    z = Math.sin(angle) * 0.65
                cylinder(group, steel, x, height / 2 + 0.2, z, 0.36, height)
                mesh(
                    new THREE.SphereGeometry(0.36, 12, 8),
                    cyan,
                    group,
                    x,
                    height + 0.2,
                    z,
                ).scale.y = 0.4
                cylinder(group, cyan, x, 0.35, z, 0.38, 0.06)
            }
            box(group, dark, 0, 0.4, 0, 1.4, 0.2, 0.15)
        } else {
            cylinder(group, steel, 0, 0.65, 0, 0.15, 1.05)
            for (let i = 0; i < 2 + Math.floor(data.level / 2); i++) {
                const array = new THREE.Group()
                array.position.set(
                    ((i % 2) - 0.5) * 1.1,
                    0.8 + Math.floor(i / 2) * 0.23,
                    (Math.floor(i / 2) - 1) * 0.65,
                )
                array.rotation.x = -0.3
                group.add(array)
                box(array, gold, 0, 0, 0, 1.03, 0.08, 0.58)
                box(array, panel, 0, 0.05, 0, 0.94, 0.025, 0.5)
                for (let line = -1; line <= 1; line++)
                    box(array, cyan, line * 0.25, 0.07, 0, 0.012, 0.01, 0.49)
            }
        }
        buildings.set(data.id, { group, ring })
        const label = document.createElement('span')
        label.className = 'building-label'
        label.textContent = `${names[data.id]} · ${data.level}`
        labelsHost.append(label)
        labels.set(data.id, label)
    }
    function disposeGroup(group) {
        group.traverse((object) => object.geometry?.dispose())
        group.removeFromParent()
    }
    function update(data) {
        buildings.forEach(({ group }) => disposeGroup(group))
        buildings.clear()
        labels.forEach((label) => label.remove())
        labels.clear()
        data.buildings.forEach(buildModel)
    }
    const orbit = new THREE.Group()
    world.add(orbit)
    const orbitPath = mesh(
        new THREE.TorusGeometry(11.4, 0.017, 4, 160),
        new THREE.MeshBasicMaterial({
            color: 0x326a95,
            transparent: true,
            opacity: 0.5,
        }),
        orbit,
    )
    orbitPath.rotation.x = Math.PI / 2
    const station = new THREE.Group()
    station.position.set(11.4, 0, 0)
    orbit.add(station)
    cylinder(station, steel, 0, 0, 0, 0.38, 2.3)
    mesh(new THREE.TorusGeometry(1.15, 0.2, 8, 40), steel, station).rotation.x =
        Math.PI / 2
    mesh(
        new THREE.TorusGeometry(1.17, 0.035, 5, 40),
        cyan,
        station,
        0,
        0.15,
        0,
    ).rotation.x = Math.PI / 2
    box(station, dark, 0, 0, 0, 3.4, 0.15, 0.2)
    for (const side of [-1, 1])
        box(station, panel, side * 2.1, 0, 0, 1.2, 0.1, 1.6)
    const ships = []
    for (let i = 0; i < 3; i++) {
        const ship = new THREE.Group()
        const hull = mesh(
            new THREE.ConeGeometry(i === 2 ? 0.28 : 0.18, i === 2 ? 1 : 0.7, 4),
            steel,
            ship,
        )
        hull.rotation.x = Math.PI / 2
        box(ship, dark, 0, 0, 0.12, 0.85, 0.08, 0.3)
        mesh(
            new THREE.SphereGeometry(0.1, 8, 6),
            cyan,
            ship,
            0,
            0,
            0.45,
        ).scale.z = 2
        orbit.add(ship)
        ships.push(ship)
    }
    orbit.visible = false
    let mode = 'colony',
        angle = 0.55,
        elevation = 0.82,
        distance = 25,
        autoRotate = false
    const target = new THREE.Vector3(0, 2.6, 0)
    const resetCamera = () => {
        angle = 0.55
        elevation = 0.82
        distance = mode === 'orbit' ? 37 : 25
    }
    const zoom = (delta) => {
        distance = THREE.MathUtils.clamp(
            distance + delta,
            mode === 'orbit' ? 25 : 17,
            52,
        )
    }
    const setMode = (value) => {
        mode = value
        orbit.visible = value === 'orbit'
        resetCamera()
    }
    const select = (id) => {
        selected = id
        buildings.forEach((value, key) => {
            value.ring.visible = key === id
        })
    }
    let pointer = null
    const raycaster = new THREE.Raycaster()
    function pick(event) {
        const rect = renderer.domElement.getBoundingClientRect()
        raycaster.setFromCamera(
            new THREE.Vector2(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                (-(event.clientY - rect.top) / rect.height) * 2 + 1,
            ),
            camera,
        )
        const hits = raycaster.intersectObjects(
            [globe, ...Array.from(buildings.values(), (item) => item.group)],
            true,
        )
        let object = hits[0]?.object
        while (object && !object.userData.buildingId) object = object.parent
        return object?.userData.buildingId
    }
    const down = (event) => {
        pointer = {
            x: event.clientX,
            y: event.clientY,
            travel: 0,
            id: event.pointerId,
        }
        renderer.domElement.setPointerCapture(event.pointerId)
    }
    const move = (event) => {
        if (!pointer) {
            host.style.cursor = pick(event) ? 'pointer' : 'grab'
            return
        }
        const dx = event.clientX - pointer.x,
            dy = event.clientY - pointer.y
        pointer.travel += Math.abs(dx) + Math.abs(dy)
        angle -= dx * 0.006
        elevation = THREE.MathUtils.clamp(elevation + dy * 0.006, -1.2, 1.35)
        pointer.x = event.clientX
        pointer.y = event.clientY
    }
    const up = (event) => {
        if (pointer && pointer.travel < 6) {
            const id = pick(event)
            if (id) onSelect(id)
        }
        pointer = null
    }
    const cancel = () => {
        pointer = null
    }
    const wheel = (event) => {
        event.preventDefault()
        zoom(event.deltaY * 0.015)
    }
    const key = (event) => {
        if (
            ![
                'ArrowLeft',
                'ArrowRight',
                'ArrowUp',
                'ArrowDown',
                '+',
                '-',
                '=',
            ].includes(event.key)
        )
            return
        event.preventDefault()
        if (event.key === 'ArrowLeft') angle -= 0.1
        if (event.key === 'ArrowRight') angle += 0.1
        if (event.key === 'ArrowUp') elevation = Math.min(1.35, elevation + 0.1)
        if (event.key === 'ArrowDown')
            elevation = Math.max(-1.2, elevation - 0.1)
        if (event.key === '+' || event.key === '=') zoom(-2)
        if (event.key === '-') zoom(2)
    }
    renderer.domElement.addEventListener('pointerdown', down)
    renderer.domElement.addEventListener('pointermove', move)
    renderer.domElement.addEventListener('pointerup', up)
    renderer.domElement.addEventListener('pointercancel', cancel)
    renderer.domElement.addEventListener('lostpointercapture', cancel)
    renderer.domElement.addEventListener('wheel', wheel, { passive: false })
    host.addEventListener('keydown', key)
    const resize = new ResizeObserver(() => {
        const { width, height } = host.getBoundingClientRect()
        renderer.setSize(width, height)
        camera.aspect = width / Math.max(1, height)
        camera.updateProjectionMatrix()
    })
    resize.observe(host)
    const projected = new THREE.Vector3(),
        worldPosition = new THREE.Vector3(),
        towardCamera = new THREE.Vector3()
    let previous = 0,
        frame
    function render(time) {
        frame = requestAnimationFrame(render)
        const delta = Math.min((time - previous) / 1000, 0.05)
        previous = time
        if (document.hidden) return
        if (autoRotate && !pointer) angle += delta * 0.12
        target.y = THREE.MathUtils.lerp(
            target.y,
            mode === 'orbit' ? 0 : 2.6,
            0.06,
        )
        const framedDistance = distance * (camera.aspect < 0.85 ? 1.55 : 1)
        camera.position
            .set(
                Math.sin(angle) * Math.cos(elevation) * framedDistance,
                Math.sin(elevation) * framedDistance,
                Math.cos(angle) * Math.cos(elevation) * framedDistance,
            )
            .add(target)
        camera.lookAt(target)
        camera.updateMatrixWorld()
        orbit.rotation.y = time * 0.00004
        ships.forEach((ship, index) => {
            const a = time * (0.00009 + index * 0.000015) + index * 2
            ship.position.set(
                Math.cos(a) * 11.4,
                Math.sin(a * 2) * 0.2,
                Math.sin(a) * 11.4,
            )
            ship.rotation.y = -a
        })
        buildings.forEach(({ group }, id) => {
            group.getWorldPosition(worldPosition)
            projected
                .copy(worldPosition)
                .addScaledVector(worldPosition.clone().normalize(), 2.1)
                .project(camera)
            const label = labels.get(id)
            towardCamera.subVectors(camera.position, worldPosition)
            const visible =
                mode === 'colony' &&
                worldPosition.dot(towardCamera) > 0 &&
                Math.abs(projected.x) < 0.94 &&
                Math.abs(projected.y) < 0.9
            label.style.display = visible ? 'block' : 'none'
            label.style.left = `${(projected.x * 0.5 + 0.5) * host.clientWidth}px`
            label.style.top = `${(-projected.y * 0.5 + 0.5) * host.clientHeight}px`
        })
        renderer.render(scene, camera)
    }
    frame = requestAnimationFrame(render)
    renderer.domElement.addEventListener('webglcontextlost', (event) => {
        event.preventDefault()
        host.dispatchEvent(new CustomEvent('scene-error'))
    })
    return {
        update,
        select,
        setMode,
        zoom,
        resetCamera,
        setRotation(value) {
            autoRotate = value
        },
        dispose() {
            cancelAnimationFrame(frame)
            resize.disconnect()
            scene.traverse((object) => {
                object.geometry?.dispose()
            })
            ;[
                steel,
                dark,
                cyan,
                gold,
                panel,
                purple,
                selectionMat,
                globe.material,
                atmosphere.material,
            ].forEach((mat) => mat.dispose())
            renderer.dispose()
        },
    }
}
