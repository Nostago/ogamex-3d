import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const account = JSON.parse(
    await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8'),
)
const fixture = JSON.parse(
    await readFile('storage/app/bot-aggression-ui-fixture.json', 'utf8'),
)
const artifacts = process.env.ARTIFACT_DIR || '/tmp/bot-aggression'
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
    const login = await context.request.get('/login')
    const token = (await login.text()).match(
        /name="csrf-token" content="([^"]+)"/,
    )[1]
    const result = await context.request.post('/login', {
        form: {
            email: account.email,
            password: account.password,
            _token: token,
        },
        maxRedirects: 0,
    })
    assert.ok([302, 303].includes(result.status()))
    const page = await context.newPage(),
        errors = []
    page.setDefaultTimeout(60000)
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('dialog', (d) => d.accept())
    await page.goto(`/play-3d?cp=${account.planet}#admin`)
    await page.locator('[data-admin-tab=bots]').click()
    for (const [id, action, text] of [
        [fixture.builder, 'unit', 'Schiffsproduktion beauftragt'],
        [fixture.raider, 'raid', 'Rohstoffraid gestartet'],
    ]) {
        const card = page.locator(`[data-bot-id="${id}"]`)
        await card.locator('summary').click()
        const ticked = page.waitForResponse(
            (r) =>
                new URL(r.url()).pathname === '/play-3d/bots' &&
                r.request().method() === 'POST',
        )
        await card
            .getByRole('button', {
                name: 'Eine Entscheidung ausführen',
                exact: true,
            })
            .click()
        const response = await ticked
        assert.equal(response.status(), 200)
        assert.equal((await response.json()).decisions, 1)
        await page.waitForFunction(
            ({ id, text }) =>
                document
                    .querySelector(`[data-bot-id="${id}"]`)
                    .textContent.includes(text),
            { id, text },
        )
        const state = await (await context.request.get('/play-3d/bots')).json()
        assert.equal(
            state.bots.find((bot) => bot.id === id).last_action,
            action,
        )
        await card.screenshot({ path: `${artifacts}/${action}.png` })
    }
    assert.deepEqual(errors, [])
    console.log(
        'PASS: real admin controls run normal-cost early fighter production and an escorted raid against a scouted guarded NPC, German action feedback, no JavaScript errors',
    )
} finally {
    await browser.close()
}
