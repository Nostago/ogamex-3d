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
const artifacts = process.env.ARTIFACT_DIR || '/tmp/bot-strategy'
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
    await context.addInitScript(() =>
        localStorage.setItem(
            'ogamex-ui-readability-v2',
            JSON.stringify({ text: 115, headings: 100 }),
        ),
    )
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
    const state = async () => {
        const response = await context.request.get('/play-3d/bots')
        assert.equal(response.status(), 200)
        return response.json()
    }
    const before = (await state()).bots
    const page = await context.newPage(),
        errors = []
    page.setDefaultTimeout(60000)
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('dialog', (d) => d.accept())
    async function openBots() {
        const url = new URL(
            `/play-3d?cp=${account.planet}#admin`,
            process.env.LIVE_BASE_URL,
        ).href
        if (page.url() === url) await page.reload()
        else await page.goto(url)
        await page.locator('[data-admin-tab=bots]').click()
        await page.locator(`[data-bot-id="${fixture.builder}"]`).waitFor()
    }
    async function posted(click) {
        const waiting = page.waitForResponse(
            (r) =>
                new URL(r.url()).pathname === '/play-3d/bots' &&
                r.request().method() === 'POST',
        )
        await click()
        const response = await waiting
        assert.equal(response.status(), 200)
        return response.json()
    }
    async function fill(root, values) {
        for (const [key, value] of Object.entries(values))
            await root.locator(`[name="strategy_${key}"]`).fill(String(value))
    }
    await openBots()
    const card = page.locator(`[data-bot-id="${fixture.builder}"]`)
    await card.locator('summary').click()
    assert.equal(
        await card.locator('[name=strategy_custom]').isChecked(),
        false,
    )
    assert.equal(await card.locator('[name=strategy_fleet]').isDisabled(), true)
    await card.locator('[name=strategy_custom]').check()
    await fill(card, {
        fleet: 50,
        economy: 25,
        research: 25,
        raid_every: 3,
        strength: 2.5,
    })
    assert.match(
        await card.locator('[data-strategy-summary]').innerText(),
        /Flottenbau 50 %.*Wirtschaft 25 %.*Forschung 25 %/,
    )
    await posted(() =>
        card
            .getByRole('button', {
                name: 'Einstellungen speichern',
                exact: true,
            })
            .click(),
    )
    await openBots()
    await card.locator('summary').click()
    assert.equal(
        await card.locator('[name=strategy_strength]').inputValue(),
        '2.5',
    )
    await card.screenshot({ path: `${artifacts}/individual.png` })
    const bulk = page.locator('#bots-strategy-bulk'),
        form = page.locator('#bots-strategy-all')
    await bulk.locator('summary').click()
    await fill(form, { fleet: 0, economy: 0, research: 0 })
    assert.equal(
        await form
            .locator('[name=strategy_fleet]')
            .evaluate((n) => n.checkValidity()),
        false,
    )
    await fill(form, {
        fleet: 70,
        economy: 20,
        research: 10,
        raid_every: 4,
        strength: 4,
    })
    await bulk.screenshot({ path: `${artifacts}/bulk.png` })
    const changed = await posted(() =>
        form
            .getByRole('button', {
                name: 'Strategie auf alle Bots anwenden',
                exact: true,
            })
            .click(),
    )
    assert.equal(changed.updated, before.length)
    const all = (await state()).bots
    assert.ok(
        all.every(
            (bot) =>
                bot.strategy.fleet === 70 &&
                bot.strategy.strength === 4 &&
                bot.strategy.raid_every === 4,
        ),
    )
    for (const old of before) {
        const bot = all.find((b) => b.id === old.id)
        for (const key of [
            'name',
            'profile',
            'enabled',
            'auto_raid',
            'auto_build',
            'auto_shipbuilding',
            'cycles',
        ])
            assert.equal(bot[key], old[key], key)
    }
    await openBots()
    await bulk.locator('summary').click()
    assert.equal(
        await form.locator('[name=strategy_fleet]').inputValue(),
        '70',
        'uniform bulk strategy must survive page reload',
    )
    await card.locator('summary').click()
    await fill(card, { strength: 2.2 })
    await posted(() =>
        card
            .getByRole('button', {
                name: 'Einstellungen speichern',
                exact: true,
            })
            .click(),
    )
    const individual = (await state()).bots
    assert.equal(
        individual.find((b) => b.id === fixture.builder).strategy.strength,
        2.2,
    )
    assert.ok(
        individual
            .filter((b) => b.id !== fixture.builder)
            .every((b) => b.strategy.strength === 4),
    )
    await page.setViewportSize({ width: 390, height: 844 })
    await bulk.screenshot({ path: `${artifacts}/bulk-mobile.png` })
    assert.ok(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        'strategy controls must fit on mobile',
    )
    await posted(() => page.locator('#bots-strategy-reset').click())
    assert.ok((await state()).bots.every((bot) => bot.strategy === null))
    assert.deepEqual(errors, [])
    console.log(
        'PASS: individual strategy persistence and profile reset, live percentage preview, zero-weight validation, atomic bulk apply, uniform reload, per-bot override, preserved flags/names/cycles, mobile at 115%, no JavaScript errors',
    )
} finally {
    await browser.close()
}
