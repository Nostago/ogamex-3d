import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, mkdir } from 'node:fs/promises'
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const account = JSON.parse(
    await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8'),
)
const artifacts = process.env.ARTIFACT_DIR || '/tmp/ogamex-operations'
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
        html = await login.text(),
        token = html.match(/name="csrf-token" content="([^"]+)"/)[1]
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
        errors = []
    page.setDefaultTimeout(30000)
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('dialog', (d) => d.accept())
    page.on('response', async (response) => {
        if (response.url().includes('/play-3d/') && response.status() >= 400)
            console.log(
                'HTTP failure',
                new URL(response.url()).pathname,
                response.status(),
                (await response.text()).slice(0, 500),
            )
    })
    await page.goto('/play-3d#fleets')
    await page.waitForSelector('#prototype[data-ready=true]')
    await page.waitForSelector('[data-fleet-ship="202"]')
    assert.equal(await page.locator('#live-page-original').isHidden(), true)
    assert.equal(await page.locator('[data-fleet-ship]').count(), 15)
    const config = await page
        .locator('#live-bootstrap')
        .evaluate((n) => JSON.parse(n.textContent))
    const other = config.initial.planets.find(
        (p) => p.id !== config.initial.planet.id && p.type === 1,
    )
    assert.ok(other, 'Fixture requires another owned planet')
    await page.locator('[data-fleet-ship="202"]').fill('3')
    await page.locator('#fleet-own-world').selectOption(String(other.id))
    await page.waitForFunction(
        () => !document.querySelector('#fleet-send').disabled,
    )
    assert.match(
        await page.locator('#fleet-preview').innerText(),
        /Tage: \d+ Stunden: \d+ Minuten: \d+ Sekunden: \d+/,
    )
    await page.screenshot({
        path: `${artifacts}/fleet-planner.png`,
        fullPage: true,
    })
    const dispatch = page.waitForResponse((r) =>
        r.url().includes('/fleet/send'),
    )
    await page.locator('#fleet-send').click()
    assert.equal((await (await dispatch).json()).success, true)
    await page.waitForSelector('[data-fleet-recall]')
    await page.screenshot({
        path: `${artifacts}/fleet-movement.png`,
        fullPage: true,
    })
    const recall = page.waitForResponse((r) =>
        r.url().includes('/fleet/recall'),
    )
    await page.locator('[data-fleet-recall]').first().click()
    assert.equal((await (await recall).json()).success, true)
    await page.locator('[data-live-page=galaxy]').first().click()
    await page.waitForSelector('.galaxy-row[data-position="1"]')
    const free = page
        .locator('.galaxy-row')
        .filter({ has: page.locator('.galaxy-planet .muted') })
        .first()
    await free.locator('button').filter({ hasText: 'Weitere Aktionen' }).click()
    const detail = page.locator('.galaxy-detail:not([hidden])').first()
    assert.match(await detail.innerText(), /Aktionen für diese Position/)
    assert.equal(new URL(page.url()).hash, '#galaxy')
    assert.equal(await page.locator('#live-page-original').isHidden(), true)
    const colonize = detail.getByRole('button', {
        name: 'Neue Kolonie gründen',
        exact: true,
    })
    if (await colonize.isEnabled()) {
        await colonize.click()
        await page
            .locator('#quick-fleet-dialog[open] [data-quick-ship="208"]')
            .waitFor()
        await page.locator('#quick-fleet-advanced').click()
        await page.waitForSelector('#fleet-form:visible')
        assert.equal(
            await page.locator('#fleet-form [name=mission]').inputValue(),
            '7',
        )
        assert.equal(await page.locator('#live-page-original').isHidden(), true)
    }
    await page.locator('[data-live-page=research]').click()
    await page.locator('[data-object=graviton_technology]').click()
    await page.waitForSelector('#live-detail .requirements-panel')
    assert.ok(await page.locator('#live-detail .requirement-missing').count())
    assert.match(
        await page
            .locator('#live-detail .requirement-missing')
            .first()
            .innerText(),
        /✕.*Fehlt/s,
    )
    await page.locator('[data-live-page=admin]').click()
    await page.locator('[data-admin-tab=bots]').click()
    await page.waitForSelector('#bots-list p,#bots-list .bot-card')
    const name = `BOT-Test${Date.now()}`
    await page.locator('#bots-create [name=name]').fill(name)
    await page.locator('#bots-create [name=enabled]').check()
    await page.locator('#bots-create [name=seed_resources]').fill('10000')
    const creation = page.waitForResponse(
        (r) =>
            r.url().endsWith('/play-3d/bots') &&
            r.request().method() === 'POST',
    )
    await page.locator('#bots-create button[type=submit]').click()
    const created = await (await creation).json()
    assert.equal(created.success, true)
    const card = page.locator(`[data-bot-id="${created.id}"]`)
    await card.waitFor()
    await card.locator('summary').click()
    await card
        .getByRole('button', {
            name: 'Eine Entscheidung ausführen',
            exact: true,
        })
        .click()
    await page.waitForFunction(
        (id) =>
            document
                .querySelector(`[data-bot-id="${id}"]`)
                ?.textContent.includes('Gebäudeausbau beauftragt'),
        created.id,
    )
    await page.screenshot({
        path: `${artifacts}/bots-admin.png`,
        fullPage: true,
    })
    await card.locator('[name=enabled]').uncheck()
    await card
        .getByRole('button', { name: 'Einstellungen speichern', exact: true })
        .click()
    await page.waitForFunction(
        (id) =>
            document
                .querySelector(`[data-bot-id="${id}"] h2`)
                ?.textContent.includes('Pausiert'),
        created.id,
    )
    // Complete catalog and own-world queues are verified using the real command endpoint.
    const csrf = await page
        .locator('meta[name="csrf-token"]')
        .getAttribute('content')
    const post = async (body) => {
        const r = await context.request.post('/play-3d/command', {
            data: { _token: csrf, planet: account.planet, ...body },
        })
        const value = await r.json()
        assert.equal(r.ok(), true, JSON.stringify(value))
        assert.ok(
            value.success === true || value.status === 'success',
            JSON.stringify(value),
        )
    }
    await post({ action: 'build', technologyId: 4 })
    await post({ action: 'build', technologyId: 1 })
    await post({ action: 'research', technologyId: 113 })
    await post({ action: 'ship', technologyId: 204, amount: 2 })
    await page.locator('[data-live-page=planet]').click()
    await page.locator('#live-refresh').click()
    await page.waitForFunction(
        () =>
            new Set(
                [
                    ...document.querySelectorAll(
                        '#live-dock [data-order-kind]',
                    ),
                ].map((n) => n.dataset.orderKind),
            ).size === 3,
    )
    assert.ok(
        await page.locator('#live-dock [data-order-active=false]').count(),
    )
    assert.match(
        await page.locator('#live-dock').innerText(),
        /Tage: \d+ Stunden: \d+ Minuten: \d+ Sekunden: \d+/,
    )
    assert.ok(
        await page
            .locator('#live-dock [data-remaining]')
            .first()
            .evaluate((n) => n.getBoundingClientRect().width > 200),
        'Long durations need the full card width',
    )
    await page.screenshot({
        path: `${artifacts}/all-orders.png`,
        fullPage: true,
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('[data-live-page=fleets]').click()
    await page.waitForSelector('#fleet-ships:visible')
    assert.equal(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 2,
        ),
        true,
    )
    assert.deepEqual(errors, [])
    console.log(
        JSON.stringify({
            nativeFleetDispatch: true,
            nativeRecall: true,
            galaxyInlineActions: true,
            colonizationPlanner: true,
            allQueues: true,
            explicitDurations: true,
            requirementsStatus: true,
            npcCreateTickPause: true,
            mobile: true,
            browserErrors: errors,
            fixtureBotId: created.id,
        }),
    )
} finally {
    await browser.close()
}
