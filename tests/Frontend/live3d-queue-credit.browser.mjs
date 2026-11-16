import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, mkdir } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const account = JSON.parse(
        await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8'),
    ),
    artifacts = process.env.ARTIFACT_DIR || '/tmp/ogamex-queue-credit'
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
    })
    const login = await context.request.get('/login'),
        token = (await login.text()).match(
            /name="csrf-token" content="([^"]+)"/,
        )[1]
    const signed = await context.request.post('/login', {
        form: {
            email: account.email,
            password: account.password,
            _token: token,
        },
        maxRedirects: 0,
    })
    assert.ok([302, 303].includes(signed.status()))
    const page = await context.newPage(),
        errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.setDefaultTimeout(45000)
    await page.goto(`/play-3d?cp=${account.planet}#shop`)
    const frame = page.frameLocator('#live-original')
    await frame.locator('#commerce-shop').waitFor()
    assert.ok(
        (await frame.locator('.commerce-intro').allTextContents())
            .join(' ')
            .includes('Folgeaufträge'),
    )
    const csrf = await page
        .locator('meta[name=csrf-token]')
        .getAttribute('content')
    const post = (path, data) =>
        context.request.post(path, {
            headers: { Accept: 'application/json' },
            data: { _token: csrf, ...data },
        })
    const snapshot = async () =>
        (
            await context.request.get(`/play-3d/state?planet=${account.planet}`)
        ).json()
    const order = async (action, id) =>
        assert.equal(
            (
                await post('/play-3d/command', {
                    planet: account.planet,
                    action,
                    technologyId: id,
                    amount: 1,
                })
            ).status(),
            200,
        )
    const start = await snapshot(),
        level = Number(start.objects.find((o) => o.key === 'metal_mine').amount)
    for (let i = 0; i < 3; i++) await order('build', 1)
    const buy = page.waitForResponse(
        (r) =>
            r.url().includes('/shop/purchase') &&
            r.request().method() === 'POST',
    )
    await frame
        .locator('[data-product=kraken_gold] button[type=submit]')
        .click()
    assert.equal((await buy).status(), 200)
    await frame
        .locator('.commerce-message')
        .filter({ hasText: 'Kauf abgeschlossen' })
        .waitFor()
    await page.locator('[data-nav-action=inventory]').click()
    await frame
        .locator('#commerce-inventory [data-product=kraken_gold]')
        .waitFor()
    await page.screenshot({
        path: `${artifacts}/inventory-queue-credit.png`,
        fullPage: true,
    })
    const activation = page.waitForResponse(
        (r) =>
            r.url().includes('/shop/activate') &&
            r.request().method() === 'POST',
    )
    await frame.locator('[data-product=kraken_gold] button').click()
    assert.equal((await activation).status(), 200)
    await frame
        .locator('.commerce-message')
        .filter({ hasText: 'Gegenstand aktiviert' })
        .waitFor()
    let state = await snapshot()
    assert.equal(
        Number(state.objects.find((o) => o.key === 'metal_mine').amount),
        level + 3,
    )
    assert.equal(
        state.activity.filter(
            (j) => j.kind === 'building' && j.planet === account.planet,
        ).length,
        0,
    )
    console.log(
        'PASS: actual inventory button completes all three queued buildings',
    )
    // Concurrent retries of one activation consume only one item and advance once.
    for (let i = 0; i < 3; i++) await order('build', 1)
    assert.equal(
        (
            await post('/shop/purchase', {
                product: 'kraken_gold',
                quantity: 2,
                expected_price: 7000,
                request_id: randomUUID(),
            })
        ).status(),
        200,
    )
    const same = {
        product: 'kraken_gold',
        planet: account.planet,
        request_id: randomUUID(),
    }
    const retries = await Promise.all(
        Array.from({ length: 4 }, () => post('/shop/activate', same)),
    )
    assert.deepEqual(
        retries.map((r) => r.status()),
        [200, 200, 200, 200],
    )
    state = await snapshot()
    assert.equal(
        Number(state.objects.find((o) => o.key === 'metal_mine').amount),
        level + 6,
    )
    const inventory = await (
        await context.request.get(
            `/shop?ui=live3d&inventory=1&cp=${account.planet}`,
        )
    ).text()
    assert.match(
        inventory,
        /data-product="kraken_gold"[\s\S]*?<strong>1<\/strong>/,
    )
    console.log(
        'PASS: four concurrent activation retries consume exactly one KRAKEN',
    )
    // Distinct requests cannot consume more stock or time than was purchased.
    await order('research', 113)
    assert.equal(
        (
            await post('/shop/purchase', {
                product: 'newtron_bronze',
                quantity: 2,
                expected_price: 700,
                request_id: randomUUID(),
            })
        ).status(),
        200,
    )
    const before = await snapshot(),
        research = before.activity.find(
            (j) => j.kind === 'research' && j.active,
        ),
        oldEnd = before.serverTime + research.remaining
    assert.ok(research.remaining > 3600)
    const replies = await Promise.all(
        Array.from({ length: 4 }, () =>
            post('/shop/activate', {
                product: 'newtron_bronze',
                planet: account.planet,
                request_id: randomUUID(),
            }),
        ),
    )
    assert.deepEqual(
        replies.map((r) => r.status()).sort(),
        [200, 200, 422, 422],
    )
    const after = await snapshot(),
        updated = after.activity.find(
            (j) => j.kind === 'research' && j.id === research.id,
        )
    assert.equal(after.serverTime + updated.remaining, oldEnd - 3600)
    assert.deepEqual(errors, [])
    console.log(
        'PASS: four concurrent distinct activations consume two NEWTRONs and exactly one hour',
    )
} finally {
    await browser.close()
}
