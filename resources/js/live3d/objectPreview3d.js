import * as THREE from '../prototype3d/vendor/three.module.min.js'
import { createColonyMaterials } from '../prototype3d/materials.js'
import { createBuilding } from '../prototype3d/buildings.js'
import { createShipVariant } from '../prototype3d/shipVariants.js'
import { fitModelCamera } from '../prototype3d/modelCamera.js'
import { modelAliases, shipModelAliases } from './visualState.js'

// One reusable renderer, not a new context for each selection or background poll.
export function createObjectPreview(host) {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    const scene = new THREE.Scene(),
        camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100),
        materials = createColonyMaterials()
    scene.environment = materials.environment
    scene.add(new THREE.HemisphereLight(0xaedbff, 0x12202c, 1.1))
    const key = new THREE.DirectionalLight(0xfff3df, 3.2)
    key.position.set(-5, 9, 7)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 5, bottom: -4, near: 0.1, far: 30 })
    key.shadow.bias = -0.0002
    key.shadow.normalBias = 0.02
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x5bbfff, 2)
    rim.position.set(5, 3, -7)
    scene.add(rim)
    let model,
        modelSize,
        width = 1,
        height = 1,
        pointer,
        disposed = false,
        revision = 0
    function draw() {
        if (disposed || !model || !width || !height) return
        renderer.render(scene, camera)
        host.dataset.previewFrames = String(++revision)
    }
    const resize = new ResizeObserver(() => {
        const rect = host.getBoundingClientRect()
        width = rect.width
        height = rect.height
        if (width && height) {
            renderer.setSize(width, height, false)
            camera.aspect = width / height
            if (modelSize) fitModelCamera(camera, modelSize)
            camera.updateProjectionMatrix()
            draw()
        }
    })
    resize.observe(host)
    function release() {
        if (model) {
            model.traverse((mesh) => mesh.geometry?.dispose())
            model.removeFromParent()
            model = null
        }
    }
    function show(item) {
        const alias = modelAliases[item.key],
            ship = shipModelAliases[item.key]
        if (!alias && !ship) return false
        release()
        model = alias
            ? createBuilding(
                  alias,
                  Math.max(1, Math.min(8, Number(item.amount))),
                  materials.palette,
              ).group
            : createShipVariant(ship, materials.palette)
        const box = new THREE.Box3().setFromObject(model),
            center = box.getCenter(new THREE.Vector3()),
            size = box.getSize(new THREE.Vector3())
        model.position.sub(center)
        model.rotation.y = -0.3
        scene.add(model)
        host.dataset.modelRevision = model.userData.modelRevision || 'ship'
        modelSize = size
        fitModelCamera(camera, modelSize)
        camera.near = 0.05
        camera.far = 100
        camera.updateProjectionMatrix()
        draw()
        return true
    }
    const lost = (event) => {
        event.preventDefault()
        host.dispatchEvent(new CustomEvent('object-preview-error'))
    }
    renderer.domElement.addEventListener('webglcontextlost', lost)
    renderer.domElement.setAttribute('aria-hidden', 'true')
    const down = (event) => {
        pointer = event.clientX
        renderer.domElement.setPointerCapture(event.pointerId)
    }
    const move = (event) => {
        if (pointer === undefined || !model) return
        model.rotation.y += (event.clientX - pointer) * 0.012
        pointer = event.clientX
        draw()
    }
    const up = () => (pointer = undefined)
    renderer.domElement.addEventListener('pointerdown', down)
    renderer.domElement.addEventListener('pointermove', move)
    renderer.domElement.addEventListener('pointerup', up)
    renderer.domElement.addEventListener('pointercancel', up)
    const keyboard = (event) => {
        if (!model || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
        event.preventDefault()
        model.rotation.y += event.key === 'ArrowLeft' ? -0.15 : 0.15
        draw()
    }
    host.addEventListener('keydown', keyboard)
    return {
        canvas: renderer.domElement,
        show,
        dispose() {
            disposed = true
            resize.disconnect()
            release()
            host.removeEventListener('keydown', keyboard)
            materials.dispose()
            renderer.domElement.removeEventListener('webglcontextlost', lost)
            renderer.dispose()
            renderer.forceContextLoss()
            renderer.domElement.remove()
        },
    }
}
