import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, mkdir } from 'node:fs/promises'
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const account = JSON.parse(
    await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8'),
)
const artifacts = process.env.ARTIFACT_DIR || '/tmp/ogamex-planet-navigation'
await mkdir(artifacts, { recursive: true })
const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: [
        '--no-sandbox',
        '--enable-unsafe-swiftshader',
        '--use-gl=angle',
        '--use-angle=swiftshader',
    ],
})
try {
    const baseURL = process.env.LIVE_BASE_URL || 'http://127.0.0.1'
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
        requests = []
    page.setDefaultTimeout(40000)
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('request', (r) => requests.push(r.url()))
    await page.goto(`/play-3d?cp=${account.planet}#planet`)
    await page.locator('#live-overview-mode').click()
    await page.waitForSelector('#scene[data-renderer=webgl][data-frames]')
    assert.equal(
        await page.locator('#scene').getAttribute('data-surface'),
        'solid',
    )
    assert.equal(
        await page.locator('#scene').getAttribute('data-grounded'),
        'true',
    )
    assert.equal(
        await page.locator('#scene').getAttribute('data-transport'),
        'parcels',
    )
    assert.ok(
        Number(await page.locator('#scene').getAttribute('data-parcels')) > 0,
    )
    const config = await page
        .locator('#live-bootstrap')
        .evaluate((n) => JSON.parse(n.textContent))
    const first = config.initial.planet.id,
        second = config.initial.planets.find((p) => p.id !== first)
    assert.ok(second, 'Fixture requires two owned worlds')
    const colour = await page
        .locator('#scene')
        .getAttribute('data-surface-color')
    await page.locator('#live-colony').click()
    for (let i = 0; i < 5; i++) await page.locator('#live-zoom-in').click()
    await page.screenshot({
        path: `${artifacts}/grounded-colony-close.png`,
        fullPage: true,
    })
    assert.equal(
        requests.some((url) => url.includes('planet-atlas')),
        false,
    )
    await page.locator('#live-planet').selectOption(String(second.id))
    await page.waitForFunction(
        (id) => document.querySelector('#scene').dataset.planet === String(id),
        second.id,
    )
    assert.notEqual(
        await page.locator('#scene').getAttribute('data-surface-color'),
        colour,
    )
    await page.locator('#live-planet').selectOption(String(first))
    await page.waitForFunction(
        (id) => document.querySelector('#scene').dataset.planet === String(id),
        first,
    )
    assert.equal(
        await page.locator('#scene').getAttribute('data-surface-color'),
        colour,
    )
    await page.reload()
    await page.locator('#live-overview-mode').click()
    await page.waitForSelector('#scene[data-renderer=webgl][data-frames]')
    assert.equal(
        await page.locator('#scene').getAttribute('data-surface-color'),
        colour,
    )
    // No mission can be dispatched merely by opening the colony planner.
    let dispatches = 0
    page.on('request', (r) => {
        if (r.method() === 'POST' && r.url().includes('/fleet/send'))
            dispatches++
    })
    await page.locator('.nav-entry [data-live-page=galaxy]').click()
    await page.waitForSelector('.galaxy-row[data-position="1"]')
    const empty = page
        .locator('.galaxy-row')
        .filter({
            has: page.locator(
                '.galaxy-actions [data-mission="7"]:not(:disabled)',
            ),
        })
        .first()
    await empty.locator('button[aria-expanded]').click()
    const details = page.locator('.galaxy-detail:not([hidden])').first()
    await details
        .getByRole('button', { name: 'Neue Kolonie gründen', exact: true })
        .click()
    await page.waitForSelector('#live-page-fleets[data-fleet-ready=true]')
    await page.waitForFunction(
        () =>
            document.querySelector('#fleet-form [name=mission]').value ===
                '7' &&
            document.querySelector('[data-fleet-ship="208"]').value === '1',
    )
    assert.equal(dispatches, 0)
    // The content is masked while a slow response is in flight.
    const frame = page.frameLocator('#live-original')
    async function nav(area, path) {
        await page.locator(`.nav-entry [data-live-page=${area}]`).click()
        await page
            .waitForFunction((path) => {
                const f = document.querySelector('#live-original')
                return (
                    f.dataset.ready === 'true' && f.dataset.areaReady === path
                )
            }, path)
            .catch(async (error) => {
                console.log(
                    'Navigation diagnostics',
                    area,
                    await page.locator('#live-original').evaluate((f) => ({
                        ready: f.dataset.ready,
                        area: f.dataset.areaReady,
                        url: f.contentWindow.location.href,
                        loader: document.querySelector(
                            '#live-original-loading-text',
                        ).textContent,
                        status: document.querySelector('#live-status')
                            .textContent,
                    })),
                    errors,
                )
                throw error
            })
        assert.equal(
            await frame.locator('link[data-live3d-embedded-style]').count(),
            1,
        )
        assert.equal(await frame.locator('#top').isVisible(), false)
        assert.equal(
            await page
                .locator('#live-original')
                .evaluate((n) => getComputedStyle(n).borderTopWidth),
            '0px',
        )
    }
    await nav('alliance', '/alliance')
    await page.route('**/messages?*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 700))
        await route.continue()
    })
    await page.locator('.nav-entry [data-live-page=messages]').click()
    assert.equal(await page.locator('#live-original-loader').isVisible(), true)
    assert.equal(
        await page
            .locator('#live-original')
            .evaluate((n) => getComputedStyle(n).visibility),
        'hidden',
    )
    await page.waitForFunction(
        () =>
            document.querySelector('#live-original').dataset.areaReady ===
                '/messages' &&
            document.querySelector('#live-original').dataset.ready === 'true',
    )
    assert.equal(await frame.locator('.prototype-mail-back').count(), 0)
    await frame.locator('#tabs-nfUniverse a').click()
    await frame.locator('.msg[data-msg-id]').first().waitFor()
    await page.screenshot({ path: `${artifacts}/messages.png`, fullPage: true })
    for (const [area, path] of [
        ['alliance', '/alliance'],
        ['messages', '/messages'],
        ['buddies', '/buddies'],
        ['notes', '/play-3d/notes'],
        ['options', '/options'],
        ['merchant', '/merchant'],
    ])
        await nav(area, path)
    await page.screenshot({ path: `${artifacts}/merchant.png`, fullPage: true })
    // A delayed old page may not override the latest chosen navigation area.
    await page.locator('.nav-entry [data-live-page=messages]').click()
    await page.locator('.nav-entry [data-live-page=alliance]').click()
    await page.waitForFunction(
        () =>
            document.querySelector('#prototype').dataset.page === 'alliance' &&
            document.querySelector('#live-original').dataset.areaReady ===
                '/alliance' &&
            document.querySelector('#live-original').dataset.ready === 'true',
    )
    await page.screenshot({ path: `${artifacts}/alliance.png`, fullPage: true })
    // Even without any JavaScript, the original documents arrive styled in their head.
    const noScript = await browser.newContext({
        baseURL,
        javaScriptEnabled: false,
        viewport: { width: 1200, height: 900 },
    })
    await noScript.addCookies(await context.cookies())
    const staticPage = await noScript.newPage()
    await staticPage.goto('/alliance?ui=live3d')
    assert.equal(
        await staticPage.locator('link[data-live3d-embedded-style]').count(),
        1,
    )
    assert.equal(await staticPage.locator('#top').isVisible(), false)
    assert.equal(
        await staticPage
            .locator('body')
            .evaluate((n) => getComputedStyle(n).backgroundColor),
        'rgb(7, 21, 33)',
    )
    await noScript.close()
    assert.deepEqual(errors, [])
    console.log(
        JSON.stringify({
            solidPerPlanetColour: true,
            stableOnReload: true,
            noEarthAtlas: true,
            groundedBuildings: true,
            parcels: true,
            colonyShipPrefilled: true,
            zeroAccidentalDispatches: true,
            serverStyledBeforeJavaScript: true,
            slowNavigationMasked: true,
            rapidNavigationStable: true,
            browserErrors: errors,
        }),
    )
} finally {
    await browser.close()
}
