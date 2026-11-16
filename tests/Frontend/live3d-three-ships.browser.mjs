import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, mkdir } from 'node:fs/promises'
import { shipPreviewAssets } from '../../resources/js/live3d/shipAssets.js'
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
    account = JSON.parse(await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8')),
    artifacts = process.env.ARTIFACT_DIR || '/tmp/ogamex-three-ships',
    keys = ['large_cargo', 'colony_ship', 'heavy_fighter']
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
        requests = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('request', (r) => {
        if (r.url().endsWith('.glb')) requests.push(new URL(r.url()).pathname)
    })
    page.setDefaultTimeout(45000)
    await page.goto(`/play-3d?cp=${account.planet}#fleets`)
    await page.waitForSelector('[data-fleet-ship="203"]')
    for (const [id, key] of [
        [203, 'large_cargo'],
        [208, 'colony_ship'],
        [205, 'heavy_fighter'],
    ]) {
        const image = page
            .locator(`[data-fleet-ship="${id}"]`)
            .locator('..')
            .locator('img')
        assert.ok(
            (await image.getAttribute('src')).endsWith(
                shipPreviewAssets[key].image,
            ),
        )
        await image.evaluate((n) => n.decode())
        assert.ok(await image.evaluate((n) => n.naturalWidth === 512))
    }
    assert.equal(
        requests.length,
        0,
        'Fleet selection must use only the small images',
    )
    await page.screenshot({ path: `${artifacts}/fleet-images.png` })
    await page.locator('[data-live-page=ships]').first().click()
    const preview = page.locator('#live-detail .object-artwork')
    async function select(key) {
        await page.locator(`[data-object=${key}]`).click()
        await page.waitForFunction(
            (revision) =>
                document.querySelector('#live-detail .object-artwork')?.dataset
                    .modelRevision === revision,
            shipPreviewAssets[key].revision,
        )
        assert.equal(await preview.getAttribute('data-preview-object'), key)
    }
    for (const key of keys) {
        await select(key)
        await preview.scrollIntoViewIfNeeded()
        await page.waitForTimeout(250)
        assert.ok(
            (
                await page
                    .locator(`[data-object=${key}] img`)
                    .getAttribute('src')
            ).endsWith(shipPreviewAssets[key].image),
        )
        const box = await preview.boundingBox(),
            before = Number(await preview.getAttribute('data-preview-frames'))
        await page.mouse.move(
            box.x + box.width * 0.45,
            box.y + box.height * 0.5,
        )
        await page.mouse.down()
        await page.mouse.move(
            box.x + box.width * 0.6,
            box.y + box.height * 0.5,
            { steps: 4 },
        )
        await page.mouse.up()
        await page.waitForFunction(
            (frames) =>
                Number(
                    document.querySelector('#live-detail .object-artwork')
                        ?.dataset.previewFrames,
                ) > frames,
            before,
        )
        await preview.focus()
        await page.keyboard.press('ArrowLeft')
        await preview.screenshot({ path: `${artifacts}/${key}-preview.png` })
    }
    for (let pass = 0; pass < 2; pass++)
        for (const key of keys) await select(key)
    for (const key of keys)
        assert.equal(
            requests.filter((path) => path === shipPreviewAssets[key].model)
                .length,
            1,
            `${key} downloaded more than once`,
        )
    // Each original queue retains its own ship ID and thumbnail.
    for (const key of keys) {
        await select(key)
        await page.locator('#live-quantity').fill('1')
        await page.locator('#live-start').click()
        await page.waitForFunction(
            () => !document.querySelector('#live-start').disabled,
        )
    }
    await page.locator('[data-live-page=planet]').first().click()
    for (const key of keys)
        await page
            .locator(`#live-dock img[src$="${shipPreviewAssets[key].image}"]`)
            .first()
            .waitFor()
    await page.screenshot({ path: `${artifacts}/production-portraits.png` })
    await page.locator('[data-live-page=ships]').first().click()
    for (const key of keys) {
        await select(key)
        await page.setViewportSize({ width: 390, height: 844 })
        await preview.scrollIntoViewIfNeeded()
        await page.waitForTimeout(200)
        await preview.screenshot({ path: `${artifacts}/${key}-mobile.png` })
        await page.setViewportSize({ width: 1540, height: 1000 })
    }
    await preview
        .locator('canvas')
        .evaluate((canvas) =>
            canvas.dispatchEvent(
                new Event('webglcontextlost', { cancelable: true }),
            ),
        )
    await preview.locator('img.ship-preview-fallback').waitFor()
    // State polling and subsequent selections must not recreate a failed context.
    await page.waitForTimeout(6500)
    await preview.locator('img.ship-preview-fallback').waitFor()
    assert.ok(
        (await preview.locator('img').getAttribute('src')).endsWith(
            shipPreviewAssets.heavy_fighter.image,
        ),
    )
    await page.locator('[data-object=colony_ship]').click()
    await preview.locator('img.ship-preview-fallback').waitFor()
    assert.ok(
        (await preview.locator('img').getAttribute('src')).endsWith(
            shipPreviewAssets.colony_ship.image,
        ),
    )
    assert.equal(await preview.locator('canvas').count(), 0)
    assert.deepEqual(errors, [])
    console.log(
        'PASS: correct GLB and image for all three types, mouse/keyboard rotation, one download per model, original production IDs/portraits, mobile framing and context-loss image fallback',
    )
} finally {
    await browser.close()
}
