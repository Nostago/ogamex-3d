import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
    account = JSON.parse(await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8')),
    fixture = JSON.parse(
        await readFile('storage/app/battle-ui-fixture.json', 'utf8'),
    ),
    artifacts = process.env.ARTIFACT_DIR || '/tmp/battle-replay'
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
        reducedMotion: 'no-preference',
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
        models = [],
        writes = []
    page.setDefaultTimeout(60000)
    page.on('pageerror', (e) => {
        errors.push(e.message)
        console.error(e.stack)
    })
    page.on('request', (r) => {
        const path = new URL(r.url()).pathname
        if (path.endsWith('.glb')) models.push(path)
        if (r.method() === 'POST') writes.push(path)
    })
    await page.goto(`/play-3d?cp=${account.planet}#messages`)
    await page.waitForFunction(
        () => document.querySelector('#live-original').dataset.ready === 'true',
    )
    const frame = page.frameLocator('#live-original')
    // Navigate the original combat tab inside the actual new shell.
    await frame.locator('a[href*="subtab=combat_reports"]').first().click()
    const link = frame
        .locator(`a[href*="/ajax/messages/${fixture.message}"]`)
        .first()
    await link.waitFor()
    await link.click()
    const dialog = page.locator('#live-message-dialog'),
        button = dialog.locator('[data-battle-replay-url]')
    await button.waitFor()
    assert.equal(
        models.length,
        0,
        'opening a text report must not download ship models',
    )
    await button.click()
    const panel = dialog.locator('.battle-replay-panel'),
        stage = panel.locator('.battle-replay-stage')
    await page.waitForFunction(
        () =>
            document.querySelector('.battle-replay-stage')?.dataset
                .replayVisible === '2',
    )
    assert.equal(await panel.getAttribute('data-replay-frame'), '0')
    await stage.screenshot({ path: `${artifacts}/battlefield.png` })
    assert.equal(
        await panel
            .locator('[data-replay-side=attacker] [data-unit=light_fighter] td')
            .first()
            .textContent(),
        '13',
    )
    await panel.locator('[data-replay-next]').click()
    assert.equal(await panel.getAttribute('data-replay-frame'), '1')
    assert.equal(
        await panel
            .locator('[data-replay-side=attacker] [data-unit=light_fighter] td')
            .first()
            .textContent(),
        '10',
    )
    assert.equal(
        await panel
            .locator('[data-replay-side=attacker] [data-unit=light_fighter] td')
            .last()
            .textContent(),
        '3',
    )
    await panel.locator('[data-replay-next]').click()
    assert.equal(await stage.getAttribute('data-replay-visible'), '1')
    assert.equal(
        await panel
            .locator(
                '[data-replay-side=defender] [data-unit=rocket_launcher] td',
            )
            .first()
            .textContent(),
        '0',
    )
    assert.match(
        await panel.locator('.replay-result').textContent(),
        /Sieg der Angreifer/,
    )
    await panel.screenshot({ path: `${artifacts}/replay-desktop.png` })
    await panel.getByRole('button', { name: 'Zum Anfang', exact: true }).click()
    await panel.locator('.replay-controls select').selectOption('0.5')
    await panel.locator('[data-replay-play]').click()
    await page.waitForFunction(
        () =>
            document.querySelector('.battle-replay-stage').dataset
                .replayShotSides === '2',
    )
    assert.equal(await stage.getAttribute('data-replay-shield-sides'), '2')
    await stage.screenshot({ path: `${artifacts}/battle-effects.png` })
    // Software-rendered screenshots may outlast the animation. Avoid restarting
    // an already completed replay when checking the paused state.
    await panel.evaluate((node) => {
        if (node.dataset.replayPlaying === 'true')
            node.querySelector('[data-replay-play]').click()
    })
    assert.equal(await panel.getAttribute('data-replay-playing'), 'false')
    await panel.getByRole('button', { name: 'Zum Anfang', exact: true }).click()
    await panel.locator('.replay-controls select').selectOption('4')
    await panel.locator('[data-replay-play]').click()
    await page.waitForFunction(
        () =>
            document.querySelector('.battle-replay-panel').dataset
                .replayPlaying === 'false' &&
            document.querySelector('.battle-replay-panel').dataset
                .replayFrame === '2',
    )
    assert.equal(await panel.getAttribute('data-replay-frame'), '2')
    await panel.getByRole('button', { name: 'Zum Anfang', exact: true }).click()
    await panel.locator('.replay-slider').focus()
    await page.keyboard.press('ArrowRight')
    assert.equal(await panel.getAttribute('data-replay-frame'), '1')
    await page.setViewportSize({ width: 390, height: 844 })
    await panel.screenshot({ path: `${artifacts}/replay-mobile.png` })
    assert.ok(
        await page.evaluate(
            () =>
                document
                    .querySelector('.battle-replay-panel')
                    .getBoundingClientRect().width <= innerWidth,
        ),
    )
    await stage
        .locator('canvas')
        .evaluate((canvas) =>
            canvas.dispatchEvent(
                new Event('webglcontextlost', { cancelable: true }),
            ),
        )
    assert.equal(await stage.locator('canvas').count(), 0)
    await panel.locator('[data-replay-next]').click()
    assert.equal(await panel.getAttribute('data-replay-frame'), '2')
    await panel
        .getByRole('button', { name: 'Replay schließen', exact: true })
        .click()
    assert.equal(await dialog.locator('.battle-replay-panel').count(), 0)
    await button.click()
    await dialog.locator('.battle-replay-panel').waitFor()
    await page.keyboard.press('Escape')
    assert.equal(await dialog.evaluate((node) => node.open), false)
    // Real ship dispatch to the isolated construction queue; the canvas must remain attached.
    await page.setViewportSize({ width: 1540, height: 1000 })
    await page.locator('.main-nav [data-live-page=ships]').click()
    await page.locator('[data-object=light_fighter]').click()
    const preview = page.locator('#live-detail .object-artwork')
    await page.waitForFunction(
        () =>
            document.querySelector('#live-detail .object-artwork')?.dataset
                .artwork === '3d',
    )
    const canvas = await preview.locator('canvas').elementHandle()
    await page.locator('#live-quantity').fill('2')
    await page.locator('#live-start').click()
    await page.waitForFunction(
        () =>
            document.querySelector('#live-detail .object-artwork')?.dataset
                .building === 'true',
    )
    assert.ok(
        await canvas.evaluate((node) => node.isConnected),
        'starting construction must reuse the visible model',
    )
    await page.waitForFunction(
        () =>
            Number(
                document.querySelector('#live-detail .object-artwork').dataset
                    .progress,
            ) >= 0,
    )
    await page.locator('#live-start').click()
    await page.locator('[data-unit-queue-active="false"]').waitFor()
    assert.equal(
        await page.locator('[data-unit-queue-active="true"]').count(),
        1,
    )
    assert.equal(
        await page
            .locator('[data-unit-queue-active="false"]')
            .first()
            .textContent(),
        'Wartet',
    )
    assert.equal(
        await page.locator('[data-queue="unit"] [data-active="false"]').count(),
        1,
    )
    await preview.screenshot({ path: `${artifacts}/ship-construction.png` })
    await page
        .locator('#live-queues')
        .screenshot({ path: `${artifacts}/ship-queue-status.png` })
    await page.locator('#live-refresh').click()
    await page.waitForFunction(
        () =>
            document.querySelector('#live-detail .object-artwork')?.dataset
                .building === 'true',
    )
    assert.ok(await canvas.evaluate((node) => node.isConnected))
    assert.deepEqual(errors, [])
    assert.ok(
        writes.every(
            (path) =>
                path === '/play-3d/command' || path.endsWith('/checkevents'),
        ),
    )
    console.log(
        'PASS: authenticated combat-report layer, lazy real models and procedural defenses, exact round/loot/loss data, controls, end, mobile, WebGL fallback, disposal, actual ship construction and model-preserving refresh',
    )
} finally {
    await browser.close()
}
