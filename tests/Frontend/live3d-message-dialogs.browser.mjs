import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, mkdir } from 'node:fs/promises'
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
    account = JSON.parse(await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8')),
    artifacts = process.env.ARTIFACT_DIR || '/tmp/message-dialogs'
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
        errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.setDefaultTimeout(45000)
    await page.goto(`/play-3d?cp=${account.planet}#messages`)
    await page.waitForSelector('#prototype[data-ready=true]')
    const frame = page.frameLocator('#live-original'),
        dialog = page.locator('#live-message-dialog')
    await frame
        .locator('a.msg_action_link[href*="/ajax/messages/"]')
        .first()
        .waitFor()
    assert.ok(await frame.locator('.live-message-delete').first().isVisible())
    await frame
        .locator('a.msg_action_link[href*="/ajax/messages/"]')
        .first()
        .click()
    await dialog.locator('.live-spy-report').waitFor()
    assert.equal(await dialog.evaluate((d) => d.open), true)
    assert.equal(await dialog.locator('[data-message-fleet]').count(), 2)
    assert.ok(
        (
            await dialog
                .locator('[data-message-fleet]')
                .last()
                .getAttribute('href')
        ).includes('mission=6'),
    )
    assert.ok(
        (
            await dialog.locator('[data-report-section=research]').innerText()
        ).includes('keine zuverlässigen'),
    )
    assert.ok(
        (
            await dialog.locator('[data-report-section=defense]').innerText()
        ).includes('Keine Einträge'),
    )
    await page.screenshot({ path: `${artifacts}/spy-report-dialog.png` })
    assert.equal(await dialog.evaluate((d) => d.matches(':modal')), true)
    assert.equal(await frame.locator('[data-live-message-id]').count(), 0)
    const id = await dialog
        .locator('[data-live-message-id]')
        .getAttribute('data-live-message-id')
    await dialog.getByRole('button', { name: 'Nächste', exact: true }).click()
    await page.waitForFunction(
        (id) =>
            document.querySelector(
                '#live-message-dialog [data-live-message-id]',
            )?.dataset.liveMessageId !== id,
        id,
    )
    await dialog.locator('.live-spy-report').waitFor()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: `${artifacts}/spy-report-mobile.png` })
    assert.ok(
        await dialog.evaluate(
            (d) => d.getBoundingClientRect().right <= innerWidth,
        ),
    )
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    await page.setViewportSize({ width: 1440, height: 1050 })
    // A report action opens the existing native quick fleet dialog with the actual target.
    await frame
        .locator('a.msg_action_link[href*="/ajax/messages/"]')
        .first()
        .click()
    await dialog.locator('.live-spy-report').waitFor()
    await dialog.locator('[data-message-fleet]').last().click()
    await page.locator('#quick-fleet-dialog[open]').waitFor()
    await page.keyboard.press('Escape')
    // Read-message deletion uses the original endpoint and refreshes the list.
    page.on('dialog', (d) => d.accept())
    await frame
        .locator('a.msg_action_link[href*="/ajax/messages/"]')
        .first()
        .click()
    await dialog.locator('.live-spy-report').waitFor()
    const deletedId = await dialog
            .locator('[data-live-message-id]')
            .getAttribute('data-live-message-id'),
        deleted = page.waitForResponse(
            (r) =>
                new URL(r.url()).pathname === '/messages' &&
                r.request().method() === 'POST',
        )
    await dialog.getByRole('button', { name: 'Löschen', exact: true }).click()
    assert.equal((await deleted).status(), 200)
    await dialog.waitFor({ state: 'hidden' })
    await frame
        .locator(`[data-msg-id="${deletedId}"]`)
        .waitFor({ state: 'detached' })
    await frame.locator('[data-live-delete-read]:not([disabled])').waitFor()
    const bulk = page.waitForResponse(
        (r) =>
            new URL(r.url()).pathname === '/messages' &&
            r.request().method() === 'POST',
    )
    await frame.locator('[data-live-delete-read]').click()
    assert.ok((await (await bulk).json()).deleted > 0)
    await frame.locator('li.no_msg').waitFor()
    console.log(
        'PASS: parent-layer report, real fleet actions, pagination, mobile layout, Escape and single/bulk read-message deletion',
    )
    // Real defense production + visible DETROID activation receipt.
    await page.locator('[data-live-page=defense]').first().click()
    await page.locator('[data-object=rocket_launcher]').click()
    await page.locator('#live-quantity').fill('100')
    const production = page.waitForResponse(
        (r) =>
            r.url().includes('/play-3d/command') &&
            r.request().method() === 'POST',
    )
    await page.locator('#live-start').click()
    assert.equal((await (await production).json()).status, 'success')
    const preview = page.locator('#live-detail .object-artwork')
    await preview
        .locator('.object-preview-progress:not([hidden]) .duration-part')
        .first()
        .waitFor()
    assert.equal(await preview.locator('.duration-part').count(), 4)
    await preview.screenshot({
        path: `${artifacts}/compact-production-countdown.png`,
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await preview.scrollIntoViewIfNeeded()
    await preview.screenshot({
        path: `${artifacts}/compact-countdown-mobile.png`,
    })
    await page.evaluate(() =>
        document.documentElement.style.setProperty('--ui-text-scale', '1.6'),
    )
    const fit = await preview.evaluate((host) => {
        const bar = host
                .querySelector('.object-preview-progress')
                .getBoundingClientRect(),
            box = host.getBoundingClientRect()
        return bar.right <= box.right && bar.left >= box.left
    })
    assert.equal(
        fit,
        true,
        'Compact countdown must fit at 160% text scale on mobile',
    )
    await page.evaluate(() =>
        document.documentElement.style.setProperty('--ui-text-scale', '1'),
    )
    await page.setViewportSize({ width: 1440, height: 1050 })
    const snapshot = async () =>
            (
                await context.request.get(
                    `/play-3d/state?planet=${account.planet}`,
                )
            ).json(),
        before = await snapshot(),
        ready = Number(
            before.objects.find((o) => o.key === 'rocket_launcher').amount,
        )
    await page.locator('[data-live-page=shop]').first().click()
    await frame.locator('#commerce-shop').waitFor()
    const buy = page.waitForResponse(
        (r) =>
            r.url().includes('/shop/purchase') &&
            r.request().method() === 'POST',
    )
    await frame
        .locator('[data-product=detroid_bronze] button[type=submit]')
        .click()
    assert.equal((await buy).status(), 200)
    await frame
        .locator('.commerce-message')
        .filter({ hasText: 'Kauf abgeschlossen' })
        .waitFor()
    await page.locator('[data-nav-action=inventory]').click()
    await frame
        .locator('#commerce-inventory [data-product=detroid_bronze]')
        .waitFor()
    const activation = page.waitForResponse(
        (r) =>
            r.url().includes('/shop/activate') &&
            r.request().method() === 'POST',
    )
    await frame.locator('[data-product=detroid_bronze] button').click()
    const receipt = await (await activation).json()
    assert.equal(receipt.success, true)
    assert.equal(receipt.effect.seconds, 1800)
    assert.ok(receipt.effect.units > 0)
    await frame
        .locator('.commerce-message')
        .filter({ hasText: 'Tatsächlich verkürzt' })
        .waitFor()
    await page.screenshot({ path: `${artifacts}/detroid-defense-receipt.png` })
    const after = await snapshot()
    assert.equal(
        Number(after.objects.find((o) => o.key === 'rocket_launcher').amount),
        ready + receipt.effect.units,
    )
    assert.deepEqual(errors, [])
    console.log(
        'PASS: rocket-only production receives DETROID time and finished units; receipt and compact segmented countdown are visible',
    )
} finally {
    await browser.close()
}
