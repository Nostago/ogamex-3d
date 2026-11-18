import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, stat, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { shipPreviewAssets } from '../../resources/js/live3d/shipAssets.js'
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
    repo = path.resolve(fileURLToPath(new URL('../../', import.meta.url))),
    keys = process.env.SHIP_MODEL_KEYS
        ? process.env.SHIP_MODEL_KEYS.split(',')
        : Object.keys(shipPreviewAssets),
    artifacts = process.env.ARTIFACT_DIR || '/tmp/all-ship-models'
for (const key of keys) assert.ok(shipPreviewAssets[key], key)
await mkdir(artifacts, { recursive: true })
// Real rendering/decoding of the application component, with no Laravel login,
// database, game account, queue, worker or mutable game endpoint involved.
const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname === '/') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(
            `<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#081725;color:#d9f1ff;font:18px system-ui;margin:12px}#preview{height:420px;width:min(750px,100%);position:relative;background:radial-gradient(#22465a,#081725);overflow:hidden;border:1px solid #4288a3;border-radius:8px}canvas{display:block;width:100%;height:100%}.ship-preview-fallback{width:100%;height:100%;object-fit:contain}.object-preview-progress[hidden]{display:none}button{font:inherit;margin:4px;padding:10px;background:#12465c;color:#d9f1ff;border:1px solid #438ca6}</style></head><body><h1>Schiffsdetail</h1><nav></nav><main id="preview"></main><script type="module">import{createObjectArtwork}from'/resources/js/live3d/objectArtwork.js';import{shipPreviewAssets}from'/resources/js/live3d/shipAssets.js';const ui=createObjectArtwork({object_image:'Vorschaubild',object_preview:'3D-Modell',object_diagram:'Technische Skizze'});function select(key){document.querySelector('#preview').replaceChildren(ui.set({key,type:'ship',name:key,image:shipPreviewAssets[key].image,amount:1}));history.replaceState(null,'','?ship='+key)}for(const key of Object.keys(shipPreviewAssets)){const b=document.createElement('button');b.dataset.ship=key;b.textContent=key;b.onclick=()=>select(key);document.querySelector('nav').append(b)}const first=new URL(location).searchParams.get('ship')||'light_fighter';select(first);window.selectShip=select;document.querySelector('#preview').firstElementChild.style.cssText='width:100%;height:100%;position:relative';window.addEventListener('pagehide',()=>ui.dispose());</script></body></html>`,
        )
        return
    }
    try {
        const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '')
        if (relative.split('/').some((part) => part.startsWith('.')))
            throw new Error('path')
        const base = relative.startsWith('resources/js/')
                ? repo
                : path.join(repo, 'public'),
            target = path.resolve(base, relative)
        if (!target.startsWith(base + path.sep)) throw new Error('path')
        const data = await readFile(target),
            type = path.extname(target)
        res.setHeader(
            'Content-Type',
            {
                '.js': 'text/javascript',
                '.mjs': 'text/javascript',
                '.glb': 'model/gltf-binary',
                '.webp': 'image/webp',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.json': 'application/json',
            }[type] || 'application/octet-stream',
        )
        res.end(data)
    } catch {
        res.writeHead(404)
        res.end('Not found')
    }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`,
    browser = await chromium.launch({
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
    const context = await browser.newContext({
            viewport: { width: 1280, height: 950 },
            reducedMotion: 'reduce',
        }),
        page = await context.newPage(),
        requests = [],
        errors = [],
        diagnostics = [],
        memory = new Map()
    page.setDefaultTimeout(45000)
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
        if (message.type() === 'error') diagnostics.push(message.text())
    })
    page.on('response', (response) => {
        if (response.status() >= 400)
            diagnostics.push(`${response.status()} ${response.url()}`)
    })
    page.on('request', (request) => {
        if (request.url().endsWith('.glb'))
            requests.push(new URL(request.url()).pathname)
    })
    const preview = page.locator('.object-artwork')
    async function ready(key) {
        await page
            .waitForFunction(
                (revision) =>
                    document.querySelector('.object-artwork')?.dataset
                        .modelRevision === revision &&
                    document.querySelector('.object-artwork')?.dataset
                        .artwork === '3d',
                shipPreviewAssets[key].revision,
            )
            .catch(async (error) => {
                console.error(
                    JSON.stringify({
                        key,
                        diagnostics,
                        errors,
                        preview: await preview.evaluate((node) => ({
                            ...node.dataset,
                            width: node.clientWidth,
                            height: node.clientHeight,
                        })),
                    }),
                )
                throw error
            })
        assert.equal(await preview.getAttribute('data-preview-object'), key)
        assert.equal(await preview.locator('canvas').count(), 1)
        const usage = await preview.evaluate((n) => ({
            geometry: Number(n.dataset.previewGeometries),
            textures: Number(n.dataset.previewTextures),
        }))
        assert.ok(usage.geometry > 0 && usage.textures > 0)
        if (memory.has(key))
            assert.deepEqual(
                usage,
                memory.get(key),
                `${key}: GPU allocations grew after changing ships`,
            )
        else memory.set(key, usage)
    }
    await page.goto(`${origin}/?ship=${keys[0]}`)
    await ready(keys[0]) // No click on any image or canvas.
    assert.deepEqual(requests, [shipPreviewAssets[keys[0]].model])
    for (const key of keys) {
        await stat(path.join(repo, 'public', shipPreviewAssets[key].model))
        await page.locator(`[data-ship=${key}]`).click()
        await ready(key)
        if (['espionage_probe', 'pathfinder'].includes(key)) {
            const portrait = await page.evaluate(async (url) => {
                const image = new Image()
                image.src = url
                await image.decode()
                const canvas = document.createElement('canvas')
                canvas.width = image.naturalWidth
                canvas.height = image.naturalHeight
                const context = canvas.getContext('2d')
                context.drawImage(image, 0, 0)
                const pixels = context.getImageData(
                    0,
                    0,
                    canvas.width,
                    canvas.height,
                ).data
                let left = canvas.width,
                    right = 0,
                    top = canvas.height,
                    bottom = 0
                for (let y = 0; y < canvas.height; y++)
                    for (let x = 0; x < canvas.width; x++) {
                        if (pixels[(y * canvas.width + x) * 4 + 3] < 64)
                            continue
                        left = Math.min(left, x)
                        right = Math.max(right, x)
                        top = Math.min(top, y)
                        bottom = Math.max(bottom, y)
                    }
                return {
                    width: canvas.width,
                    height: canvas.height,
                    left,
                    right,
                    top,
                    bottom,
                }
            }, shipPreviewAssets[key].image)
            assert.equal(portrait.width, 512)
            assert.equal(portrait.height, 384)
            assert.ok(
                portrait.right - portrait.left > 512 * 0.8,
                `${key}: hull must fill the thumbnail`,
            )
            assert.ok(portrait.bottom - portrait.top > 384 * 0.7)
            assert.ok(
                portrait.left > 2 &&
                    portrait.top > 2 &&
                    portrait.right < 510 &&
                    portrait.bottom < 382,
                `${key}: keep every edge inside the portrait`,
            )
        }
        const before = await preview.getAttribute('data-preview-frames')
        await preview.focus()
        await page.keyboard.press('ArrowLeft')
        await page.waitForFunction(
            (old) =>
                document.querySelector('.object-artwork').dataset
                    .previewFrames !== old,
            before,
        )
        await preview.screenshot({ path: `${artifacts}/${key}.png` })
    }
    // Module-load and model-decode results from an earlier selection cannot win.
    await page.evaluate((keys) => {
        for (const key of keys) window.selectShip(key)
    }, keys)
    await ready(keys.at(-1))
    await page.reload()
    await ready(keys.at(-1))
    await page.setViewportSize({ width: 390, height: 844 })
    for (const key of keys) {
        await page.evaluate((key) => window.selectShip(key), key)
        await ready(key)
        assert.ok(
            await preview.evaluate(
                (n) => n.getBoundingClientRect().right <= innerWidth,
            ),
        )
    }
    await preview.screenshot({ path: `${artifacts}/mobile.png` })
    for (const request of requests)
        assert.ok(
            keys.some((key) => shipPreviewAssets[key].model === request),
            `Unexpected model downloaded: ${request}`,
        )
    await preview
        .locator('canvas')
        .evaluate((canvas) =>
            canvas.dispatchEvent(
                new Event('webglcontextlost', { cancelable: true }),
            ),
        )
    await preview.locator('img.ship-preview-fallback').waitFor()
    await page.evaluate((key) => window.selectShip(key), keys[0])
    await preview.locator('img.ship-preview-fallback').waitFor()
    assert.equal(await preview.locator('canvas').count(), 0)
    await preview.locator('img').evaluate((img) => img.decode())
    assert.deepEqual(errors, [])
    console.log(
        `PASS: ${keys.length}/17 actual uploaded ships; automatic initial preview, reload, rotation, rapid changes, bounded GPU allocations, mobile, context loss and selected-model-only downloads`,
    )
} finally {
    await browser.close()
    await new Promise((resolve) => server.close(resolve))
}
