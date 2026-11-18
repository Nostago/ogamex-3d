import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { shipPreviewAssets } from '../../resources/js/live3d/shipAssets.js'

const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
    account = JSON.parse(await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8')),
    baseURL = process.env.LIVE_BASE_URL,
    artifacts = process.env.ARTIFACT_DIR || '/tmp/all-ship-models-ingame'
assert.ok(
    baseURL,
    'Use a development application with a separate test database',
)
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
        baseURL,
        viewport: { width: 1540, height: 1000 },
        reducedMotion: 'reduce',
    })
    const login = await context.request.get('/login'),
        token = (await login.text()).match(
            /name="csrf-token" content="([^"]+)"/,
        )[1]
    const signed = await context.request.post('/login', {
        form: {
            email: account.email,
            password: account.password,
            _token: token,
        },
        maxRedirects: 0,
    })
    assert.ok([302, 303].includes(signed.status()))
    const page = await context.newPage(),
        errors = [],
        downloads = []
    page.setDefaultTimeout(45000)
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('request', (request) => {
        const url = new URL(request.url())
        if (
            url.pathname.startsWith('/models/live3d/') &&
            url.pathname.endsWith('.glb')
        )
            downloads.push(url.pathname)
    })
    await page.goto(`/play-3d?cp=${account.planet}#fleets`)
    await page.locator('[data-fleet-ship="204"]').waitFor()
    for (const [key, asset] of Object.entries(shipPreviewAssets)) {
        if (['crawler', 'solar_satellite'].includes(key)) continue
        const image = page.locator(`img[src$="${asset.image}"]`).first()
        await image.waitFor()
        await image.evaluate((img) => img.decode())
    }
    assert.equal(downloads.length, 0, 'Fleet lists must not download GLBs')
    await page.screenshot({
        path: `${artifacts}/fleet-thumbnails.png`,
        fullPage: true,
    })
    await page.goto(`/play-3d?cp=${account.planet}#ships`)
    const preview = page.locator('#live-detail .object-artwork')
    async function ready(key) {
        await page.waitForFunction(
            (revision) =>
                document.querySelector('#live-detail .object-artwork')?.dataset
                    .modelRevision === revision,
            shipPreviewAssets[key].revision,
        )
        assert.equal(await preview.getAttribute('data-preview-object'), key)
        assert.equal(await preview.locator('canvas').count(), 1)
    }
    await preview.waitFor()
    const initialKey = await preview.getAttribute('data-preview-object')
    await ready(initialKey)
    assert.deepEqual(
        downloads,
        [shipPreviewAssets[initialKey].model],
        'Initial detail must load only the selected ship without an image click',
    )
    const bootstrap = JSON.parse(
        await page.locator('#live-bootstrap').textContent(),
    )
    for (const [key, asset] of Object.entries(shipPreviewAssets)) {
        assert.equal(
            new URL(
                bootstrap.initial.objects.find(
                    (object) => object.key === key,
                ).image,
            ).pathname,
            asset.image,
        )
        await page.locator(`[data-object="${key}"]`).click()
        await ready(key)
        const image = page.locator(`[data-object="${key}"] img`)
        assert.ok((await image.getAttribute('src')).endsWith(asset.image))
        await image.evaluate((img) => img.decode())
        if (['deathstar', 'solar_satellite', 'espionage_probe'].includes(key)) {
            await preview.scrollIntoViewIfNeeded()
            await preview.screenshot({ path: `${artifacts}/${key}.png` })
        }
    }
    await page.reload()
    await preview.waitFor()
    await ready(await preview.getAttribute('data-preview-object'))
    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('[data-object="deathstar"]').click()
    await ready('deathstar')
    await preview.scrollIntoViewIfNeeded()
    assert.ok(
        await preview.evaluate(
            (node) => node.getBoundingClientRect().width <= innerWidth,
        ),
    )
    await preview.screenshot({ path: `${artifacts}/mobile.png` })
    assert.deepEqual(errors, [])
    console.log(
        'PASS: 17/17 ships in the built game UI; automatic initial detail and refresh, matching thumbnails, fleet lists without GLB downloads, mobile; no production commands submitted',
    )
} finally {
    await browser.close()
}
