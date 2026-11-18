import * as THREE from '../prototype3d/vendor/three.module.min.js'
import { createColonyMaterials } from '../prototype3d/materials.js'
import { createBuilding } from '../prototype3d/buildings.js'
import { modelAliases } from './visualState.js'
import { shipPreviewAssets } from './shipAssets.js'
import { loadShipPreview, disposeShipPreview } from './shipPreviewAsset.js'
import { fitModelGeometryCamera } from '../prototype3d/modelCamera.js'
import { replayCount } from './battleTimeline.js'

export function createBattleScene(host) {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    const scene = new THREE.Scene(),
        camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200),
        materials = createColonyMaterials()
    const unitsGroup = new THREE.Group()
    scene.add(unitsGroup)
    scene.environment = materials.environment
    scene.add(new THREE.HemisphereLight(0xb4eaff, 0x101e2c, 2))
    const sun = new THREE.DirectionalLight(0xffeed8, 3)
    sun.position.set(-2, 8, 5)
    scene.add(sun)
    let disposed = false,
        models = [],
        state = null,
        phase = 1,
        effects = false,
        fitted = ''
    const anchors = {
        attacker: new THREE.Vector3(-6, 0, 0),
        defender: new THREE.Vector3(6, 0, 0),
    }
    const shields = {},
        rays = {},
        bursts = {},
        shieldGeometry = new THREE.SphereGeometry(1, 20, 12)
    for (const [side, colour, x] of [
        ['attacker', 0xff9869, -6],
        ['defender', 0x65dfff, 6],
    ]) {
        const shield = new THREE.Mesh(
            shieldGeometry,
            new THREE.MeshBasicMaterial({
                color: colour,
                transparent: true,
                opacity: 0.12,
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide,
                depthWrite: false,
            }),
        )
        shield.position.set(x, 0, 0)
        shield.scale.set(3.8, 2.3, 6.5)
        shield.visible = false
        scene.add(shield)
        shields[side] = shield
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, 0, 0),
            new THREE.Vector3(-x, 0, 0),
        ])
        const ray = new THREE.Line(
            geometry,
            new THREE.LineBasicMaterial({
                color: colour,
                transparent: true,
                opacity: 0.9,
            }),
        )
        ray.visible = false
        scene.add(ray)
        rays[side] = ray
        const burst = new THREE.Points(
            new THREE.BufferGeometry(),
            new THREE.PointsMaterial({
                color: 0xffba64,
                size: 0.22,
                transparent: true,
                opacity: 0.8,
            }),
        )
        burst.visible = false
        scene.add(burst)
        bursts[side] = burst
    }
    renderer.domElement.setAttribute(
        'aria-label',
        host.getAttribute('aria-label') || '',
    )
    host.append(renderer.domElement)
    function render() {
        if (disposed) return
        const { width, height } = host.getBoundingClientRect()
        if (!width || !height) return
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        const signature = `${width}:${height}:${models.length}`
        if (models.length && fitted !== signature) {
            fitModelGeometryCamera(camera, unitsGroup, [1.5, 1.05, 1.7])
            fitted = signature
        }
        for (const item of models) {
            const count = replayCount(state?.[item.side]?.units, item.key)
            item.model.visible = count !== null && BigInt(count) > 0n
        }
        for (const side of ['attacker', 'defender']) {
            shields[side].visible =
                effects && BigInt(state?.[side]?.absorbed || '0') > 0n
            shields[side].material.opacity =
                0.04 + 0.12 * Math.sin(phase * Math.PI) ** 2
            rays[side].visible =
                effects &&
                BigInt(state?.[side]?.shots || '0') > 0n &&
                phase < 0.9
            const start = anchors[side],
                end = anchors[side === 'attacker' ? 'defender' : 'attacker'],
                p = (phase * 4) % 1,
                position = rays[side].geometry.attributes.position
            for (const [index, amount] of [
                [0, p],
                [1, Math.min(1, p + 0.2)],
            ])
                position.setXYZ(
                    index,
                    THREE.MathUtils.lerp(start.x, end.x, amount),
                    0.35,
                    THREE.MathUtils.lerp(start.z, end.z, amount),
                )
            position.needsUpdate = true
            const points = []
            if (effects && phase < 0.65)
                for (const item of models.filter((m) => m.side === side)) {
                    if (
                        BigInt(
                            replayCount(state?.[side]?.losses, item.key) || '0',
                        ) === 0n
                    )
                        continue
                    // A bounded visual burst marks the type's reported losses; it is not one particle per lost ship.
                    for (let i = 0; i < 12; i++) {
                        const angle = (i * Math.PI * 2) / 12,
                            r = phase * 2
                        points.push(
                            item.slot.x + Math.cos(angle) * r,
                            item.slot.y + Math.sin(angle * 2) * r,
                            item.slot.z + Math.sin(angle) * r,
                        )
                    }
                }
            bursts[side].geometry.dispose()
            bursts[side].geometry = new THREE.BufferGeometry().setAttribute(
                'position',
                new THREE.Float32BufferAttribute(points, 3),
            )
            bursts[side].visible = points.length > 0
        }
        renderer.render(scene, camera)
        host.dataset.replayShotSides = String(
            Object.values(rays).filter((ray) => ray.visible).length,
        )
        host.dataset.replayShieldSides = String(
            Object.values(shields).filter((shield) => shield.visible).length,
        )
        host.dataset.replayModels = String(models.length)
        host.dataset.replayVisible = String(
            models.filter((m) => m.model.visible).length,
        )
    }
    const observer = new ResizeObserver(render)
    observer.observe(host)
    renderer.domElement.addEventListener('webglcontextlost', (event) => {
        event.preventDefault()
        host.dispatchEvent(new Event('replay-unavailable'))
    })
    return {
        async load(sides) {
            for (const side of ['attacker', 'defender'])
                for (const [index, unit] of sides[side].slice(0, 4).entries()) {
                    const imported = Boolean(shipPreviewAssets[unit.key])
                    let model = imported
                        ? await loadShipPreview(unit.key)
                        : modelAliases[unit.key]
                          ? createBuilding(
                                modelAliases[unit.key],
                                1,
                                materials.palette,
                            ).group
                          : null
                    if (!model) continue
                    if (disposed) {
                        if (imported) disposeShipPreview(model)
                        else model.traverse((mesh) => mesh.geometry?.dispose())
                        return
                    }
                    model.updateMatrixWorld(true)
                    const box = new THREE.Box3().setFromObject(model),
                        size = box.getSize(new THREE.Vector3()),
                        scale = 2.8 / Math.max(size.x, size.y, size.z)
                    model.scale.multiplyScalar(scale)
                    model.updateMatrixWorld(true)
                    const center = new THREE.Box3()
                        .setFromObject(model)
                        .getCenter(new THREE.Vector3())
                    model.position.sub(center)
                    const count = sides[side].length,
                        columns = Math.min(2, count)
                    const right = new THREE.Vector3(1.7, 0, -1.5).normalize()
                    const separation =
                        Math.max(sides.attacker.length, sides.defender.length) >
                        2
                            ? 5
                            : 3.5
                    const slot = right.multiplyScalar(
                        (side === 'attacker' ? -separation : separation) +
                            ((index % columns) - (columns - 1) / 2) * 3.1,
                    )
                    slot.y =
                        (Math.floor(index / 2) -
                            (Math.ceil(count / 2) - 1) / 2) *
                        3.3
                    anchors[side]
                        .set(1.7, 0, -1.5)
                        .normalize()
                        .multiplyScalar(
                            side === 'attacker' ? -separation : separation,
                        )
                    shields[side].position.copy(anchors[side])
                    const wrapper = new THREE.Group()
                    wrapper.position.copy(slot)
                    wrapper.rotation.y = side === 'attacker' ? 0 : Math.PI
                    wrapper.add(model)
                    unitsGroup.add(wrapper)
                    models.push({
                        model,
                        key: unit.key,
                        side,
                        slot,
                        imported,
                        wrapper,
                    })
                }
            for (const side of ['attacker', 'defender']) {
                const box = new THREE.Box3()
                for (const item of models.filter((item) => item.side === side))
                    box.expandByObject(item.wrapper)
                if (!box.isEmpty()) {
                    shields[side].position.copy(
                        box.getCenter(new THREE.Vector3()),
                    )
                    shields[side].scale
                        .copy(box.getSize(new THREE.Vector3()))
                        .multiplyScalar(0.58)
                        .addScalar(0.25)
                }
            }
            render()
        },
        draw(frame, p, animated) {
            state = frame
            phase = p
            effects =
                animated &&
                !matchMedia('(prefers-reduced-motion: reduce)').matches
            render()
        },
        dispose() {
            if (disposed) return
            disposed = true
            observer.disconnect()
            for (const item of models) {
                if (item.imported) disposeShipPreview(item.model)
                else item.model.traverse((mesh) => mesh.geometry?.dispose())
                item.wrapper.removeFromParent()
            }
            models = []
            shieldGeometry.dispose()
            for (const side of ['attacker', 'defender']) {
                shields[side].material.dispose()
                rays[side].geometry.dispose()
                rays[side].material.dispose()
                bursts[side].geometry.dispose()
                bursts[side].material.dispose()
            }
            materials.dispose()
            renderer.dispose()
            renderer.domElement.remove()
        },
    }
}
