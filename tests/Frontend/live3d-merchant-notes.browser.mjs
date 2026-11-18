import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, mkdir } from 'node:fs/promises'
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
    account = JSON.parse(await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8')),
    artifacts = process.env.ARTIFACT_DIR || '/tmp/merchant-notes'
assert.ok(
    account.email.startsWith('codex_live_'),
    'Use isolated fixture accounts only',
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
        errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.setDefaultTimeout(30000)
    const frame = page.frameLocator('#live-original'),
        dialog = page.locator('#live-work-dialog')
    async function visit(area, selector) {
        await page.goto(`/play-3d?cp=${account.planet}#${area}`)
        await frame.locator(selector).waitFor()
        await page.locator('#live-original[data-ready=true]').waitFor()
    }
    async function close() {
        await dialog
            .getByRole('button', { name: 'Schließen', exact: true })
            .click()
        await dialog.waitFor({ state: 'hidden' })
    }
    const response = (path) =>
        page.waitForResponse(
            (r) =>
                new URL(r.url()).pathname === path &&
                r.request().method() === 'POST',
        )
    await visit('notes', '#live-notes')
    assert.equal(await frame.locator('[data-note-row]').count(), 2)
    await frame
        .getByRole('button', { name: '+ Neue Notiz', exact: true })
        .click()
    await dialog.locator('[data-note-form]').waitFor()
    await dialog.getByLabel('Betreff', { exact: true }).fill('Neue Testnotiz')
    await dialog
        .getByLabel('Deine Notiz', { exact: true })
        .fill('Erste Zeile\nZweite Zeile <b>bleibt Text</b>')
    await dialog.getByLabel('Priorität', { exact: true }).selectOption('1')
    const create = response('/ajax/notes/create')
    await dialog.getByRole('button', { name: 'Speichern', exact: true }).click()
    const created = await (await create).json()
    assert.ok(created.id)
    await dialog.waitFor({ state: 'hidden' })
    const row = frame.locator(`[data-note-row="${created.id}"]`)
    await row.waitFor()
    await row
        .getByRole('button', { name: 'Öffnen / Bearbeiten', exact: true })
        .click()
    await dialog.getByLabel('Deine Notiz', { exact: true }).waitFor()
    assert.equal(
        await dialog.getByLabel('Priorität', { exact: true }).inputValue(),
        '1',
    )
    assert.equal(await dialog.locator('b').count(), 0)
    await dialog
        .getByLabel('Betreff', { exact: true })
        .fill('Bearbeitete Notiz')
    await dialog
        .getByLabel('Deine Notiz', { exact: true })
        .fill('Geänderter Inhalt')
    const edit = response('/ajax/notes/create')
    await dialog.getByRole('button', { name: 'Speichern', exact: true }).click()
    assert.equal((await (await edit).json()).id, created.id)
    await row.getByText('Bearbeitete Notiz', { exact: true }).waitFor()
    await frame.locator('[data-notes-filter]').fill('Bearbeitete')
    assert.equal(await frame.locator('[data-note-row]:visible').count(), 1)
    await frame.locator('[data-notes-all]').check()
    page.once('dialog', (d) => d.accept())
    const deletion = response('/overlay/notes')
    await frame
        .getByRole('button', { name: 'Markierte löschen', exact: true })
        .click()
    assert.equal((await deletion).status(), 200)
    await row.waitFor({ state: 'detached' })
    await frame.locator('[data-note-row]').first().waitFor()
    assert.equal(await frame.locator('[data-note-row]').count(), 2)
    await page.screenshot({ path: `${artifacts}/notes-list.png` })
    const long = frame
        .locator('[data-note-row]')
        .filter({ hasText: 'Lange Testnotiz' })
    await long
        .getByRole('button', { name: 'Öffnen / Bearbeiten', exact: true })
        .click()
    await dialog.locator('textarea').waitFor()
    assert.ok((await dialog.locator('textarea').inputValue()).length > 3000)
    await page.screenshot({ path: `${artifacts}/note-editor.png` })
    await page.setViewportSize({ width: 390, height: 844 })
    assert.ok(
        await dialog.evaluate(
            (n) => n.getBoundingClientRect().right <= innerWidth,
        ),
    )
    await dialog
        .getByRole('button', { name: 'Speichern', exact: true })
        .scrollIntoViewIfNeeded()
    assert.ok(
        await dialog
            .getByRole('button', { name: 'Speichern', exact: true })
            .isVisible(),
    )
    await page.screenshot({ path: `${artifacts}/note-editor-mobile.png` })
    await close()
    await page.setViewportSize({ width: 1440, height: 1050 })
    await visit('merchant', '#live-merchant')
    await frame
        .getByRole('link', { name: 'Schrotthändler öffnen →', exact: true })
        .click()
    await frame.locator('#live-scrap').waitFor()
    assert.equal(await frame.locator('.anythingSlider').count(), 0)
    const fighter = frame.locator('[data-scrap-unit="204"]'),
        rocket = frame.locator('[data-scrap-unit="401"]')
    assert.equal(await fighter.locator('input').getAttribute('max'), '20')
    await fighter.locator('input').fill('2')
    await rocket.locator('input').fill('1')
    assert.ok(
        Number(
            (
                await frame.locator('[data-scrap-return=metal]').innerText()
            ).replaceAll('.', ''),
        ) > 0,
    )
    page.once('dialog', (d) => d.accept())
    const bargain = response('/merchant/scrap/bargain')
    await frame.getByRole('button', { name: 'Verhandeln', exact: true }).click()
    const offer = await (await bargain).json()
    assert.ok(offer.newPercentage > 35)
    assert.equal(offer.darkMatter, 298000)
    await frame
        .locator('[data-scrap-offer]')
        .getByText(`${offer.newPercentage} %`, { exact: true })
        .waitFor()
    await page.screenshot({ path: `${artifacts}/scrap-desktop.png` })
    const preflight = response('/merchant/scrap/execute')
    await frame
        .getByRole('button', { name: 'Auswahl prüfen', exact: true })
        .first()
        .click()
    assert.equal((await (await preflight).json()).validated, true)
    await dialog
        .getByRole('button', { name: 'Jetzt verschrotten', exact: true })
        .waitFor()
    await page.screenshot({ path: `${artifacts}/scrap-confirmation.png` })
    const scrap = response('/merchant/scrap/execute')
    await dialog
        .getByRole('button', { name: 'Jetzt verschrotten', exact: true })
        .click()
    const receipt = await (await scrap).json()
    assert.equal(receipt.success, true)
    assert.ok(receipt.returned.metal > 0)
    await frame.locator('[data-scrap-unit="204"] input[max="18"]').waitFor()
    await frame.locator('[data-scrap-unit="401"] input[max="4"]').waitFor()
    await close()
    await frame
        .getByRole('link', { name: 'Rohstoffmarkt', exact: true })
        .click()
    await frame.locator('#live-market').waitFor()
    const metal = frame
        .locator('.work-market-grid>article')
        .filter({ hasText: 'Verkaufen Metall' })
    page.once('dialog', (d) => d.accept())
    const call = response('/merchant/call')
    await metal
        .getByRole('button', { name: 'Händler rufen', exact: true })
        .click()
    assert.equal((await (await call).json()).success, true)
    await frame.locator('input[name=give_amount]').waitFor()
    await close()
    await frame.locator('input[name=give_amount]').fill('1000')
    await frame.locator('#receive-crystal').fill('50')
    page.once('dialog', (d) => d.accept())
    const trade = response('/merchant/trade')
    await frame
        .getByRole('button', { name: 'Rohstoffe tauschen', exact: true })
        .click()
    const exchanged = await (await trade).json()
    assert.equal(exchanged.success, true)
    assert.equal(exchanged.received.crystal, 50)
    await dialog.getByText('50', { exact: true }).waitFor()
    await close()
    await page.setViewportSize({ width: 390, height: 844 })
    await frame.locator('#live-market').waitFor()
    await frame.locator('#live-market').scrollIntoViewIfNeeded()
    assert.ok(
        await frame
            .locator('body')
            .evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
    )
    await page.screenshot({ path: `${artifacts}/market-mobile.png` })
    assert.deepEqual(errors, [])
    console.log(
        'PASS: native notes CRUD/filter/bulk deletion and long-text mobile editor; native scrap preview/bargain/preflight/confirmation/receipt with real unit changes; merchant call/trade and responsive market',
    )
} finally {
    await browser.close()
}
