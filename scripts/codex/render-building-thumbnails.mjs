// Render the actual procedural models into catalogue thumbnails. No external assets.
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
process.umask(0o022);
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.join(root, 'public/img/live3d/models');
await mkdir(output, { recursive: true, mode: 0o755 });
const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
try {
    const page = await browser.newPage();
    await page.route('http://models.test/**', async (route) => {
        const pathname = new URL(route.request().url()).pathname;
        if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' });
        const file = path.resolve(root, `.${pathname}`);
        if (!file.startsWith(`${root}/resources/js/`)) return route.abort();
        await route.fulfill({ contentType: 'application/javascript', body: await readFile(file) });
    });
    await page.goto('http://models.test/');
    const images = await page.evaluate(async () => {
        const THREE = await import('/resources/js/prototype3d/vendor/three.module.min.js');
        const { createBuilding, buildingModelTypes } = await import('/resources/js/prototype3d/buildings.js');
        const { fitModelCamera } = await import('/resources/js/prototype3d/modelCamera.js');
        const { createColonyMaterials } = await import('/resources/js/prototype3d/materials.js');
        const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        renderer.setSize(256, 192);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        const materials = createColonyMaterials(), scene = new THREE.Scene();
        scene.background = new THREE.Color(0x091925);
        scene.environment = materials.environment;
        scene.add(new THREE.HemisphereLight(0xcce5ff, 0x18202b, 1));
        const key = new THREE.DirectionalLight(0xfff0dc, 3.4);
        key.position.set(-4, 8, 6);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x51bcff, 1.8);
        rim.position.set(5, 3, -5);
        scene.add(rim);
        const camera = new THREE.PerspectiveCamera(34, 256 / 192, 0.05, 100);
        const images = {};
        for (const id of buildingModelTypes) {
            const { group } = createBuilding(id, 5, materials.palette);
            const box = new THREE.Box3().setFromObject(group);
            const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
            group.position.sub(center);
            scene.add(group);
            fitModelCamera(camera, size);
            renderer.render(scene, camera);
            images[id] = renderer.domElement.toDataURL('image/webp', 0.93).split(',')[1];
            group.removeFromParent();
            group.traverse((part) => part.geometry?.dispose());
        }
        materials.dispose();
        renderer.dispose();
        return images;
    });
    for (const [id, data] of Object.entries(images))
        await writeFile(path.join(output, `${id}.webp`), Buffer.from(data, 'base64'), { mode: 0o644 });
    console.log(`Rendered ${Object.keys(images).length} building thumbnails from the shared models`);
} finally {
    await browser.close();
}
