import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, mkdir } from 'node:fs/promises'
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
    account = JSON.parse(await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8')),
    artifacts = process.env.ARTIFACT_DIR || '/tmp/message-selection'
assert.ok(
    account.email.startsWith('codex_live_'),
    'Use an isolated fixture account with twelve espionage reports',
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
        baseURL: process.env.LIVE_BASE_URL || 'http://127.0.0.1',
        viewport: { width: 1440, height: 1050 },
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
        timings = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('response', async (response) => {
        if (new URL(response.url()).pathname === '/ajax/messages') {
            await response.finished()
            timings.push(Math.round(response.request().timing().responseEnd))
        }
    })
    page.setDefaultTimeout(30000)
    await page.goto(`/play-3d?cp=${account.planet}#messages`)
    const frame = page.frameLocator('#live-original'),
        rows = frame.locator('li.msg[data-msg-id]:visible'),
        checks = rows.locator('[data-live-message-select]'),
        all = frame.getByRole('checkbox', {
            name: 'Alle markieren',
            exact: true,
        }),
        remove = frame.getByRole('button', {
            name: 'Markierte löschen',
            exact: true,
        })
    await checks.first().waitFor()
    assert.equal(await checks.count(), 10)
    assert.equal(await remove.isDisabled(), true)
    await checks.first().check()
    assert.equal(await all.evaluate((n) => n.indeterminate), true)
    await all.check()
    assert.equal(
        await frame
            .locator('li.msg:visible [data-live-message-select]:checked')
            .count(),
        10,
    )
    await all.uncheck()
    assert.equal(await remove.isDisabled(), true)
    await frame
        .locator('.pagination:visible .paginator[data-page="2"]')
        .first()
        .click()
    await page.waitForFunction(
        () =>
            document
                .querySelector('#live-original')
                .contentDocument.querySelectorAll(
                    'li.msg [data-live-message-select]',
                ).length === 2,
    )
    await all.check()
    assert.equal(
        await frame
            .locator('li.msg:visible [data-live-message-select]:checked')
            .count(),
        2,
    )
    await frame
        .locator('.pagination:visible .paginator[data-page="1"]')
        .first()
        .click()
    await checks.nth(9).waitFor()
    assert.equal(
        await frame
            .locator('li.msg:visible [data-live-message-select]:checked')
            .count(),
        0,
    )
    await checks.nth(0).check()
    await checks.nth(1).check()
    const selectedIds = await rows
        .filter({ has: frame.locator('[data-live-message-select]:checked') })
        .evaluateAll((nodes) => nodes.map((n) => Number(n.dataset.msgId)))
    page.once('dialog', (d) => d.dismiss())
    await remove.click()
    assert.equal(await checks.count(), 10)
    assert.equal(
        await frame
            .locator('li.msg:visible [data-live-message-select]:checked')
            .count(),
        2,
    )
    await frame.locator('body').evaluate(() => {
        window.__selectionDocument = true
    })
    await page.screenshot({ path: `${artifacts}/selected-messages.png` })
    page.once('dialog', (d) => d.accept())
    const deletion = page.waitForResponse(
        (r) =>
            new URL(r.url()).pathname === '/messages' &&
            r.request().method() === 'POST',
    )
    await remove.click()
    const response = await deletion
    assert.equal(response.status(), 200)
    assert.deepEqual(response.request().postDataJSON().messageIds, selectedIds)
    assert.equal(response.request().postDataJSON().action, 'delete-selected')
    assert.equal((await response.json()).deleted, 2)
    for (const id of selectedIds)
        await frame
            .locator(`[data-msg-id="${id}"]`)
            .waitFor({ state: 'detached' })
    await checks.nth(9).waitFor()
    assert.equal(
        await frame.locator('body').evaluate(() => window.__selectionDocument),
        true,
        'Deletion must reload only the list, not the whole iframe',
    )
    assert.equal(
        await frame
            .locator('li.msg:visible [data-live-message-select]:checked')
            .count(),
        0,
    )
    // A cached/hidden tab must never contribute messages to select-all.
    await checks.first().check()
    await frame.locator('#tabs-nfUniverse a').click()
    await frame.locator('#tabs-nfUniverse[aria-selected=true]').waitFor()
    await frame.locator('#tabs-nfFleets a').click()
    await checks.first().waitFor()
    assert.equal(await all.isChecked(), false)
    await all.check()
    assert.equal(
        await frame
            .locator('li.msg:visible [data-live-message-select]:checked')
            .count(),
        10,
    )
    await page.setViewportSize({ width: 390, height: 844 })
    await frame.locator('.live-message-toolbar').scrollIntoViewIfNeeded()
    assert.ok(
        await frame
            .locator('body')
            .evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
    )
    await page.screenshot({ path: `${artifacts}/selection-mobile.png` })
    page.once('dialog', (d) => d.accept())
    const rest = page.waitForResponse(
        (r) =>
            new URL(r.url()).pathname === '/messages' &&
            r.request().method() === 'POST',
    )
    await remove.click()
    assert.equal((await (await rest).json()).deleted, 10)
    await frame.locator('li.no_msg:visible').waitFor()
    assert.equal(await remove.isDisabled(), true)
    assert.equal(await all.isDisabled(), true)
    assert.deepEqual(errors, [])
    console.log(
        JSON.stringify({
            result: 'PASS',
            checks: 'individual/all selection, indeterminate state, cancellation, page/tab isolation, selected deletion, fragment-only refresh, mobile and empty state',
            tabResponseMs: timings,
        }),
    )
} finally {
    await browser.close()
}
