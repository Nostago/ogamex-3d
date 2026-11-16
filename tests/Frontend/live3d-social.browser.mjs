import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, mkdir } from 'node:fs/promises'
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
    accounts = JSON.parse(
        await readFile(process.env.LIVE_SOCIAL_ACCOUNTS_FILE, 'utf8'),
    ),
    account = accounts.owner,
    artifacts = process.env.ARTIFACT_DIR || '/tmp/ogamex-social-ui'
for (const fixture of Object.values(accounts)) {
    assert.ok(
        fixture.name.startsWith('codex_live_'),
        'Use isolated fixture accounts only',
    )
    assert.ok(fixture.email.startsWith('codex_live_'))
}
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
        viewport: { width: 1440, height: 1000 },
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
    page.on('pageerror', (error) => errors.push(error.message))
    page.setDefaultTimeout(30000)
    const frame = page.frameLocator('#live-original'),
        dialog = page.locator('#live-social-dialog')
    async function visit(area) {
        await page.goto(`/play-3d?cp=${account.planet}#${area}`)
        await page.locator('#live-original[data-ready=true]').waitFor()
        if (['buddies', 'highscore'].includes(area))
            await frame.locator('#live-social').waitFor()
        await page.waitForTimeout(200)
    }
    async function close() {
        await dialog
            .getByRole('button', { name: 'Schließen', exact: true })
            .click()
        await dialog.waitFor({ state: 'hidden' })
    }
    async function action(form, button) {
        const response = page.waitForResponse(
            (r) =>
                r.request().method() === 'POST' &&
                new URL(r.url()).pathname === '/buddies',
        )
        await form.getByRole('button', { name: button, exact: true }).click()
        const result = await response
        assert.equal(result.status(), 200)
        assert.equal((await result.json()).success, true)
        await frame.locator('#live-social').waitFor()
    }
    await visit('buddies')
    assert.equal(
        await frame.locator('.social-friends [data-social-friend]').count(),
        1,
    )
    assert.equal(await frame.locator('.social-request-grid section').count(), 2)
    assert.equal(await frame.locator('.icon_chat,.icon_trash').count(), 0)
    await page.screenshot({
        path: `${artifacts}/friends-desktop.png`,
        fullPage: true,
    })
    await frame.locator('[data-social-filter]').fill('does-not-exist')
    assert.equal(
        await frame.locator('[data-social-no-friends]').isVisible(),
        true,
    )
    await frame.locator('[data-social-filter]').fill('')
    const friendRow = frame.locator(
        `[data-social-friend="${accounts.friend.name}"]`,
    )
    await friendRow
        .getByRole('button', { name: 'Nachricht', exact: true })
        .click()
    await dialog
        .getByText('Noch keine Nachrichten in dieser Unterhaltung.', {
            exact: true,
        })
        .waitFor()
    await dialog
        .getByRole('textbox', { name: 'Deine Nachricht', exact: true })
        .fill('Testnachricht <b>bleibt Text</b>')
    const send = page.waitForResponse(
        (r) => new URL(r.url()).pathname === '/chat/send',
    )
    await dialog.getByRole('button', { name: 'Senden', exact: true }).click()
    assert.equal((await (await send).json()).status, 'OK')
    await dialog
        .getByText('Testnachricht <b>bleibt Text</b>', { exact: true })
        .waitFor()
    assert.equal(await dialog.locator('.social-chat-entry b').count(), 0)
    assert.equal(new URL(page.url()).hash, '#buddies')
    await page.screenshot({ path: `${artifacts}/native-chat.png` })
    await close()
    await action(
        frame
            .locator('.social-request')
            .filter({ hasText: accounts.incoming.name }),
        'Annehmen',
    )
    await frame
        .locator(`[data-social-friend="${accounts.incoming.name}"]`)
        .waitFor()
    assert.equal(
        await frame.locator('.social-friends [data-social-friend]').count(),
        2,
    )
    await action(
        frame
            .locator('.social-request')
            .filter({ hasText: accounts.outgoing.name }),
        'Zurückziehen',
    )
    await frame
        .locator('.social-request')
        .filter({ hasText: accounts.outgoing.name })
        .waitFor({ state: 'hidden' })
    await visit('highscore')
    const ranking = frame.locator('.social-ranking')
    assert.deepEqual(await ranking.locator('thead th').allTextContents(), [
        'Platz',
        'Spieler',
        'Punkte',
        'Aktionen',
    ])
    assert.equal(
        await frame.locator('.tabs_btn,.icon_caption,.icon_chat').count(),
        0,
    )
    assert.ok(
        await ranking
            .locator(`[data-social-player="${accounts.search.id}"]`)
            .count(),
    )
    await page.screenshot({ path: `${artifacts}/highscore-desktop.png` })
    const target = ranking.locator(
        `[data-social-player="${accounts.search.id}"]`,
    )
    await target
        .getByRole('button', { name: 'Freundschaft anfragen', exact: true })
        .click()
    await dialog.getByRole('textbox').fill('Hallo aus dem neuen UI')
    const request = page.waitForResponse(
        (r) => new URL(r.url()).pathname === '/buddies/send-request',
    )
    await dialog
        .getByRole('button', { name: 'Anfrage senden', exact: true })
        .click()
    assert.equal((await (await request).json()).success, true)
    await dialog
        .getByText('Freundschaftsanfrage versendet!', {
            exact: true,
        })
        .waitFor()
    assert.equal(new URL(page.url()).hash, '#highscore')
    await page.screenshot({ path: `${artifacts}/native-friend-request.png` })
    await close()
    await page.evaluate(() => scrollTo(0, 600))
    const y = await page.evaluate(() => scrollY)
    await page.waitForTimeout(6000)
    assert.ok(y > 0)
    assert.ok(
        Math.abs((await page.evaluate(() => scrollY)) - y) <= 2,
        'Highscore must not jump to top',
    )
    await page.setViewportSize({ width: 390, height: 844 })
    await page.evaluate(() => scrollTo(0, 0))
    await page.waitForTimeout(500)
    for (const area of ['highscore', 'buddies']) {
        await visit(area)
        assert.ok(
            await frame
                .locator('body')
                .evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
            'No horizontal overflow',
        )
        assert.ok(
            await frame
                .locator('.social-table thead')
                .evaluate((n) => getComputedStyle(n).display === 'none'),
        )
        await page.screenshot({
            path: `${artifacts}/${area}-mobile.png`,
            fullPage: false,
        })
    }
    await page.setViewportSize({ width: 1440, height: 1000 })
    await visit('options')
    await page.locator('#live-ui-text-scale').fill('160')
    await page.locator('#live-ui-heading-scale').fill('130')
    await visit('buddies')
    assert.ok(
        await frame
            .locator('.social-friends')
            .evaluate((n) => parseFloat(getComputedStyle(n).fontSize) >= 25),
    )
    assert.ok(
        await frame
            .locator('body')
            .evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
    )
    await page.screenshot({ path: `${artifacts}/friends-large-text.png` })
    await friendRow
        .getByRole('button', { name: 'Freund entfernen', exact: true })
        .click()
    await dialog.getByRole('button', { name: 'Abbrechen', exact: true }).click()
    assert.equal(await friendRow.count(), 1)
    await friendRow
        .getByRole('button', { name: 'Freund entfernen', exact: true })
        .click()
    const removed = page.waitForResponse(
        (r) =>
            r.request().method() === 'POST' &&
            new URL(r.url()).pathname === '/buddies',
    )
    await dialog
        .getByRole('button', { name: 'Freund entfernen', exact: true })
        .click()
    assert.equal((await (await removed).json()).success, true)
    await friendRow.waitFor({ state: 'hidden' })
    assert.equal(new URL(page.url()).hash, '#buddies')
    const ignored = frame
        .locator('.social-request')
        .filter({ hasText: accounts.ignored.name })
    await ignored
        .getByRole('button', { name: 'Ignorierung aufheben', exact: true })
        .click()
    await ignored.waitFor({ state: 'hidden' })
    await frame.locator('#live-social').waitFor()
    await frame.locator('#social-search').fill(accounts.search.name)
    await frame.getByRole('button', { name: 'Suchen', exact: true }).click()
    const searchResult = frame
        .locator('.social-search-results .social-request')
        .filter({ hasText: accounts.search.name })
    await searchResult.waitFor()
    await searchResult
        .getByRole('button', { name: 'Freundschaft anfragen', exact: true })
        .click()
    const duplicate = page.waitForResponse(
        (r) => new URL(r.url()).pathname === '/buddies/send-request',
    )
    await dialog
        .getByRole('button', { name: 'Anfrage senden', exact: true })
        .click()
    assert.equal((await duplicate).status(), 400)
    await dialog
        .getByText('Zwischen diesen Spielern besteht bereits eine Anfrage.', {
            exact: true,
        })
        .waitFor()
    await close()
    const remainingFriend = frame.locator(
        `[data-social-friend="${accounts.incoming.name}"]`,
    )
    await remainingFriend.locator('a[href*="highscore"]').click()
    await page.waitForFunction(() => location.hash === '#highscore')
    await frame.locator('.social-ranking').waitFor()
    assert.equal(new URL(page.url()).hash, '#highscore')
    assert.deepEqual(errors, [])
    console.log(
        'PASS: native friends, request acceptance/withdrawal/removal, native chat/request actions, total-points highscore, scrolling, mobile and independent font scaling',
    )
} finally {
    await browser.close()
}
