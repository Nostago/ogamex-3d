// Development only: render the actual GLB with the in-game Three.js materials.
// Fit every projected vertex with a consistent margin; never crop geometry defects.
// Usage: PLAYWRIGHT_MODULE=/path/to/playwright node scripts/assets/render-ship-portraits.mjs output-dir bomber reaper ...
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { shipPreviewAssets } from '../../resources/js/live3d/shipAssets.js'

const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
    repo = path.resolve(fileURLToPath(new URL('../../', import.meta.url))),
    [output, ...keys] = process.argv.slice(2)
if (!output || !keys.length || keys.some((key) => !shipPreviewAssets[key]))
    throw new Error('Provide an output directory and registered ship keys')
await mkdir(output, { recursive: true })
const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname
    if (pathname === '/') {
        response.setHeader('Content-Type', 'text/html')
        response.end('<!doctype html><canvas id="portrait"></canvas>')
        return
    }
    try {
        const relative = decodeURIComponent(pathname).replace(/^\/+/, ''),
            base = relative.startsWith('resources/js/')
                ? repo
                : path.join(repo, 'public'),
            file = path.resolve(base, relative)
        if (
            !file.startsWith(base + path.sep) ||
            relative.split('/').some((part) => part.startsWith('.'))
        )
            throw new Error('path')
        response.setHeader(
            'Content-Type',
            {
                '.js': 'text/javascript',
                '.mjs': 'text/javascript',
                '.glb': 'model/gltf-binary',
            }[path.extname(file)] || 'application/octet-stream',
        )
        response.end(await readFile(file))
    } catch {
        response.writeHead(404).end()
    }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--enable-unsafe-swiftshader',
        '--use-gl=angle',
        '--use-angle=swiftshader',
    ],
})
try {
    const page = await browser.newPage()
    await page.goto(`http://127.0.0.1:${server.address().port}`)
    for (const key of keys) {
        const result = await page.evaluate(
            async ({ key, asset }) => {
                const THREE = await import(
                        '/resources/js/prototype3d/vendor/three.module.min.js'
                    ),
                    { GLTFLoader } = await import(
                        '/resources/js/prototype3d/vendor/loaders/GLTFLoader.js'
                    ),
                    { MeshoptDecoder } = await import(
                        '/resources/js/prototype3d/vendor/meshopt/meshopt_decoder.mjs'
                    ),
                    { createColonyMaterials } = await import(
                        '/resources/js/prototype3d/materials.js'
                    )
                const width = 1024,
                    height = 768,
                    aspect = width / height,
                    canvas = document.createElement('canvas'),
                    renderer = new THREE.WebGLRenderer({
                        canvas,
                        alpha: true,
                        antialias: true,
                        preserveDrawingBuffer: true,
                    }),
                    scene = new THREE.Scene(),
                    materials = createColonyMaterials()
                document.querySelector('canvas').replaceWith(canvas)
                renderer.setSize(width, height, false)
                renderer.outputColorSpace = THREE.SRGBColorSpace
                renderer.toneMapping = THREE.ACESFilmicToneMapping
                renderer.toneMappingExposure = 1.15
                scene.environment = materials.environment
                scene.add(new THREE.HemisphereLight(0xe1efff, 0x293542, 2))
                for (const [color, intensity, position] of [
                    [0xfff3df, 4, [-5, 9, 7]],
                    [0xb9dcff, 3, [5, 3, -7]],
                    [0xffffff, 2, [8, 4, 6]],
                ]) {
                    const light = new THREE.DirectionalLight(color, intensity)
                    light.position.set(...position)
                    scene.add(light)
                }
                const model = (
                    await new GLTFLoader()
                        .setMeshoptDecoder(MeshoptDecoder)
                        .loadAsync(asset.model)
                ).scene
                const box = new THREE.Box3().setFromObject(model),
                    size = box.getSize(new THREE.Vector3()),
                    extent = Math.max(size.x, size.y, size.z)
                model.position.sub(box.getCenter(new THREE.Vector3()))
                const root = new THREE.Group()
                root.add(model)
                root.scale.setScalar(5 / extent)
                scene.add(root)
                const direction = new THREE.Vector3(
                        Math.cos((asset.azimuth * Math.PI) / 180),
                        Math.tan((asset.elevation * Math.PI) / 180),
                        Math.sin((asset.azimuth * Math.PI) / 180),
                    ).normalize(),
                    target = new THREE.Vector3(),
                    camera = new THREE.OrthographicCamera(
                        -4 * aspect,
                        4 * aspect,
                        4,
                        -4,
                        0.01,
                        100,
                    )
                camera.position.copy(direction).multiplyScalar(15)
                if (key === 'espionage_probe')
                    camera.up.applyAxisAngle(direction, -Math.PI / 4)
                camera.lookAt(target)
                renderer.render(scene, camera)
                // Project actual vertices, not the empty corners of a 3D bounding box.
                // Portrait roll changes only the image composition, not the GLB.
                camera.updateMatrixWorld(true)
                root.updateMatrixWorld(true)
                let left = Infinity,
                    right = -Infinity,
                    bottom = Infinity,
                    top = -Infinity
                const point = new THREE.Vector3()
                root.traverse((mesh) => {
                    const positions = mesh.geometry?.getAttribute('position')
                    if (!mesh.isMesh || !positions) return
                    for (let i = 0; i < positions.count; i++) {
                        point
                            .fromBufferAttribute(positions, i)
                            .applyMatrix4(mesh.matrixWorld)
                            .applyMatrix4(camera.matrixWorldInverse)
                        left = Math.min(left, point.x)
                        right = Math.max(right, point.x)
                        bottom = Math.min(bottom, point.y)
                        top = Math.max(top, point.y)
                    }
                })
                if (![left, right, bottom, top].every(Number.isFinite))
                    throw new Error(`${key}: invalid geometry`)
                const rotation = new THREE.Matrix4().extractRotation(
                        camera.matrixWorld,
                    ),
                    horizontal = new THREE.Vector3(1, 0, 0).applyMatrix4(
                        rotation,
                    ),
                    vertical = new THREE.Vector3(0, 1, 0).applyMatrix4(
                        rotation,
                    ),
                    shift = horizontal
                        .multiplyScalar((left + right) / 2)
                        .add(vertical.multiplyScalar((bottom + top) / 2)),
                    halfHeight =
                        (Math.max((right - left) / aspect, top - bottom) *
                            1.16) /
                        2
                target.add(shift)
                camera.position.add(shift)
                camera.lookAt(target)
                camera.left = -halfHeight * aspect
                camera.right = halfHeight * aspect
                camera.top = halfHeight
                camera.bottom = -halfHeight
                camera.updateProjectionMatrix()
                renderer.render(scene, camera)
                const png = canvas.toDataURL('image/png').split(',')[1],
                    thumbnail = document.createElement('canvas')
                thumbnail.width = 512
                thumbnail.height = 384
                thumbnail.getContext('2d').drawImage(canvas, 0, 0, 512, 384)
                const webp = thumbnail
                    .toDataURL('image/webp', 0.9)
                    .split(',')[1]
                model.traverse((mesh) => {
                    mesh.geometry?.dispose()
                    if (mesh.isMesh)
                        for (const material of Array.isArray(mesh.material)
                            ? mesh.material
                            : [mesh.material]) {
                            for (const value of Object.values(material))
                                if (value?.isTexture) value.dispose()
                            material.dispose()
                        }
                })
                materials.dispose()
                renderer.dispose()
                renderer.forceContextLoss()
                return {
                    png,
                    webp,
                    key,
                    azimuth: asset.azimuth,
                    elevation: asset.elevation,
                    portraitRoll: key === 'espionage_probe' ? -45 : 0,
                    margin: 1.16,
                }
            },
            { key, asset: shipPreviewAssets[key] },
        )
        await writeFile(
            path.join(output, `${key}-35.png`),
            Buffer.from(result.png, 'base64'),
        )
        await writeFile(
            path.join(output, `${key}-35-v2.webp`),
            Buffer.from(result.webp, 'base64'),
        )
        delete result.png
        delete result.webp
        await writeFile(
            path.join(output, `${key}-portrait.json`),
            JSON.stringify(result, null, 2) + '\n',
        )
        console.log(`${key}: portrait rendered`)
    }
} finally {
    await browser.close()
    await new Promise((resolve) => server.close(resolve))
}
