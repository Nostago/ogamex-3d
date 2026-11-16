import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const manifest = JSON.parse(
    await readFile(
        new URL('../../public/build/manifest.json', import.meta.url),
        'utf8',
    ),
)
const artifacts = process.env.ARTIFACT_DIR || '/tmp/ogamex-ship-loading',
    label = process.env.LABEL || 'benchmark'
await mkdir(artifacts, { recursive: true })
const mbits = Number(process.env.DOWNLOAD_MBIT || 10),
    latency = Number(process.env.LATENCY_MS || 80)
assert.ok(
    mbits > 0 &&
        Number.isFinite(mbits) &&
        latency >= 0 &&
        Number.isFinite(latency),
)
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
const results = []
try {
    const context = await browser.newContext({
            viewport: { width: 800, height: 600 },
        }),
        page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency,
        downloadThroughput: (mbits * 1e6) / 8,
        uploadThroughput: 625000,
    })
    await page.route('**/__ship-benchmark', (r) =>
        r.fulfill({
            contentType: 'text/html',
            body: '<!doctype html><style>body{background:#071721}#preview{width:512px;height:290px}</style><div id="preview"></div>',
        }),
    )
    await page.goto(
        (process.env.LIVE_BASE_URL || 'http://127.0.0.1') + '/__ship-benchmark',
    )
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    const start = await page.evaluate(() => performance.now())
    await page.evaluate(async (module) => {
        window.createPreview = (await import(module)).createObjectPreview
    }, '/build/' + manifest['resources/js/live3d/objectPreview3d.js'].file)
    const importMs = await page.evaluate(
        (start) => performance.now() - start,
        start,
    )
    const createMs = await page.evaluate(() => {
        const t = performance.now()
        window.preview = window.createPreview(
            document.querySelector('#preview'),
        )
        document.querySelector('#preview').append(window.preview.canvas)
        return performance.now() - t
    })
    for (const key of [
        'light_fighter',
        'large_cargo',
        'colony_ship',
        'heavy_fighter',
    ]) {
        const result = await page.evaluate(async (key) => {
            const t = performance.now()
            await window.preview.show({ key, type: 'ship', amount: 1 }, null)
            const shown = performance.now()
            await new Promise((r) =>
                requestAnimationFrame(() => requestAnimationFrame(r)),
            )
            const entry = performance
                .getEntriesByType('resource')
                .filter((e) => e.name.endsWith('.glb'))
                .at(-1)
            return {
                key,
                showMs: shown - t,
                firstPaintMs: performance.now() - t,
                downloadMs: entry.duration,
                bytes: entry.encodedBodySize,
            }
        }, key)
        assert.ok(result.bytes > 0 && result.showMs > 0)
        results.push(result)
        await page
            .locator('#preview')
            .screenshot({ path: `${artifacts}/${label}-${key}.png` })
    }
    const warmMs = await page.evaluate(async () => {
        const t = performance.now()
        await window.preview.show(
            { key: 'light_fighter', type: 'ship', amount: 1 },
            null,
        )
        return performance.now() - t
    })
    assert.deepEqual(errors, [])
    const out = {
        connection: `${mbits} Mbit/s, ${latency} ms latency; Chromium software WebGL`,
        importMs,
        createMs,
        warmMs,
        models: results,
    }
    await writeFile(`${artifacts}/${label}.json`, JSON.stringify(out, null, 2))
    console.log(JSON.stringify(out))
} finally {
    await browser.close()
}
