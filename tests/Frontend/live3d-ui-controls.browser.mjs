import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, mkdir } from 'node:fs/promises'
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
    account = JSON.parse(await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8')),
    artifacts = process.env.ARTIFACT_DIR || '/tmp/ogamex-ui-controls'
await mkdir(artifacts, { recursive: true })
const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
try {
    const context = await browser.newContext({
        baseURL: process.env.LIVE_BASE_URL || 'http://127.0.0.1',
        viewport: { width: 1500, height: 950 },
        reducedMotion: 'reduce',
    })
    // Migrate a previously saved text preference without enlarging the headings.
    await context.addInitScript(() => {
        if (!localStorage.getItem('ogamex-ui-readability-v2'))
            localStorage.setItem('ogamex-ui-text-scale-v1', '1.15')
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
        errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.setDefaultTimeout(30000)
    await page.goto(`/play-3d?cp=${account.planet}#options`)
    await page.waitForSelector('#live-original[data-ready=true]')
    assert.equal(await page.locator('#live-ui-text-scale').inputValue(), '115')
    assert.equal(
        await page.locator('#live-ui-heading-scale').inputValue(),
        '100',
    )
    const px = (selector) =>
        page
            .locator(selector)
            .first()
            .evaluate((n) => parseFloat(getComputedStyle(n).fontSize))
    const heading = await px('#live-ui-settings-title')
    assert.ok(Math.abs(heading - 26 * 0.8) < 0.1)
    await page.locator('#live-ui-text-scale').fill('116')
    assert.ok(Math.abs((await px('#live-ui-settings-title')) - heading) < 0.05)
    assert.ok(Math.abs((await px('#live-ui-settings p')) - 18 * 1.16) < 0.1)
    await page.locator('#live-ui-heading-scale').fill('107')
    assert.ok(
        Math.abs((await px('#live-ui-settings-title')) - 26 * 0.8 * 1.07) < 0.1,
    )
    assert.ok(Math.abs((await px('#live-ui-settings p')) - 18 * 1.16) < 0.1)
    await page.locator('#live-ui-heading-scale').press('ArrowUp')
    assert.equal(
        await page.locator('#live-ui-heading-scale').inputValue(),
        '108',
    )
    await page.reload()
    await page.waitForSelector('#live-original[data-ready=true]')
    assert.equal(await page.locator('#live-ui-text-scale').inputValue(), '116')
    assert.equal(
        await page.locator('#live-ui-heading-scale').inputValue(),
        '108',
    )
    const embedded = page.frameLocator('#live-original')
    assert.ok(
        Math.abs(
            Number(
                await embedded
                    .locator('html')
                    .evaluate((n) =>
                        n.style.getPropertyValue('--ui-heading-scale'),
                    ),
            ) - 0.864,
        ) < 0.001,
    )
    await page.screenshot({
        path: `${artifacts}/independent-font-controls.png`,
    })
    await page.locator('#live-ui-text-reset').click()
    assert.equal(await page.locator('#live-ui-text-scale').inputValue(), '100')
    assert.equal(
        await page.locator('#live-ui-heading-scale').inputValue(),
        '100',
    )
    await page.locator('[data-live-page=planet]').first().click()
    await page.locator('#live-rename-open').click()
    await page.locator('#live-rename-name').fill('-Invalid')
    await page.locator('#live-rename-form button[type=submit]').click()
    await page.waitForFunction(
        () =>
            document.querySelector('#live-rename-status').textContent.length >
            0,
    )
    assert.ok(await page.locator('#live-rename-dialog').isVisible())
    const newName = 'Nova ' + Date.now().toString().slice(-9),
        writes = []
    page.on('request', (r) => {
        if (r.method() === 'POST' && r.url().includes('/play-3d/command')) {
            const data = r.postDataJSON()
            if (data.action === 'rename-planet') writes.push(data)
        }
    })
    await page.locator('#live-rename-name').fill(newName)
    await page.locator('#live-rename-form').evaluate((form) => {
        form.requestSubmit()
        form.requestSubmit()
    })
    await page.waitForFunction(
        (name) =>
            document.querySelector('#live-world-name').textContent === name,
        newName,
    )
    assert.equal(writes.length, 1)
    assert.equal(String(writes[0].planet), String(account.planet))
    assert.ok(
        await page
            .locator('#live-planet')
            .evaluate(
                (n, name) => n.selectedOptions[0].textContent.includes(name),
                newName,
            ),
    )
    await page.reload()
    await page.waitForSelector('#prototype[data-ready=true]')
    assert.equal(await page.locator('#live-world-name').textContent(), newName)
    await page.screenshot({ path: `${artifacts}/renamed-planet.png` })
    for (const area of ['messages', 'highscore', 'shop', 'options']) {
        await page.locator(`[data-live-page=${area}]`).first().click()
        await page.waitForSelector('#live-original[data-ready=true]')
        if (area === 'messages') {
            await embedded.locator('#subtabs-nfFleet24 a').click()
            await embedded.locator('.msg').first().waitFor()
        }
        // Ensure even an almost-empty local highscore has enough content to scroll.
        await page.locator('#live-original').evaluate((frame) => {
            const doc = frame.contentDocument,
                probe = doc.createElement('div')
            probe.id = 'scroll-regression-fixture'
            probe.style.height = '2200px'
            probe.textContent = ''
            doc.body.append(probe)
        })
        await page.waitForTimeout(700)
        await page.evaluate(() =>
            window.scrollTo({ top: 900, behavior: 'instant' }),
        )
        const before = await page.evaluate(() => window.scrollY)
        assert.ok(before > 600, `${area} requires a genuinely scrollable page`)
        for (let i = 0; i < 12; i++) {
            await page.locator('#live-original').evaluate((frame, index) => {
                frame.contentDocument.querySelector(
                    '#scroll-regression-fixture',
                ).textContent = String(index)
            }, i)
            await page.waitForTimeout(500)
            assert.ok(
                Math.abs((await page.evaluate(() => window.scrollY)) - before) <
                    4,
                `${area} jumped while updating`,
            )
        }
        await page.screenshot({ path: `${artifacts}/${area}-scrolled.png` })
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('[data-live-page=planet]').first().click()
    await page.locator('#live-rename-open').click()
    const box = await page.locator('#live-rename-dialog').boundingBox()
    assert.ok(box.x >= 0 && box.x + box.width <= 391)
    await page.screenshot({ path: `${artifacts}/rename-mobile.png` })
    assert.deepEqual(errors, [])
    console.log(
        'PASS: original planet rename and validation, single submission, persistence, independent 1% text/heading sizes, 20% smaller default headings, legacy settings migration, stable scroll across real messages/highscore/shop/options and mobile rename dialog',
    )
} finally {
    await browser.close()
}
