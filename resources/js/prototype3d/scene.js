import * as THREE from './vendor/three.module.min.js'
import { createColonyMaterials } from './materials.js'
import { createBuilding } from './buildings.js'

// Procedural scene only. No remote textures, models, game services or mutations.
export function createPlanetScene(host, labelsHost, onSelect, names) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 160)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setClearColor(0x040b16, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    // Cache static building shadows; animated machinery does not regenerate the atlas.
    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.needsUpdate = true
    const materials = createColonyMaterials()
    scene.environment = materials.environment
    host.append(renderer.domElement)
    renderer.domElement.setAttribute('aria-label', names.scene)
    scene.add(new THREE.HemisphereLight(0xcedbe5, 0x37322b, 1.05))
    const sun = new THREE.DirectionalLight(0xffe5c7, 3.4)
    sun.position.set(-12, 22, 18)
    sun.target.position.set(0, 6, 0)
    scene.add(sun.target)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, {
        left: -9,
        right: 9,
        top: 9,
        bottom: -9,
        near: 1,
        far: 55,
    })
    sun.shadow.bias = -0.00025
    sun.shadow.normalBias = 0.025
    sun.shadow.radius = 2
    scene.add(sun)
    const rim = new THREE.DirectionalLight(0x99bce2, 0.9)
    rim.position.set(8, 2, -12)
    scene.add(rim)
    const world = new THREE.Group()
    scene.add(world)
    const { steel, dark, cyan, gold, panel } = materials.palette
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
    globe.receiveShadow = true
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
        opacity: 0.45,
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
        const model = createBuilding(data.id, data.level, materials.palette)
        group.add(model.group)
        const ring = mesh(
            new THREE.TorusGeometry(1.4, 0.016, 5, 48),
            selectionMat,
            group,
            0,
            0.22,
            0,
        )
        ring.rotation.x = Math.PI / 2
        ring.visible = data.id === selected
        buildings.set(data.id, {
            group,
            ring,
            motion: model.motion,
            labelHeight: model.labelHeight,
        })
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
        renderer.shadowMap.needsUpdate = true
    }
    let construction = null
    function cancelConstruction() {
        if (!construction) return
        const current = construction
        construction = null
        disposeGroup(current.scaffold)
        current.resolve(false)
    }
    function animateUpgrade(id) {
        cancelConstruction()
        const building = buildings.get(id)
        if (!building) return Promise.resolve(false)
        if (reducedMotion.matches) return Promise.resolve(true)
        const scaffold = new THREE.Group()
        scaffold.position.copy(building.group.position)
        scaffold.quaternion.copy(building.group.quaternion)
        colony.add(scaffold)
        for (let i = 0; i < 4; i++) {
            const a = Math.PI / 4 + (i * Math.PI) / 2
            box(
                scaffold,
                gold,
                Math.cos(a) * 1.24,
                1.25,
                Math.sin(a) * 1.24,
                0.055,
                2.3,
                0.055,
            )
        }
        const scanner = mesh(
            new THREE.TorusGeometry(1.3, 0.045, 6, 48),
            cyan,
            scaffold,
            0,
            0.25,
            0,
        )
        scanner.rotation.x = Math.PI / 2
        return new Promise((resolve) => {
            construction = {
                id,
                scaffold,
                scanner,
                elapsed: 0,
                duration: 1.8,
                resolve,
            }
        })
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
        ship.position.set(Math.cos(i * 2) * 11.4, 0, Math.sin(i * 2) * 11.4)
        ship.rotation.y = -i * 2
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
    let cameraFlight = null
    let focused = null
    function flyTo(destination) {
        host.dataset.camera = 'moving'
        if (reducedMotion.matches) {
            angle = destination.angle
            elevation = destination.elevation
            distance = destination.distance
            target.copy(destination.target)
            host.dataset.camera = 'idle'
            cameraFlight = null
        } else {
            cameraFlight = destination
        }
    }
    function stopFlight() {
        cameraFlight = null
        host.dataset.camera = 'idle'
    }
    const resetCamera = () => {
        focused = null
        host.dataset.focus = ''
        flyTo({
            angle:
                angle +
                Math.atan2(Math.sin(0.55 - angle), Math.cos(0.55 - angle)),
            elevation: 0.82,
            distance: mode === 'orbit' ? 37 : 25,
            target: new THREE.Vector3(0, mode === 'orbit' ? 0 : 2.6, 0),
        })
    }
    function focus(id) {
        const building = buildings.get(id)
        if (!building || mode !== 'colony') return
        focused = id
        host.dataset.focus = id
        autoRotate = false
        const position = building.group.position
        const destinationAngle = Math.atan2(position.x, position.z)
        flyTo({
            angle:
                angle +
                Math.atan2(
                    Math.sin(destinationAngle - angle),
                    Math.cos(destinationAngle - angle),
                ),
            elevation: 0.8,
            distance: 11.5,
            target: position
                .clone()
                .addScaledVector(position.clone().normalize(), 0.9),
        })
    }
    host.dataset.camera = 'idle'
    const zoom = (delta) => {
        stopFlight()
        distance = THREE.MathUtils.clamp(
            distance + delta,
            mode === 'orbit' ? 25 : focused ? 6 : 17,
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
        stopFlight()
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
        stopFlight()
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
        if (autoRotate && !pointer && !reducedMotion.matches)
            angle += delta * 0.12
        if (cameraFlight) {
            const blend = 1 - Math.exp(-delta * 6)
            angle = THREE.MathUtils.lerp(angle, cameraFlight.angle, blend)
            elevation = THREE.MathUtils.lerp(
                elevation,
                cameraFlight.elevation,
                blend,
            )
            distance = THREE.MathUtils.lerp(
                distance,
                cameraFlight.distance,
                blend,
            )
            target.lerp(cameraFlight.target, blend)
            if (
                Math.abs(distance - cameraFlight.distance) < 0.01 &&
                target.distanceTo(cameraFlight.target) < 0.01 &&
                Math.abs(angle - cameraFlight.angle) < 0.001
            ) {
                angle = cameraFlight.angle
                elevation = cameraFlight.elevation
                distance = cameraFlight.distance
                target.copy(cameraFlight.target)
                stopFlight()
            }
        }
        if (construction) {
            construction.elapsed += delta
            const progress = Math.min(
                1,
                construction.elapsed / construction.duration,
            )
            construction.scanner.position.y = 0.25 + progress * 2.2
            host.dispatchEvent(
                new CustomEvent('construction-progress', { detail: progress }),
            )
            if (progress === 1) {
                const completed = construction
                construction = null
                disposeGroup(completed.scaffold)
                completed.resolve(true)
            }
        }
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
        if (!reducedMotion.matches) orbit.rotation.y = time * 0.00004
        if (!reducedMotion.matches)
            ships.forEach((ship, index) => {
                const a = time * (0.00009 + index * 0.000015) + index * 2
                ship.position.set(
                    Math.cos(a) * 11.4,
                    Math.sin(a * 2) * 0.2,
                    Math.sin(a) * 11.4,
                )
                ship.rotation.y = -a
            })
        buildings.forEach(({ group, motion, labelHeight }, id) => {
            if (!reducedMotion.matches)
                motion.forEach((animate) => animate(time / 1000))
            group.getWorldPosition(worldPosition)
            projected
                .copy(worldPosition)
                .addScaledVector(worldPosition.clone().normalize(), labelHeight)
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
        focus,
        animateUpgrade,
        cancelConstruction,
        setMode,
        zoom,
        resetCamera,
        setRotation(value) {
            autoRotate = value
            if (value) stopFlight()
        },
        dispose() {
            cancelConstruction()
            cancelAnimationFrame(frame)
            resize.disconnect()
            scene.traverse((object) => {
                object.geometry?.dispose()
            })
            ;[selectionMat, globe.material, atmosphere.material].forEach(
                (mat) => mat.dispose(),
            )
            materials.dispose()
            renderer.dispose()
        },
    }
}
