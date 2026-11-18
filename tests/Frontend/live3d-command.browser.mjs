import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const account = JSON.parse(
        await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8'),
    ),
    artifacts = process.env.ARTIFACT_DIR || '/tmp/live3d-command'
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
        baseURL: process.env.LIVE_BASE_URL,
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
        downloads = [],
        writes = []
    page.setDefaultTimeout(90000)
    page.on('pageerror', (e) => {
        errors.push(e.message)
        console.error(e.stack)
    })
    page.on('request', (req) => {
        if (new URL(req.url()).pathname.endsWith('.glb'))
            downloads.push(req.url())
        if (['POST', 'DELETE'].includes(req.method()))
            writes.push(new URL(req.url()).pathname)
    })
    page.on('dialog', (dialog) => dialog.accept())
    await page.goto(`/play-3d?cp=${account.planet}#empire`)
    await page.locator('[data-empire-world]').first().waitFor()
    assert.ok((await page.locator('[data-empire-world]').count()) >= 2)
    assert.ok((await page.locator('[data-shortage=true]').count()) > 0)
    assert.ok((await page.locator('.empire-order').count()) > 0)
    await page.locator('.empire-order').first().focus()
    const focused = await page
        .locator('.empire-order')
        .first()
        .evaluateHandle((node) => node)
    await page.evaluate(
        () =>
            new Promise((resolve) => {
                const observer = new MutationObserver(() => {
                    observer.disconnect()
                    resolve()
                })
                observer.observe(document.querySelector('.empire-resources'), {
                    childList: true,
                })
            }),
    )
    await page.waitForFunction(
        (node) => document.activeElement === node,
        focused,
    )
    const worlds = await page
        .locator('[data-empire-world]')
        .evaluateAll((nodes) => nodes.map((n) => n.dataset.empireWorld))
    await page.screenshot({
        path: `${artifacts}/empire-desktop.png`,
        fullPage: true,
    })
    await page
        .locator(`[data-empire-world="${worlds[1]}"] .live-groups button`)
        .first()
        .click()
    await page.waitForFunction(
        (id) => document.querySelector('#live-planet').value === id,
        worlds[1],
    )
    assert.equal(
        await page.locator('#prototype').getAttribute('data-page'),
        'planet',
    )
    await page.locator('.main-nav [data-live-page=empire]').click()
    await page
        .locator(`[data-empire-world="${account.planet}"] .live-groups button`)
        .first()
        .click()
    await page.locator('#map-recent-events .map-event-entry').first().waitFor()
    assert.match(
        await page.locator('#map-recent-events').textContent(),
        /Gebäude fertig/,
    )
    await page.locator('#map-event-animations').uncheck()
    assert.equal(
        await page
            .locator('#live-system-map')
            .getAttribute('data-event-animations'),
        'false',
    )
    await page.locator('#live-player-menu summary').click()
    assert.equal(
        await page
            .locator('#live-player-menu form[method=POST] button')
            .textContent(),
        'Abmelden',
    )
    await page.keyboard.press('Escape')
    assert.equal(
        await page.locator('#live-player-menu').getAttribute('open'),
        null,
    )
    assert.equal(
        await page.locator('.header-actions [href*="logout"]').count(),
        0,
    )
    await page.locator('.main-nav [data-live-page=fleets]').click()
    await page.waitForFunction(
        () =>
            document.querySelector('#live-page-fleets').dataset.fleetReady ===
            'true',
    )
    assert.equal(
        downloads.length,
        0,
        'empire and planning must not download 3D models',
    )
    const ids = ['202', '203', '204', '205', '206', '207', '208']
    for (const id of ids)
        await page.locator(`[data-fleet-ship="${id}"]`).fill('3')
    await page.locator('#fleet-formation-toggle').click()
    await page.waitForFunction(
        () =>
            document.querySelector('#fleet-formation-view').dataset
                .formationModels === '6',
    )
    assert.equal(
        await page
            .locator('#fleet-formation-legend .formation-legend-item')
            .count(),
        6,
    )
    const rotation = await page
        .locator('#fleet-formation-view')
        .getAttribute('data-formation-rotation')
    await page.locator('#fleet-formation-view canvas').focus()
    await page.keyboard.press('ArrowLeft')
    assert.notEqual(
        await page
            .locator('#fleet-formation-view')
            .getAttribute('data-formation-rotation'),
        rotation,
    )
    await page
        .locator('#fleet-formation')
        .screenshot({ path: `${artifacts}/formation-desktop.png` })
    await page.locator('#fleet-formation-next').click()
    await page.waitForFunction(
        () =>
            document.querySelector('#fleet-formation-view').dataset
                .formationModels === '1',
    )
    assert.equal(
        await page
            .locator('#fleet-formation-legend .formation-legend-item')
            .count(),
        1,
    )
    await page.locator('#fleet-formation-toggle').click()
    assert.equal(await page.locator('#fleet-formation-view canvas').count(), 0)
    await page.locator('[name=mission]').selectOption('15')
    await page.locator('[name=speed]').selectOption('8')
    await page.locator('[name=holdingtime]').fill('1')
    const name = `Browser expedition ${Date.now()}`
    await page.locator('#fleet-template-name').fill(name)
    await page.locator('#fleet-template-save').click()
    const template = page.locator('.fleet-template').filter({ hasText: name })
    await template.waitFor()
    await page.locator('#fleet-clear').click()
    await page.locator('[name=mission]').selectOption('3')
    await page.locator('[name=speed]').selectOption('10')
    await template.getByRole('button', { name: 'Laden', exact: true }).click()
    assert.equal(await page.locator('[name=mission]').inputValue(), '15')
    assert.equal(await page.locator('[name=speed]').inputValue(), '8')
    assert.equal(
        await page.locator('[data-fleet-ship="204"]').inputValue(),
        '3',
    )
    await page.locator('#fleet-template-save').click()
    await page.waitForFunction(
        () => document.querySelector('#fleet-template-name').value === '',
    )
    assert.equal(
        await template.count(),
        1,
        'updating must not create a duplicate',
    )
    await page.reload()
    await page.locator('.fleet-template').filter({ hasText: name }).waitFor()
    await template.getByRole('button', { name: 'Laden', exact: true }).click()
    assert.equal(await page.locator('[name=mission]').inputValue(), '15')
    await template.getByRole('button', { name: 'Löschen', exact: true }).click()
    await template.waitFor({ state: 'detached' })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('.main-nav [data-live-page=empire]').click()
    await page.locator('[data-empire-world]').first().waitFor()
    assert.ok(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        'mobile empire must fit horizontally',
    )
    await page.screenshot({
        path: `${artifacts}/empire-mobile.png`,
        fullPage: true,
    })
    await page.locator('.main-nav [data-live-page=fleets]').click()
    await page.waitForFunction(
        () =>
            document.querySelector('#live-page-fleets').dataset.fleetReady ===
            'true',
    )
    await page.locator('#fleet-clear').click()
    await page.locator('[data-fleet-ship="204"]').fill('2')
    await page.locator('#fleet-formation-toggle').click()
    await page.waitForFunction(
        () =>
            document.querySelector('#fleet-formation-view').dataset
                .formationModels === '1',
    )
    await page
        .locator('#fleet-formation')
        .screenshot({ path: `${artifacts}/formation-mobile.png` })
    await page
        .locator('#fleet-formation-view canvas')
        .evaluate((n) =>
            n.dispatchEvent(
                new Event('webglcontextlost', { cancelable: true }),
            ),
        )
    assert.equal(await page.locator('#fleet-formation-view canvas').count(), 0)
    assert.match(
        await page.locator('#fleet-formation-status').textContent(),
        /Vorschaubild/,
    )
    await page.locator('.main-nav [data-live-page=planet]').click()
    assert.equal(await page.locator('#map-event-animations').isChecked(), false)
    assert.deepEqual(errors, [])
    assert.ok(
        writes.every(
            (path) =>
                path.includes('/templates') ||
                path.endsWith('/checkevents') ||
                path === '/play-3d/fleet/preview',
        ),
        `no fleet dispatch or building commands: ${writes.join(', ')}`,
    )
    console.log(
        'PASS: empire navigation and mobile, protected player menu, persisted mission templates, bounded 3D formation with pagination/rotation/fallback, map events and animation preference; no gameplay commands',
    )
} finally {
    await browser.close()
}
