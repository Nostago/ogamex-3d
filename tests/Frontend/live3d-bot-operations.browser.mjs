import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
    account = JSON.parse(await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8')),
    target = JSON.parse(await readFile(process.env.TARGET_FILE, 'utf8')),
    artifacts = process.env.ARTIFACT_DIR || '/tmp/ogamex-bot-operations'
await mkdir(artifacts, { recursive: true })
const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
try {
    const context = await browser.newContext({
        baseURL: process.env.LIVE_BASE_URL || 'http://127.0.0.1',
        viewport: { width: 1540, height: 1000 },
        reducedMotion: 'reduce',
    })
    const login = await context.request.get('/login'),
        csrf = (await login.text()).match(
            /name="csrf-token" content="([^"]+)"/,
        )[1]
    assert.ok(
        [302, 303].includes(
            (
                await context.request.post('/login', {
                    form: {
                        email: account.email,
                        password: account.password,
                        _token: csrf,
                    },
                    maxRedirects: 0,
                })
            ).status(),
        ),
    )
    const page = await context.newPage(),
        errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(`/play-3d?cp=${account.planet}#planet`)
    await page.waitForSelector('#prototype[data-ready=true]')
    await page.waitForSelector('#system-map-connections line')
    const lines = await page
        .locator('#system-map-connections line')
        .evaluateAll((nodes) =>
            nodes.map((n) => [n.getAttribute('x1'), n.getAttribute('y1')]),
        )
    assert.equal(lines.length, 14)
    assert.ok(lines.every(([x, y]) => x === '50' && y === '50'))
    assert.match(
        await page
            .locator('.map-radar-sweep')
            .evaluate((n) => getComputedStyle(n, '::before').maskImage),
        /radial-gradient/,
    )
    await page.screenshot({ path: `${artifacts}/system-connections.png` })
    // The full native planner explains the original Legor protection instead of a generic refusal.
    await page.locator('[data-live-page=fleets]').first().click()
    await page.waitForSelector('[data-fleet-ship="210"]')
    await page.locator('[data-fleet-ship="210"]').fill('2')
    for (const [name, value] of Object.entries({
        galaxy: '1',
        system: '1',
        position: '2',
    }))
        await page.locator(`#fleet-form [name=${name}]`).fill(value)
    await page.locator('#fleet-form [name=mission]').selectOption('6')
    await page.waitForFunction(() =>
        /Administrator|administrat|geschützt/i.test(
            document.querySelector('#fleet-send-hint').textContent,
        ),
    )
    assert.ok(await page.locator('#fleet-send-top').isDisabled())
    for (const [name, value] of Object.entries({
        galaxy: target.galaxy,
        system: target.system,
        position: target.position,
    }))
        await page.locator(`#fleet-form [name=${name}]`).fill(String(value))
    await page.waitForFunction(
        () => !document.querySelector('#fleet-send-top').disabled,
    )
    await page.locator('#fleet-send-top').click()
    await page.waitForFunction(
        () => document.querySelector('#fleet-status').textContent.length > 0,
    )
    await page.locator('[data-fleet-tab=plan]').click()
    await page.locator('#fleet-refresh').click()
    await page.waitForFunction(() =>
        document
            .querySelector('[data-fleet-ship="210"]')
            .closest('label')
            .querySelector('.fleet-available')
            .textContent.includes('Auf Mission: 2'),
    )
    assert.match(
        await page.locator('#fleet-inventory').innerText(),
        /Gesamt.*Verfügbar.*Auf Mission/s,
    )
    await page.screenshot({ path: `${artifacts}/fleet-inventory.png` })
    await page.locator('[data-live-page=ships]').first().click()
    await page.waitForFunction(() =>
        [...document.querySelectorAll('#live-catalog button')].some(
            (n) =>
                n.textContent.includes('Spionagesonde') &&
                n.textContent.includes('Auf Mission: 2'),
        ),
    )
    // Real messages and legacy AJAX tabs, followed by a viewport-dependent fragment regression.
    await page.locator('[data-live-page=messages]').first().click()
    await page.waitForSelector('#live-original[data-ready=true]')
    const frame = page.frameLocator('#live-original')
    await frame.locator('#subtabs-nfFleet24 a').click()
    await frame.locator('.msg').first().waitFor()
    assert.equal(
        await frame
            .locator('.subtabs a')
            .first()
            .evaluate((n) => getComputedStyle(n).backgroundImage),
        'none',
    )
    const heights = []
    for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(350)
        heights.push(
            await page
                .locator('#live-original')
                .evaluate((n) => n.getBoundingClientRect().height),
        )
    }
    assert.ok(
        Math.max(...heights) - Math.min(...heights) < 3,
        `Inbox height grows: ${heights}`,
    )
    await page.locator('#live-original').evaluate((n) => {
        const probe = n.contentDocument.createElement('div')
        probe.id = 'viewport-regression'
        probe.style.minHeight = '100vh'
        probe.textContent = 'Regression'
        n.contentDocument.body.append(probe)
    })
    await page.waitForTimeout(800)
    const fixedHeight = await page
        .locator('#live-original')
        .evaluate((n) => n.getBoundingClientRect().height)
    await page.waitForTimeout(1200)
    assert.ok(
        Math.abs(
            (await page
                .locator('#live-original')
                .evaluate((n) => n.getBoundingClientRect().height)) -
                fixedHeight,
        ) < 3,
    )
    await page
        .locator('#live-original')
        .evaluate((n) =>
            n.contentDocument.querySelector('#viewport-regression').remove(),
        )
    await frame.locator('#tabs-nfCommunication a').click()
    await frame.locator('#subtabs-nfCommunication14 a').waitFor()
    await frame.locator('#tabs-nfFleets a').click()
    await frame.locator('#subtabs-nfFleet24 a').click()
    await frame.locator('.msg').first().waitFor()
    await page.screenshot({ path: `${artifacts}/messages.png` })
    // Admin requests fifty active dedicated accounts twice; no duplicated population.
    const token = await page
        .locator('meta[name=csrf-token]')
        .getAttribute('content')
    for (let i = 0; i < 2; i++) {
        const r = await context.request.post('/play-3d/bots', {
            data: { _token: token, action: 'populate' },
        })
        assert.equal(r.status(), 200)
        assert.equal((await r.json()).active, 50)
    }
    const bots = (await (await context.request.get('/play-3d/bots')).json())
        .bots
    assert.equal(bots.length, 50)
    assert.ok(
        bots.every(
            (b) =>
                b.enabled &&
                b.auto_raid &&
                b.auto_fleet_save &&
                !b.name.startsWith('BOT-'),
        ),
    )
    // Record identities for fixture-only cleanup, never credentials in output.
    await writeFile(
        `${artifacts}/npc-fixtures.json`,
        JSON.stringify(bots.map((b) => ({ id: b.id, user: b.user_id }))),
    )
    await page.goto(`/play-3d?cp=${account.planet}#admin`)
    await page.locator('[data-admin-tab=bots]').click()
    await page.waitForSelector('.bot-card')
    const first = page.locator('.bot-card').first(),
        rename = `Freier Pilot ${Date.now()}`
    await first.locator('summary').click()
    await first.locator('input[name=name]').fill(rename)
    await first.locator('button[type=submit]').click()
    await page.waitForFunction(
        (name) =>
            [...document.querySelectorAll('.bot-card h2')].some((n) =>
                n.textContent.includes(name),
            ),
        rename,
    )
    await page.screenshot({ path: `${artifacts}/bot-controls.png` })
    assert.deepEqual(errors, [])
    console.log(
        'PASS: 14 home-only connections, outward radar mask, protected-planet reason, real espionage dispatch, ship inventory, stable inbox with real tabs and viewport-dependent content, idempotent 50 NPCs and free naming',
    )
} finally {
    await browser.close()
}
