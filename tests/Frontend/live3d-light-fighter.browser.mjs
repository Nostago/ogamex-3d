import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, mkdir } from 'node:fs/promises'
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
    account = JSON.parse(await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8')),
    artifacts = process.env.ARTIFACT_DIR || '/tmp/ogamex-light-fighter'
await mkdir(artifacts, { recursive: true })
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
    const context = await browser.newContext({
        baseURL: process.env.LIVE_BASE_URL || 'http://127.0.0.1',
        viewport: { width: 1540, height: 1000 },
        reducedMotion: 'reduce',
    })
    const login = await context.request.get('/login'),
        token = (await login.text()).match(
            /name="csrf-token" content="([^"]+)"/,
        )[1]
    assert.ok(
        [302, 303].includes(
            (
                await context.request.post('/login', {
                    form: {
                        email: account.email,
                        password: account.password,
                        _token: token,
                    },
                    maxRedirects: 0,
                })
            ).status(),
        ),
    )
    const page = await context.newPage(),
        errors = [],
        modelRequests = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('request', (r) => {
        if (r.url().endsWith('.glb')) modelRequests.push(r.url())
    })
    page.setDefaultTimeout(45000)
    await page.goto(`/play-3d?cp=${account.planet}#planet`)
    await page.waitForSelector('#prototype[data-ready=true]')
    await page.locator('[data-live-page=fleets]').first().click()
    await page.waitForSelector('[data-fleet-ship="204"]')
    const fleetImage = page
        .locator('[data-fleet-ship="204"]')
        .locator('..')
        .locator('img')
    await fleetImage.waitFor()
    assert.ok(
        (await fleetImage.getAttribute('src')).includes(
            'light-fighter-35-v1.webp',
        ),
    )
    await fleetImage.evaluate((image) => image.decode())
    assert.ok(
        await fleetImage.evaluate((n) => n.complete && n.naturalWidth === 512),
    )
    assert.equal(
        modelRequests.length,
        0,
        'Planet and fleet lists must load only the small portrait',
    )
    await page.screenshot({
        path: `artifacts/fleet-small-image.png`.replace('artifacts', artifacts),
    })
    await page.route('**/models/live3d/light-fighter-v2.glb', async (route) => {
        const response = await route.fetch()
        await new Promise((resolve) => setTimeout(resolve, 600))
        await route.fulfill({ response })
    })
    const firstModel = page.waitForRequest((request) =>
        request.url().endsWith('.glb'),
    )
    await page.locator('[data-live-page=ships]').first().click()
    await firstModel
    await page.locator('[data-object=cruiser]').click()
    await page.waitForTimeout(1000)
    assert.equal(
        await page
            .locator('#live-detail .object-artwork')
            .getAttribute('data-preview-object'),
        'cruiser',
    )
    await page.locator('[data-object=light_fighter]').click()
    const preview = page.locator('#live-detail .object-artwork')
    await page.waitForFunction(
        () =>
            document.querySelector('#live-detail .object-artwork')?.dataset
                .modelRevision === 'uploaded-light-fighter-v2',
    )
    assert.equal(await preview.getAttribute('data-artwork'), '3d')
    assert.equal(await preview.locator('canvas').count(), 1)
    const catalogImage = page.locator('[data-object=light_fighter] img')
    assert.ok(
        (await catalogImage.getAttribute('src')).includes(
            'light-fighter-35-v1.webp',
        ),
    )
    assert.equal(modelRequests.length, 1)
    await page.waitForTimeout(800)
    await preview.screenshot({
        path: `${artifacts}/uploaded-fighter-preview.png`,
    })
    const before = await preview.getAttribute('data-preview-frames'),
        box = await preview.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 65, box.y + box.height / 2, {
        steps: 6,
    })
    await page.mouse.up()
    assert.ok(
        Number(await preview.getAttribute('data-preview-frames')) >
            Number(before),
    )
    await preview.focus()
    await page.keyboard.press('ArrowLeft')
    // Late loading must not replace a different ship selection.
    const memory = []
    for (let i = 0; i < 5; i++) {
        await page.locator('[data-object=cruiser]').click()
        await page.waitForFunction(
            () =>
                document.querySelector('#live-detail .object-artwork')?.dataset
                    .modelRevision === 'ship',
        )
        await page.locator('[data-object=light_fighter]').click()
        await page.waitForFunction(
            () =>
                document.querySelector('#live-detail .object-artwork')?.dataset
                    .modelRevision === 'uploaded-light-fighter-v2',
        )
        memory.push({
            geometry: Number(
                await preview.getAttribute('data-preview-geometries'),
            ),
            textures: Number(
                await preview.getAttribute('data-preview-textures'),
            ),
        })
    }
    assert.equal(
        modelRequests.length,
        1,
        'The optimized asset is fetched only once per session',
    )
    assert.equal(
        new Set(memory.slice(1).map((item) => item.geometry)).size,
        1,
        JSON.stringify(memory),
    )
    assert.equal(
        new Set(memory.slice(1).map((item) => item.textures)).size,
        1,
        JSON.stringify(memory),
    )
    await page.locator('#live-quantity').fill('2')
    await page.locator('#live-start').click()
    await page.waitForFunction(
        () =>
            document.querySelector('#live-detail .object-artwork')?.dataset
                .building === 'true',
    )
    await page.waitForFunction(
        () =>
            Number(
                document.querySelector('#live-detail .object-artwork')?.dataset
                    .progress,
            ) >= 0,
    )
    await preview.screenshot({
        path: `${artifacts}/fighter-production-animation.png`,
    })
    // Queue cards use the same static portrait.
    await page.locator('[data-live-page=planet]').first().click()
    const activityImage = page
        .locator('#live-dock img[src*="light-fighter-35-v1.webp"]')
        .first()
    await activityImage.waitFor()
    await page.locator('[data-live-page=ships]').first().click()
    await page.locator('[data-object=light_fighter]').click()
    await page.waitForFunction(
        () =>
            document.querySelector('#live-detail .object-artwork')?.dataset
                .modelRevision === 'uploaded-light-fighter-v2',
    )
    await page.setViewportSize({ width: 390, height: 844 })
    await preview.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await preview.screenshot({
        path: `${artifacts}/fighter-mobile-preview.png`,
    })
    // Explicit context loss must keep a useful, sharp picture instead of an empty area.
    await preview
        .locator('canvas')
        .evaluate((canvas) =>
            canvas.dispatchEvent(
                new Event('webglcontextlost', { cancelable: true }),
            ),
        )
    await preview.locator('img.ship-preview-fallback').waitFor()
    assert.ok(
        await preview
            .locator('img')
            .evaluate((n) => n.complete && n.naturalWidth === 512),
    )
    assert.equal(await preview.getAttribute('data-artwork'), 'image')
    await preview.screenshot({
        path: `${artifacts}/fighter-image-fallback.png`,
    })
    assert.deepEqual(errors, [])
    console.log(
        'PASS: small shared images outside shipbuilding, real GLB preview, mouse/keyboard rotation, one asset fetch, bounded resources after switching, original production animation, queue portrait, mobile framing and context-loss image fallback',
    )
} finally {
    await browser.close()
}
