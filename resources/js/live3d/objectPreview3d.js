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
    renderer.localClippingEnabled = true
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
        revision = 0,
        jobState = null,
        jobReceived = 0,
        animation,
        scaffold,
        scanner,
        blueprint,
        blueprintMaterial,
        baseY = 0,
        lastFrame = 0,
        clipped = [],
        buildPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)
    function draw() {
        if (disposed || !model || !width || !height) return
        if (blueprint) { blueprint.rotation.copy(model.rotation); blueprint.position.copy(model.position) }
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
    function clearJob() {
        cancelAnimationFrame(animation)
        for (const part of [scaffold, scanner]) {
            part?.removeFromParent()
            part?.geometry.dispose()
            part?.material.dispose()
        }
        scaffold = scanner = null
        blueprint?.removeFromParent()
        blueprintMaterial?.dispose()
        blueprint = blueprintMaterial = null
        for (const [mesh, original] of clipped) { mesh.material.dispose(); mesh.material = original }
        clipped = []
        host.dataset.building = 'false'
    }
    function setJob(job) {
        jobState = job
        jobReceived = performance.now()
        if (!job) { clearJob(); if (model) model.position.y = baseY; draw(); return }
        if (!model || !modelSize) return
        if (!scaffold) {
            model.traverse(mesh => {
                if (!mesh.isMesh || Array.isArray(mesh.material)) return
                const original = mesh.material
                mesh.material = original.clone()
                mesh.material.clippingPlanes = [buildPlane]
                mesh.material.clipShadows = true
                clipped.push([mesh, original])
            })
            // Keep the complete planned silhouette legible even at zero progress.
            // Geometry is shared with the model; only the blueprint material is owned here.
            blueprintMaterial = new THREE.MeshBasicMaterial({color:0x62c6e8,wireframe:true,transparent:true,opacity:.13,depthWrite:false})
            blueprint = model.clone(true)
            blueprint.traverse(mesh => { if (mesh.isMesh) { mesh.material = blueprintMaterial; mesh.castShadow = false; mesh.receiveShadow = false } })
            scene.add(blueprint)
            const box = new THREE.BoxGeometry(modelSize.x * 1.08, modelSize.y * 1.08, modelSize.z * 1.08)
            scaffold = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({color:0x46bad6,transparent:true,opacity:.55}))
            box.dispose()
            scene.add(scaffold)
            scanner = new THREE.Mesh(new THREE.PlaneGeometry(modelSize.x * 1.15, modelSize.z * 1.15), new THREE.MeshBasicMaterial({color:0x55d9ff,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}))
            scanner.rotation.x = -Math.PI / 2
            scene.add(scanner)
        }
        host.dataset.building = 'true'
        cancelAnimationFrame(animation)
        function tick(time) {
            if (disposed || !jobState) return
            if (time - lastFrame > 65 && host.offsetWidth && !document.hidden) {
                const remaining = Math.max(0, jobState.remaining - (time - jobReceived) / 1000)
                const progress = Math.min(1, Math.max(0, 1 - remaining / Math.max(1, jobState.seconds)))
                const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
                scanner.position.y = -modelSize.y / 2 + modelSize.y * (reduced ? progress : (time / 2500) % 1)
                buildPlane.constant = -modelSize.y / 2 + modelSize.y * Math.max(.04, progress)
                host.dataset.progress = String(progress)
                // Server snapshots alone decide completion and inventory changes.
                host.dataset.jobLabel = `${Math.floor(progress * 100)} % · ${Math.ceil(remaining)} s`
                model.position.y = baseY + (model.userData.modelRevision ? 0 : Math.max(0, progress - .9) * 2)
                draw()
                lastFrame = time
            }
            animation = requestAnimationFrame(tick)
        }
        animation = requestAnimationFrame(tick)
    }
    function release() {
        clearJob()
        if (model) {
            model.traverse((mesh) => mesh.geometry?.dispose())
            model.removeFromParent()
            model = null
        }
    }
    function show(item, job) {
        const alias = modelAliases[item.key],
            ship = shipModelAliases[item.key]
        if (!alias && !ship) return false
        release()
        model = alias
            ? createBuilding(
                  alias,
                  Math.max(1, Math.min(8, Number(job?.target || item.amount))),
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
        baseY = model.position.y
        fitModelCamera(camera, modelSize)
        camera.near = 0.05
        camera.far = 100
        camera.updateProjectionMatrix()
        setJob(job)
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
        setJob,
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
