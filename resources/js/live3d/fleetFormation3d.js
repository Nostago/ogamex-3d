import * as THREE from '../prototype3d/vendor/three.module.min.js'
import { createColonyMaterials } from '../prototype3d/materials.js'
import { loadShipPreview, disposeShipPreview } from './shipPreviewAsset.js'
import { fitModelGeometryCamera } from '../prototype3d/modelCamera.js'

// A bounded, representative formation: at most six distinct ship types, never one mesh per unit.
export function createFleetFormation(host) {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    const scene = new THREE.Scene(),
        camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200),
        materials = createColonyMaterials(),
        formation = new THREE.Group()
    scene.environment = materials.environment
    scene.add(formation, new THREE.HemisphereLight(0xc5eaff, 0x132233, 2))
    const light = new THREE.DirectionalLight(0xfff0da, 3)
    light.position.set(-4, 8, 6)
    scene.add(light)
    renderer.domElement.tabIndex = 0
    host.append(renderer.domElement)
    let revision = 0,
        disposed = false,
        pointer = null,
        models = []
    function draw() {
        if (disposed) return
        const { width, height } = host.getBoundingClientRect()
        if (!width || !height) return
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        if (models.length)
            fitModelGeometryCamera(camera, formation, [1.2, 1.1, 1.7])
        renderer.render(scene, camera)
        host.dataset.formationModels = String(models.length)
        host.dataset.formationRotation = formation.rotation.y.toFixed(2)
    }
    function clear() {
        host.dataset.formationModels = '0'
        for (const model of models) {
            model.removeFromParent()
            disposeShipPreview(model)
        }
        models = []
        formation.clear()
    }
    const observer = new ResizeObserver(draw)
    observer.observe(host)
    renderer.domElement.onpointerdown = (e) => {
        pointer = e.clientX
        renderer.domElement.setPointerCapture(e.pointerId)
    }
    renderer.domElement.onpointermove = (e) => {
        if (pointer === null) return
        formation.rotation.y += (e.clientX - pointer) * 0.012
        pointer = e.clientX
        draw()
    }
    renderer.domElement.onpointerup = renderer.domElement.onpointercancel =
        () => {
            pointer = null
        }
    renderer.domElement.onkeydown = (e) => {
        if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault()
            formation.rotation.y += e.key === 'ArrowLeft' ? -0.15 : 0.15
            draw()
        }
    }
    renderer.domElement.addEventListener('webglcontextlost', (e) => {
        e.preventDefault()
        host.dispatchEvent(new Event('formation-unavailable'))
    })
    return {
        async show(ships) {
            const version = ++revision
            clear()
            formation.rotation.y = 0
            // Decode sequentially to avoid a burst of simultaneous texture/geometry allocations.
            for (const [i, ship] of ships.slice(0, 6).entries()) {
                const model = await loadShipPreview(ship.key)
                if (!model) continue
                if (disposed || version !== revision) {
                    disposeShipPreview(model)
                    return
                }
                model.scale.multiplyScalar(0.6)
                model.updateMatrixWorld(true)
                const centre = new THREE.Box3()
                    .setFromObject(model)
                    .getCenter(new THREE.Vector3())
                model.position.sub(centre)
                const slot = new THREE.Group()
                slot.position.set(
                    ((i % 3) - 1) * 4,
                    0,
                    (Math.floor(i / 3) - 0.5) * 5,
                )
                slot.add(model)
                formation.add(slot)
                models.push(model)
            }
            if (disposed || version !== revision) return
            const center = new THREE.Box3()
                .setFromObject(formation)
                .getCenter(new THREE.Vector3())
            for (const slot of formation.children) slot.position.sub(center)
            draw()
        },
        reset() {
            formation.rotation.y = 0
            draw()
        },
        dispose() {
            disposed = true
            ++revision
            observer.disconnect()
            clear()
            materials.dispose()
            renderer.dispose()
            renderer.domElement.remove()
        },
    }
}
