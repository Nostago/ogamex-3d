import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, mkdir } from 'node:fs/promises'
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const intelFixture = process.env.INTEL_FIXTURE_FILE
    ? JSON.parse(await readFile(process.env.INTEL_FIXTURE_FILE, 'utf8'))
    : null
const account = JSON.parse(
        await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8'),
    ),
    artifacts = process.env.ARTIFACT_DIR || '/tmp/ogamex-system-map'
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
    const context = await browser.newContext({
        baseURL: process.env.LIVE_BASE_URL || 'http://127.0.0.1',
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
        writes = [],
        sceneModules = []
    page.setDefaultTimeout(30000)
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('request', (r) => {
        if (r.method() === 'POST' && /play-3d\/fleet\/send/.test(r.url()))
            writes.push(r.url())
        if (/\/scene-[^/]+\.js/.test(r.url())) sceneModules.push(r.url())
    })
    await page.goto(`/play-3d?cp=${account.planet}#planet`)
    await page
        .locator('#live-system-map[aria-busy="false"] .system-map-node')
        .first()
        .waitFor()
    assert.equal(await page.locator('.system-map-node').count(), 15)
    assert.equal(
        await page
            .locator('#live-system-map-mode')
            .getAttribute('aria-pressed'),
        'true',
    )
    assert.equal(await page.locator('.scene-panel').isVisible(), false)
    assert.equal(
        sceneModules.length,
        0,
        'Default map must not download the 3D renderer',
    )
    await page.locator('#system-map-fleet-list h3').waitFor()
    const bootstrap = await page
            .locator('#live-bootstrap')
            .evaluate((n) => JSON.parse(n.textContent)),
        initial = bootstrap.initial.planet,
        other = bootstrap.initial.planets.find((p) => p.id !== initial.id)
    assert.ok(other, 'Fixture needs two owned worlds')
    assert.equal(
        await page.locator('.system-map-node[data-current="true"]').count(),
        1,
    )
    assert.ok(
        (await page.locator('#system-map-title').textContent()).includes(
            initial.coordinates.split(':').slice(0, 2).join(':'),
        ),
    )
    assert.equal(
        await page
            .locator('.system-map-node[data-current="true"]')
            .evaluate((n) => n.style.getPropertyValue('--x')),
        '50%',
    )
    assert.equal(
        await page
            .locator('.system-map-node[data-current="true"]')
            .evaluate((n) => n.style.getPropertyValue('--y')),
        '50%',
    )
    assert.ok(
        (await page.locator('#system-map-connections line').count()) >= 14,
    )
    if (intelFixture) {
        const target = page.locator(
            `[data-map-position="${intelFixture.position}"]`,
        )
        await page.waitForFunction(
            (position) =>
                document.querySelector(`[data-map-position="${position}"]`)
                    ?.dataset.risk === 'armed',
            intelFixture.position,
        )
        assert.equal(await target.getAttribute('data-stale'), 'true')
        await target.click()
        assert.ok(
            (
                await page.locator('#system-map-intelligence').innerText()
            ).includes('Militärpräsenz gemeldet'),
        )
        assert.ok(
            (
                await page.locator('#system-map-intelligence').innerText()
            ).includes('Bericht veraltet'),
        )
        assert.ok(
            (
                await page.locator('#system-map-intelligence').innerText()
            ).includes('433.000'),
        )
        const research = page
            .locator('.map-report-section')
            .filter({ has: page.locator('summary', { hasText: 'Forschung' }) })
        await research.locator('summary').click()
        assert.ok((await research.innerText()).includes('nicht aufgedeckt'))
        await page.screenshot({
            path: `${artifacts}/historical-reconnaissance.png`,
            fullPage: true,
        })
        await page.keyboard.press('Escape')
    }
    // Native dialog is keyboard accessible and Escape returns focus to its origin.
    const own = page.locator('.system-map-node[data-current="true"]')
    await own.focus()
    await page.keyboard.press('Enter')
    await page.locator('#system-map-dialog[open]').waitFor()
    assert.ok(
        (await page.locator('#system-map-dialog-title').textContent()).includes(
            initial.name,
        ),
    )
    assert.equal(await page.locator('.system-map-select:disabled').count(), 1)
    await page.keyboard.press('Escape')
    assert.equal(await own.evaluate((n) => n === document.activeElement), true)
    const mapBounds = await page.locator('#live-system-map').boundingBox()
    for (const node of await page.locator('.system-map-node').all()) {
        const bounds = await node.boundingBox()
        assert.ok(
            bounds.y >= mapBounds.y &&
                bounds.y + bounds.height <= mapBounds.y + mapBounds.height,
            'Every position must remain inside the map, above the toolbar and cards',
        )
    }
    await page.screenshot({
        path: `${artifacts}/system-map-desktop.png`,
        fullPage: true,
    })
    if (
        other.coordinates.split(':').slice(0, 2).join(':') ===
        initial.coordinates.split(':').slice(0, 2).join(':')
    ) {
        await page
            .locator(`[data-map-position="${other.coordinates.split(':')[2]}"]`)
            .click()
        // A slow world load spanning a refresh tick must not leave the map paused.
        await page.route('**/play-3d/state?*', async (route) => {
            if (
                new URL(route.request().url()).searchParams.get('planet') ===
                String(other.id)
            ) {
                const response = await route.fetch()
                await new Promise((resolve) => setTimeout(resolve, 6000))
                await route.fulfill({ response }).catch(() => {})
            } else await route.continue()
        })
        await page.locator('.system-map-select:enabled').click()
        await page.waitForFunction(
            (id) =>
                document.querySelector('#live-system-map').dataset.planet ===
                String(id),
            other.id,
        )
        await page.unroute('**/play-3d/state?*')
        await page.locator('#live-planet').selectOption(String(initial.id))
        await page.waitForFunction(
            (id) =>
                document.querySelector('#live-system-map').dataset.planet ===
                String(id),
            initial.id,
        )
    }
    // All available missions come from the original galaxy response; no click sends a fleet.
    let colonyPosition
    for (const button of await page
        .locator('.system-map-node[data-occupied="false"]')
        .all()) {
        await button.click()
        const colony = page.locator(
            '#system-map-details [data-mission="7"]:enabled',
        )
        if (await colony.count()) {
            colonyPosition = await button.getAttribute('data-map-position')
            await colony.click()
            break
        }
        await page.keyboard.press('Escape')
    }
    assert.ok(
        colonyPosition,
        'Fixture must offer at least one original colonisation action',
    )
    await page
        .locator('#system-map-planner:not([hidden]) [data-fleet-ship="208"]')
        .waitFor()
    assert.equal(
        await page.locator('#fleet-form [name=position]').inputValue(),
        colonyPosition,
    )
    assert.equal(
        await page.locator('#fleet-form [name=mission]').inputValue(),
        '7',
    )
    assert.equal(
        await page.locator('[data-fleet-ship="208"]').inputValue(),
        '1',
    )
    assert.equal(new URL(page.url()).hash, '#planet')
    assert.equal(await page.locator('#live-page-galaxy').isVisible(), false)
    assert.equal(writes.length, 0)
    await page.screenshot({
        path: `${artifacts}/system-map-inline-fleet.png`,
        fullPage: true,
    })
    await page.locator('#system-map-plan-close').click()
    assert.equal(await page.locator('#live-page-fleets').isVisible(), false)
    // Switching world must follow its actual system, including after a delayed stale response.
    const [oldG, oldS] = initial.coordinates.split(':'),
        [newG, newS] = other.coordinates.split(':')
    await page.route('**/play-3d/galaxy?*', async (route) => {
        const url = new URL(route.request().url())
        if (url.searchParams.get('planet') === String(initial.id)) {
            const response = await route.fetch()
            await new Promise((resolve) => setTimeout(resolve, 750))
            await route.fulfill({ response }).catch(() => {})
        } else await route.continue()
    })
    const delayed = page.waitForRequest(
        (r) =>
            r.url().includes('/play-3d/galaxy?') &&
            new URL(r.url()).searchParams.get('planet') === String(initial.id),
    )
    await page.locator('#system-map-refresh').click()
    await delayed
    await page.locator('#live-planet').selectOption(String(other.id))
    await page.waitForFunction(
        (id) =>
            document.querySelector('#live-system-map').dataset.planet ===
                String(id) &&
            document
                .querySelector('#live-system-map')
                .getAttribute('aria-busy') === 'false',
        other.id,
    )
    await page.waitForTimeout(900)
    assert.ok(
        (await page.locator('#system-map-title').textContent()).includes(
            `${newG}:${newS}`,
        ),
    )
    assert.equal(await page.locator('.system-map-node').count(), 15)
    await page.unroute('**/play-3d/galaxy?*')
    // Enlarged values and labels are readable without hover, with no horizontal clipping.
    const sizes = await page
        .locator('#live-overview .stat-line')
        .evaluateAll((rows) =>
            rows.map((row) => ({
                label: parseFloat(getComputedStyle(row).fontSize),
                value: parseFloat(
                    getComputedStyle(row.querySelector('strong')).fontSize,
                ),
                clipped: row.scrollWidth > row.clientWidth + 1,
            })),
        )
    assert.ok(
        sizes.every(
            (row) => row.label >= 20 && row.value >= 22 && !row.clipped,
        ),
    )
    await page.locator('#live-overview-mode').click()
    await page.waitForSelector('#scene[data-renderer=webgl][data-frames]')
    assert.equal(await page.locator('#live-system-map').isVisible(), false)
    await page.locator('#live-colony').click()
    assert.equal(
        await page.locator('#prototype').getAttribute('data-mode'),
        'colony',
    )
    await page.locator('#live-orbit').click()
    assert.equal(
        await page.locator('#prototype').getAttribute('data-mode'),
        'orbit',
    )
    await page.locator('#live-system-map-mode').click()
    await page.locator('.system-map-node').first().waitFor()
    // Normal fleet navigation still owns the same single planner after it was used inline.
    await page.locator('.main-nav [data-live-page=fleets]').click()
    await page
        .locator('#live-page-fleets:not([hidden]) #fleet-form:not([inert])')
        .waitFor()
    assert.equal(await page.locator('#fleet-form').count(), 1)
    await page.locator('.main-nav [data-live-page=planet]').click()
    await page.locator('.system-map-node').first().waitFor()
    // Deliberate flight on the isolated fixture: one marker per mission, not per ship.
    await page.locator('#live-planet').selectOption(String(initial.id))
    await page.waitForFunction(
        (id) =>
            document.querySelector('#live-system-map').dataset.planet ===
            String(id),
        initial.id,
    )
    const [g, s, p] = other.coordinates.split(':').map(Number),
        csrf = await page
            .locator('meta[name="csrf-token"]')
            .getAttribute('content')
    const dispatched = await context.request.post('/play-3d/fleet/send', {
        data: {
            _token: csrf,
            planet: initial.id,
            galaxy: g,
            system: s,
            position: p,
            type: 1,
            mission: 3,
            speed: 10,
            holdingtime: 0,
            union: 0,
            metal: 0,
            crystal: 0,
            deuterium: 0,
            am202: 2,
        },
    })
    assert.equal(dispatched.status(), 200)
    assert.equal((await dispatched.json()).success, true)
    await page.locator('#system-map-refresh').click()
    await page.locator('.system-fleet-contact').first().waitFor()
    assert.ok(
        (await page.locator('#system-map-flight-lines line').count()) >= 1,
    )
    const contact = page.locator('.system-fleet-contact').first(),
        missionId = await contact.getAttribute('data-fleet-id')
    await contact.click()
    await page.locator('#system-map-dialog[open] .map-contact-clock').waitFor()
    assert.ok(
        (await page.locator('#system-map-details').innerText()).includes(
            '2 Schiffe',
        ),
    )
    await page.screenshot({
        path: `${artifacts}/actual-fleet-radar.png`,
        fullPage: true,
    })
    await page.keyboard.press('Escape')
    const recalled = await context.request.post('/play-3d/fleet/recall', {
        data: { _token: csrf, fleet_mission_id: missionId },
    })
    assert.equal((await recalled.json()).success, true)
    const source = await context.request.get(
            `/play-3d/system-map?planet=${initial.id}`,
        ),
        radar = await source.json(),
        returning = radar.fleets.find((fleet) => fleet.own && fleet.returning)
    if (returning) {
        assert.equal(returning.origin, other.coordinates)
        assert.equal(returning.destination, initial.coordinates)
    }
    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(
        await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        'Mobile must not scroll sideways',
    )
    await page.locator('.system-map-node').last().click()
    await page.locator('#system-map-dialog[open]').waitFor()
    assert.ok(await page.locator('#system-map-close').isVisible())
    await page.screenshot({
        path: `${artifacts}/system-map-mobile-actions.png`,
        fullPage: true,
    })
    await page.keyboard.press('Escape')
    // The one explicit dispatch above is the only intentional mission.
    assert.deepEqual(errors, [])
    console.log(
        'PASS: centred real system, dashed links, historical reconnaissance and stale warning, actual fleet radar and recall, keyboard actions, inline planner without accidental dispatch, stale responses, doubled text, 3D modes and mobile layout',
    )
    await context.close()
} finally {
    await browser.close()
}
