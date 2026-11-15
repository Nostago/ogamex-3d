import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, mkdir } from 'node:fs/promises'
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
    account = JSON.parse(await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8')),
    target = JSON.parse(await readFile(process.env.TARGET_FILE, 'utf8')),
    artifacts = process.env.ARTIFACT_DIR || '/tmp/ogamex-quick-fleet'
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
        dialogs = []
    page.setDefaultTimeout(30000)
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('dialog', (dialog) => {
        dialogs.push(dialog.type())
        dialog.dismiss()
    })
    page.on('request', (request) => {
        if (
            request.method() === 'POST' &&
            new URL(request.url()).pathname === '/play-3d/fleet/send'
        )
            writes.push(request.postDataJSON())
    })
    await page.goto(`/play-3d?cp=${account.planet}#planet`)
    await page.locator(`[data-map-position="${target.position}"]`).click()
    await page.locator('#system-map-details [data-mission="6"]').click()
    await page
        .locator('#quick-fleet-dialog[open] [data-quick-ship="210"]')
        .waitFor()
    assert.equal(
        await page.locator('#quick-fleet-fields input').count(),
        1,
        'Spying must ask only for probe quantity',
    )
    assert.equal(
        await page.locator('[data-quick-ship="210"]').inputValue(),
        '1',
    )
    assert.ok(
        await page
            .locator('[data-quick-ship="210"]')
            .evaluate(
                (input) => parseFloat(getComputedStyle(input).fontSize) >= 20,
            ),
    )
    await page.locator('[data-quick-ship="210"]').fill('3')
    await page.screenshot({
        path: `${artifacts}/one-field-espionage.png`,
        fullPage: true,
    })
    // While checking, a repeated submit must not send the same fleet twice.
    await page.route('**/play-3d/fleet/preview?*', async (route) => {
        const response = await route.fetch()
        await new Promise((resolve) => setTimeout(resolve, 600))
        await route.fulfill({ response })
    })
    const spy = page.waitForResponse(
        (response) =>
            new URL(response.url()).pathname === '/play-3d/fleet/send',
    )
    await page.locator('#quick-fleet-send').click()
    await page
        .locator('#quick-fleet-form')
        .evaluate((form) =>
            form.dispatchEvent(new Event('submit', { cancelable: true })),
        )
    assert.equal((await (await spy).json()).success, true)
    await page.unroute('**/play-3d/fleet/preview?*')
    await page.locator('#quick-fleet-close:enabled').waitFor()
    assert.equal(writes.length, 1)
    assert.equal(writes[0].am210, '3')
    assert.equal(String(writes[0].position), String(target.position))
    assert.equal(Number(writes[0].mission), 6)
    await page.locator('#quick-fleet-close').click()
    const marker = page
        .locator('.system-fleet-contact[data-relation="own"]')
        .first()
    await marker.waitFor()
    const point = await marker.evaluate((node) => [
        node.style.getPropertyValue('--x'),
        node.style.getPropertyValue('--y'),
    ])
    await page.waitForFunction((before) => {
        const node = document.querySelector(
            '.system-fleet-contact[data-relation="own"]',
        )
        return (
            node &&
            (node.style.getPropertyValue('--x') !== before[0] ||
                node.style.getPropertyValue('--y') !== before[1])
        )
    }, point)
    assert.ok((await page.locator('#system-map-flight-lines line').count()) > 0)
    assert.ok(
        await page
            .locator('#system-map-connections line')
            .first()
            .evaluate((node) => Number(getComputedStyle(node).opacity) >= 0.6),
    )
    await marker.hover()
    await page.locator('#fleet-radar-tooltip:not([hidden])').waitFor()
    assert.ok(
        (await page.locator('#fleet-radar-tooltip').innerText()).includes(
            'Zusammensetzung',
        ),
    )
    assert.ok(
        await page
            .locator('#fleet-radar-tooltip .radar-ship-row')
            .filter({ hasText: '3' })
            .count(),
    )
    await page.locator('#fleet-radar-tooltip').hover()
    assert.equal(await page.locator('#fleet-radar-tooltip').isVisible(), true)
    await page.screenshot({
        path: `${artifacts}/moving-fleet-composition.png`,
        fullPage: true,
    })
    await page.keyboard.press('Escape')
    assert.equal(await page.locator('#fleet-radar-tooltip').isVisible(), false)
    // The galaxy table uses exactly the same quick dispatch dialog.
    await page.locator('.main-nav [data-live-page=galaxy]').first().click()
    await page
        .locator(
            `.galaxy-row[data-position="${target.position}"] [data-mission="6"]`,
        )
        .click()
    await page
        .locator('#quick-fleet-dialog[open] [data-quick-ship="210"]')
        .waitFor()
    await page.locator('[data-quick-ship="210"]').fill('2')
    const second = page.waitForResponse(
        (response) =>
            new URL(response.url()).pathname === '/play-3d/fleet/send',
    )
    await page.locator('#quick-fleet-send').click()
    assert.equal((await (await second).json()).success, true)
    await page.locator('#quick-fleet-close:enabled').waitFor()
    assert.equal(writes.length, 2)
    assert.equal(writes[1].am210, '2')
    assert.equal(new URL(page.url()).hash, '#galaxy')
    await page.locator('#quick-fleet-close').click()
    // A stale galaxy action cannot create ships when the authoritative inventory is empty.
    await page.route('**/play-3d/fleet?*', async (route) => {
        const response = await route.fetch(),
            data = await response.json()
        data.ships = data.ships.map((ship) =>
            ship.id === 210 ? { ...ship, available: '0' } : ship,
        )
        await route.fulfill({ response, json: data })
    })
    await page
        .locator(
            `.galaxy-row[data-position="${target.position}"] [data-mission="6"]`,
        )
        .click()
    await page
        .locator('#quick-fleet-status')
        .filter({ hasText: 'keine passenden Schiffe' })
        .waitFor()
    assert.equal(await page.locator('#quick-fleet-send').isDisabled(), true)
    assert.equal(writes.length, 2)
    await page.locator('#quick-fleet-close').click()
    await page.unroute('**/play-3d/fleet?*')
    // The normal fleet view has a conspicuous launch button at the top and bottom.
    await page.locator('.main-nav [data-live-page=fleets]').click()
    await page
        .locator('#fleet-form:not([inert]) [data-fleet-ship="202"]')
        .waitFor()
    assert.equal(await page.locator('#fleet-send-top').isVisible(), true)
    assert.ok(
        (await page.locator('#fleet-send-top').innerText()).includes(
            'jetzt starten',
        ),
    )
    await page.locator('[data-fleet-ship="202"]').fill('2')
    await page.locator('[data-fleet-ship="204"]').fill('1')
    for (const key of ['galaxy', 'system', 'position'])
        await page
            .locator(`#fleet-form [name=${key}]`)
            .fill(String(target[key]))
    await page.locator('#fleet-form [name=mission]').selectOption('3')
    await page.locator('#fleet-send-top:enabled').waitFor()
    const transport = page.waitForResponse(
        (response) =>
            new URL(response.url()).pathname === '/play-3d/fleet/send',
    )
    await page.locator('#fleet-send-top').click()
    assert.equal((await (await transport).json()).success, true)
    assert.equal(writes.length, 3)
    assert.equal(writes[2].am202, '2')
    assert.equal(writes[2].am204, '1')
    await page.locator('.main-nav [data-live-page=planet]').click()
    await page
        .locator('.system-fleet-contact[data-relation="own"]')
        .first()
        .waitFor()
    // Uncertain network replies are not repeated and cannot silently produce a duplicate.
    await page.locator('.main-nav [data-live-page=galaxy]').first().click()
    await page
        .locator(
            `.galaxy-row[data-position="${target.position}"] [data-mission="6"]`,
        )
        .click()
    await page
        .locator('#quick-fleet-dialog[open] [data-quick-ship="210"]')
        .waitFor()
    await page.route('**/play-3d/fleet/send?*', async (route) => {
        await route.fetch()
        await route.abort()
    })
    await page.locator('#quick-fleet-send').click()
    await page
        .locator('#quick-fleet-status')
        .filter({ hasText: 'Bestätigung fehlt' })
        .waitFor()
    assert.equal(await page.locator('#quick-fleet-send').isDisabled(), true)
    assert.equal(writes.length, 4)
    await page.screenshot({
        path: `${artifacts}/uncertain-dispatch-no-retry.png`,
        fullPage: true,
    })
    await page.unroute('**/play-3d/fleet/send?*')
    await page.locator('#quick-fleet-close').click()
    await page.setViewportSize({ width: 390, height: 844 })
    await page
        .locator(
            `.galaxy-row[data-position="${target.position}"] [data-mission="6"]`,
        )
        .click()
    await page
        .locator('#quick-fleet-dialog[open] [data-quick-ship="210"]')
        .waitFor()
    assert.equal(
        await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
    )
    await page.screenshot({
        path: `${artifacts}/quick-spy-mobile.png`,
        fullPage: true,
    })
    assert.deepEqual(
        dialogs,
        [],
        'Launching should need only the explicit start click',
    )
    assert.deepEqual(errors, [])
    console.log(
        'PASS: one-field probe dispatch from map and galaxy, no duplicate submit, no unavailable ships, direct native launch, moving radar and hover composition, uncertain-write protection and mobile dialog',
    )
    await context.close()
} finally {
    await browser.close()
}
