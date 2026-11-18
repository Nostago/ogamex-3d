import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
    account = JSON.parse(await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8')),
    fixture = JSON.parse(
        await readFile('storage/app/shipgrant-ui-fixture.json', 'utf8'),
    ),
    artifacts = process.env.ARTIFACT_DIR || '/tmp/shipgrants'
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
        posts = []
    page.setDefaultTimeout(60000)
    page.on('pageerror', (error) => {
        errors.push(error.message)
        console.error(error.stack)
    })
    page.on('request', (request) => {
        if (
            request.method() === 'POST' &&
            new URL(request.url()).pathname === '/play-3d/admin/ship-grants'
        )
            posts.push(JSON.parse(request.postData()))
    })
    const worlds = async () => {
        const result = await context.request.get(
            `/play-3d/admin/ship-grants/players/${fixture.user}`,
        )
        assert.equal(result.status(), 200)
        return result.json()
    }
    const stock = (data, id) =>
        BigInt(
            data.worlds
                .find((world) => world.id === id)
                .ships.find((ship) => ship.id === 204).available,
        )
    const initial = await worlds(),
        before = stock(initial, fixture.world),
        moonBefore = stock(initial, fixture.moon)
    const ownBefore = await (
        await context.request.get(`/play-3d/state?planet=${account.planet}`)
    ).json()
    await page.goto(`/play-3d?cp=${account.planet}#admin`)
    const tab = page.locator('[data-admin-tab=shipGrants]')
    await tab.click()
    const submit = page.locator('#ship-grant-submit')
    assert.equal(await submit.isEnabled(), false)
    await page.locator('#ship-grant-query').fill('Ship-Replacement-UI')
    await page.locator('#ship-grant-search button').click()
    await page.locator(`[data-grant-player="${fixture.user}"]`).click()
    await page.locator('#ship-grant-world').selectOption(String(fixture.world))
    await page.locator('#ship-grant-ship').selectOption('204')
    await page.locator('#ship-grant-amount').fill('5')
    await page.locator('#ship-grant-reason').fill('UI replacement test')
    assert.match(
        await page.locator('#ship-grant-preview').textContent(),
        /Ship-Replacement-UI/,
    )
    assert.match(
        await page.locator('#live-admin-target').textContent(),
        /Ship-Replacement-UI/,
    )
    await page
        .locator('#live-admin-ship-grants')
        .screenshot({ path: `${artifacts}/grant-preview.png` })
    await submit.click()
    await page.locator('#ship-grant-new').waitFor()
    assert.equal(stock(await worlds(), fixture.world), before + 5n)
    assert.equal(stock(await worlds(), fixture.moon), moonBefore)
    const original = { ...posts[0] }
    const duplicate = await context.request.post('/play-3d/admin/ship-grants', {
        data: original,
    })
    assert.equal(duplicate.status(), 200)
    assert.equal((await duplicate.json()).replayed, true)
    assert.equal(stock(await worlds(), fixture.world), before + 5n)
    assert.equal(await submit.isEnabled(), false)
    await page
        .locator('#live-admin-ship-grants')
        .screenshot({ path: `${artifacts}/grant-receipt.png` })
    // A lost response is recovered with the same request ID, even across a page reload.
    await page.locator('#ship-grant-new').click()
    await page.locator('#ship-grant-amount').fill('1')
    await page.route(
        '**/play-3d/admin/ship-grants',
        async (route) => {
            await route.fetch()
            await route.abort('failed')
        },
        { times: 1 },
    )
    await submit.click()
    await page
        .getByRole('button', { name: 'Gutschrift erneut prüfen', exact: true })
        .waitFor()
    assert.equal(await page.locator('#ship-grant-amount').isDisabled(), true)
    const lostId = posts.at(-1).request_id
    await page.reload()
    await tab.click()
    await page
        .getByRole('button', { name: 'Gutschrift erneut prüfen', exact: true })
        .click()
    await page.locator('#ship-grant-new').waitFor()
    assert.equal(posts.at(-1).request_id, lostId)
    assert.equal(stock(await worlds(), fixture.world), before + 6n)
    // Select the recipient again after reload, then credit their moon.
    await page.locator('#ship-grant-new').click()
    await page.locator('#ship-grant-query').fill('Ship-Replacement-UI')
    await page.locator('#ship-grant-search button').click()
    await page.locator(`[data-grant-player="${fixture.user}"]`).click()
    await page.locator('#ship-grant-world').selectOption(String(fixture.moon))
    await page.locator('#ship-grant-ship').selectOption('204')
    await page.locator('#ship-grant-amount').fill('2')
    assert.match(
        await page.locator('#ship-grant-preview').textContent(),
        /Mond/,
    )
    await submit.click()
    await page.locator('#ship-grant-new').waitFor()
    assert.equal(stock(await worlds(), fixture.moon), moonBefore + 2n)
    // Real concurrent HTTP requests exercise the transaction, counter and persistent deduplication.
    const a = { ...original, request_id: crypto.randomUUID(), amount: 2 },
        b = { ...original, request_id: crypto.randomUUID(), amount: 3 }
    const replies = await Promise.all(
        [a, a, b].map((body) =>
            context.request.post('/play-3d/admin/ship-grants', { data: body }),
        ),
    )
    assert.equal(replies.filter((reply) => reply.status() === 201).length, 2)
    assert.equal(replies.filter((reply) => reply.status() === 200).length, 1)
    assert.equal(stock(await worlds(), fixture.world), before + 11n)
    const ownAfter = await (
        await context.request.get(`/play-3d/state?planet=${account.planet}`)
    ).json()
    assert.equal(
        ownAfter.objects.find((object) => object.id === 204).available,
        ownBefore.objects.find((object) => object.id === 204).available,
    )
    assert.equal(ownAfter.planet.id, ownBefore.planet.id)
    await page.setViewportSize({ width: 390, height: 844 })
    await page
        .locator('#live-admin-ship-grants')
        .screenshot({ path: `${artifacts}/grant-mobile.png` })
    assert.ok(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        'admin form must fit on mobile',
    )
    assert.deepEqual(errors, [])
    console.log(
        'PASS: foreign player/planet/moon selection, additive grant and history, unchanged admin inventory, duplicate protection, lost response across reload, real parallel credits, mobile, no JavaScript errors',
    )
} finally {
    await browser.close()
}
