import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const account = JSON.parse(
    await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8'),
)
const fixture = JSON.parse(
    await readFile('storage/app/report-timing-ui-fixture.json', 'utf8'),
)
const artifacts = process.env.ARTIFACT_DIR || '/tmp/report-timing'
await mkdir(artifacts, { recursive: true })
const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
try {
    const context = await browser.newContext({
        baseURL: process.env.LIVE_BASE_URL,
        viewport: { width: 1540, height: 1000 },
        reducedMotion: 'reduce',
    })
    await context.addInitScript(() => {
        localStorage.setItem(
            'ogamex-ui-readability-v2',
            JSON.stringify({ text: 115, headings: 100 }),
        )
    })
    const login = await context.request.get('/login')
    const token = (await login.text()).match(
        /name="csrf-token" content="([^"]+)"/,
    )[1]
    const signedIn = await context.request.post('/login', {
        form: {
            email: account.email,
            password: account.password,
            _token: token,
        },
        maxRedirects: 0,
    })
    assert.ok([302, 303].includes(signedIn.status()))
    const page = await context.newPage(),
        errors = [],
        models = []
    page.setDefaultTimeout(60000)
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('request', (r) => {
        if (new URL(r.url()).pathname.endsWith('.glb')) models.push(r.url())
    })
    await page.goto(`/play-3d?cp=${account.planet}#admin`)
    await page.locator('[data-admin-tab=timing]').click()
    const frame = page.frameLocator('#live-admin-frame')
    const card = frame.locator(`[data-mission-id="${fixture.mission}"]`)
    await card.waitFor()
    const minutes = card.locator('input[name=minutes]')
    assert.equal(await minutes.inputValue(), '60')
    await minutes.fill('10000')
    const metrics = await minutes.evaluate((n) => {
        const style = getComputedStyle(n),
            canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d')
        ctx.font = style.font
        return {
            width: n.getBoundingClientRect().width,
            space:
                n.clientWidth -
                parseFloat(style.paddingLeft) -
                parseFloat(style.paddingRight) -
                20,
            text: ctx.measureText(n.value).width,
            color: style.color,
        }
    })
    assert.ok(
        metrics.width >= 128 && metrics.space >= metrics.text,
        JSON.stringify(metrics),
    )
    assert.equal(await minutes.inputValue(), '10000')
    assert.match(await card.innerText(), /Verkürzen/)
    assert.match(await card.innerText(), /Transportieren/)
    assert.doesNotMatch(
        await frame.locator('body').innerText(),
        /Server time|Refresh|Reduce|Active missions/,
    )
    await card.screenshot({ path: `${artifacts}/fleet-timing.png` })
    await minutes.fill('37')
    const reduced = page.waitForResponse(
        (r) =>
            new URL(r.url()).pathname === '/admin/fleet-timing/reduce' &&
            r.request().method() === 'POST',
    )
    await card.getByRole('button', { name: 'Verkürzen', exact: true }).click()
    const result = await reduced
    assert.equal(
        new URLSearchParams(result.request().postData()).get('minutes'),
        '37',
    )
    assert.ok([302, 303].includes(result.status()))
    await frame.locator('.timing-success').waitFor()
    assert.match(
        await frame.locator('.timing-success').innerText(),
        /37 Minuten/,
    )
    await page.setViewportSize({ width: 390, height: 844 })
    await card.screenshot({ path: `${artifacts}/fleet-timing-mobile.png` })
    assert.ok(
        await frame
            .locator('html')
            .evaluate((n) => n.scrollWidth <= innerWidth + 1),
        'timing view must fit on mobile',
    )
    await page.setViewportSize({ width: 1540, height: 1000 })
    await page.goto(`/play-3d?cp=${account.planet}#messages`)
    await page.waitForFunction(
        () => document.querySelector('#live-original').dataset.ready === 'true',
    )
    const messages = page.frameLocator('#live-original')
    await messages.locator('a[href*="subtab=combat_reports"]').first().click()
    await messages
        .locator(`a[href*="/ajax/messages/${fixture.message}"]`)
        .first()
        .click()
    const report = page.locator('#live-message-dialog .live-battle-report')
    await report.waitFor()
    assert.equal(models.length, 0, 'text reports must not fetch 3D models')
    const attacker = report.locator(
        '[data-battle-side=attacker] [data-battle-unit=light_fighter]',
    )
    assert.equal(
        await attacker.locator('[data-count=before]').innerText(),
        '13',
    )
    assert.equal(await attacker.locator('[data-count=after]').innerText(), '8')
    assert.equal(await attacker.locator('[data-count=lost]').innerText(), '5')
    assert.match(await report.innerText(), /Kollektor/)
    assert.doesNotMatch(
        await report.innerText(),
        /Bold|Font colour|Characters remaining|Bronze Crystal Booster|Unehrenhafter Kampf/,
    )
    assert.equal(
        await report.locator('[data-battle-unit=heavy_fighter]').count(),
        0,
    )
    const dialog = page.locator('#live-message-dialog')
    await dialog.evaluate((n) => (n.scrollTop = 0))
    await dialog.screenshot({ path: `${artifacts}/battle-details.png` })
    await attacker.scrollIntoViewIfNeeded()
    await dialog.screenshot({ path: `${artifacts}/battle-fleets.png` })
    const round = report.locator('[data-battle-round="1"]')
    await round.locator('summary').click()
    assert.equal(
        await round
            .locator('[data-battle-unit=light_fighter] [data-count=lost]')
            .innerText(),
        '3',
    )
    await page.setViewportSize({ width: 390, height: 844 })
    await dialog.evaluate((n) => (n.scrollTop = 0))
    await dialog.screenshot({ path: `${artifacts}/battle-details-mobile.png` })
    assert.ok(
        await dialog.evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
        'report must fit on mobile',
    )
    assert.deepEqual(errors, [])
    console.log(
        'PASS: readable five-digit minute input, real reduction and German feedback, German fleet panel, actual stored battle counts and round details, no legacy editor or zero-only units, no automatic GLB loads, mobile layouts, no JavaScript errors',
    )
} finally {
    await browser.close()
}
