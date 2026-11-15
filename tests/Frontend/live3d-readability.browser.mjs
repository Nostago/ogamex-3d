import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, mkdir } from 'node:fs/promises'
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
    account = JSON.parse(await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8')),
    fixture = JSON.parse(await readFile(process.env.FIXTURE_FILE, 'utf8')),
    artifacts = process.env.ARTIFACT_DIR || '/tmp/ogamex-readability'
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
        errors = []
    page.setDefaultTimeout(40000)
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('dialog', (dialog) => dialog.accept())
    await page.goto(`/play-3d?cp=${account.planet}#planet`)
    await page.locator('.system-map-node').first().waitFor()
    // A real colony ship is checked and launched, rather than only testing a pre-filled planner.
    let chosen
    for (const node of await page
        .locator('.system-map-node[data-occupied=false]')
        .all()) {
        const position = Number(await node.getAttribute('data-map-position'))
        if (position < 4 || position > 12) continue
        await node.click()
        const colony = page.locator(
            '#system-map-details [data-mission="7"]:enabled',
        )
        if (await colony.count()) {
            chosen = position
            await colony.click()
            break
        }
        await page.keyboard.press('Escape')
    }
    assert.ok(chosen)
    await page
        .locator('#quick-fleet-dialog[open] [data-quick-ship="208"]')
        .waitFor()
    const quote = page.waitForResponse(
            (response) =>
                new URL(response.url()).pathname === '/play-3d/fleet/preview',
        ),
        dispatch = page.waitForResponse(
            (response) =>
                new URL(response.url()).pathname === '/play-3d/fleet/send',
        )
    await page.locator('#quick-fleet-send').click()
    const preview = await (await quote).json()
    assert.equal(preview.orders['7'], true)
    assert.equal(
        (preview.errors || []).some((error) =>
            /Kolonieschiff|colony ship/i.test(error.message),
        ),
        false,
    )
    assert.equal((await (await dispatch).json()).success, true)
    await page.locator('#quick-fleet-close:enabled').waitFor()
    await page.locator('#quick-fleet-close').click()
    const radar = await (
            await context.request.get(
                `/play-3d/system-map?planet=${account.planet}`,
            )
        ).json(),
        flight = radar.fleets
            .filter((item) => item.own && item.mission === 7 && !item.returning)
            .sort((a, b) => b.id - a.id)[0]
    assert.ok(flight)
    const marker = page.locator(
        `.system-fleet-contact[data-fleet-id="${flight.id}"]`,
    )
    await marker.hover()
    await page
        .locator('#fleet-radar-tooltip:not([hidden]) .duration-parts')
        .waitFor()
    assert.equal(
        await page.locator('#fleet-radar-tooltip .duration-part').count(),
        4,
    )
    const timerStyles = await page
        .locator('#fleet-radar-tooltip .duration-part')
        .evaluateAll((parts) =>
            parts.map((part) => ({
                label: part.firstElementChild.textContent,
                border: getComputedStyle(part).borderLeftColor,
            })),
        )
    assert.deepEqual(
        timerStyles.map((item) => item.label),
        ['Tage', 'Stunden', 'Minuten', 'Sekunden'],
    )
    assert.equal(new Set(timerStyles.map((item) => item.border)).size, 4)
    await page.screenshot({
        path: `${artifacts}/colony-and-separated-countdown.png`,
        fullPage: true,
    })
    await page.keyboard.press('Escape')
    assert.equal(
        (
            await (
                await context.request.post('/play-3d/fleet/recall', {
                    data: {
                        _token: await page
                            .locator('meta[name="csrf-token"]')
                            .getAttribute('content'),
                        fleet_mission_id: flight.id,
                    },
                })
            ).json()
        ).success,
        true,
    )
    // No elevated terrain mesh: the actual live renderer uses sphere-conforming building geometry.
    await page.locator('#live-colony').click()
    await page.waitForSelector('#scene[data-renderer=webgl][data-frames]')
    assert.equal(
        await page.locator('#scene').getAttribute('data-ground-surface'),
        'sphere',
    )
    assert.equal(
        await page.locator('#scene').getAttribute('data-transport'),
        'parcels',
    )
    for (let i = 0; i < 3; i++) await page.locator('#live-zoom-in').click()
    await page.screenshot({
        path: `${artifacts}/spherical-colony-orange-cargo.png`,
        fullPage: true,
    })
    const frame = page.frameLocator('#live-original')
    async function navigate(name, path) {
        await page.evaluate((value) => (location.hash = '#' + value), name)
        await page.waitForFunction((path) => {
            const frame = document.querySelector('#live-original')
            return (
                frame.dataset.ready === 'true' &&
                frame.dataset.areaReady === path
            )
        }, path)
    }
    await navigate('options', '/options')
    await page.locator('#live-ui-text-scale').fill('130')
    assert.equal(
        await frame
            .locator('html')
            .evaluate((node) => node.style.getPropertyValue('--ui-text-scale')),
        '1.3',
    )
    await page.reload()
    await page.waitForSelector('#live-original[data-ready=true]')
    assert.equal(await page.locator('#live-ui-text-scale').inputValue(), '130')
    await navigate('production', '/resources/settings')
    const percentage = frame.locator(
        '#resourcesettingscomponent select[name=last1]',
    )
    for (const value of ['9', '10']) {
        await percentage.selectOption(value)
        const stored = page.waitForResponse(
            (response) =>
                new URL(response.url()).pathname === '/resources/settings' &&
                response.request().method() === 'POST',
        )
        await frame
            .locator('#resourcesettingscomponent input[type=submit]')
            .click()
        assert.ok([200, 302, 303].includes((await stored).status()))
        await page.waitForFunction((value) => {
            const element = document.querySelector('#live-original'),
                input =
                    element.contentDocument.querySelector('select[name=last1]')
            return element.dataset.ready === 'true' && input?.value === value
        }, value)
    }
    const cells = await frame
        .locator('#resourcesettingscomponent td')
        .evaluateAll((cells) =>
            cells
                .slice(0, 15)
                .map((cell) => parseFloat(getComputedStyle(cell).fontSize)),
        )
    assert.ok(cells.length > 0 && cells.every((size) => size >= 22))
    await page.screenshot({
        path: `${artifacts}/large-production.png`,
        fullPage: true,
    })
    await navigate('technology', '/play-3d/technology')
    assert.equal(await frame.locator('.live-tech-tabs').count(), 1)
    assert.equal(await frame.locator('.ui-dialog').count(), 0)
    await frame
        .locator('.live-tech-tabs a')
        .filter({ hasText: 'Technikbaum' })
        .click()
    await frame.locator('.live-requirement-list').waitFor()
    await frame.locator('#live-tech-object').selectOption('214')
    await frame.locator('.live-tech-requirements').waitFor()
    assert.ok(await frame.locator('.requirement-missing').count())
    await page.screenshot({
        path: `${artifacts}/clear-technology-requirements.png`,
        fullPage: true,
    })
    await frame
        .locator('.live-tech-tabs a')
        .filter({ hasText: 'Technische Daten' })
        .click()
    await frame.locator('.live-tech-data').waitFor()
    assert.equal(await frame.locator('.ui-dialog').count(), 0)
    await navigate('notes', '/play-3d/notes')
    await frame.locator('#newNote').click()
    await frame
        .locator('#createNote input[name=noticeSubject]')
        .fill('Lesbarkeitstest')
    await frame
        .locator('#createNote textarea')
        .fill(
            'Die vollständige Notiz ist sichtbar und der Speichern-Button erreichbar.',
        )
    const save = frame.locator('#createNote input[name=noticeSubmit]')
    await page.waitForFunction(() => {
        const doc = document.querySelector('#live-original').contentDocument,
            node = doc.querySelector('#createNote input[name=noticeSubmit]')
        return (
            node &&
            node.getBoundingClientRect().bottom <= doc.defaultView.innerHeight
        )
    })
    await page.screenshot({
        path: `${artifacts}/complete-note-dialog.png`,
        fullPage: true,
    })
    const saved = page.waitForResponse(
        (response) =>
            new URL(response.url()).pathname === '/ajax/notes/create' &&
            response.request().method() === 'POST',
    )
    await save.click()
    assert.equal((await saved).status(), 200)
    await frame
        .locator('#noteList')
        .filter({ hasText: 'Lesbarkeitstest' })
        .waitFor()
    await navigate('rewards', '/rewards')
    await frame.locator('.live-reward-card').last().waitFor()
    assert.equal(await frame.locator('.live-reward-card').count(), 7)
    await frame.locator('.live-reward-card img').last().scrollIntoViewIfNeeded()
    await frame
        .locator('.live-reward-card img')
        .last()
        .evaluate((image) => image.decode())
    assert.ok(
        await frame
            .locator('.live-reward-card img')
            .evaluateAll((images) =>
                images.every(
                    (image) => image.complete && image.naturalWidth > 0,
                ),
            ),
    )
    assert.equal(
        (await frame.locator('#live-rewards').innerText()).includes(
            'Lieutenant Cupid',
        ),
        false,
    )
    assert.ok(
        (await frame.locator('#live-rewards').innerText()).includes(
            'Belohnungen',
        ),
    )
    await page.screenshot({
        path: `${artifacts}/german-reward-artwork.png`,
        fullPage: true,
    })
    await navigate('messages', '/messages')
    await frame.locator('#tabs-nfCommunication a').click()
    await frame.locator('#subtabs-nfCommunication14 a').click()
    const accept = frame.locator(
            `.acceptRequest[data-buddyid="${fixture.accept}"]`,
        ),
        decline = frame.locator(
            `.rejectRequest[data-buddyid="${fixture.decline}"]`,
        )
    await accept.waitFor()
    await decline.waitFor()
    assert.ok((await accept.innerText()).includes('Annehmen'))
    assert.ok((await decline.innerText()).includes('Ablehnen'))
    assert.ok(
        await accept.evaluate(
            (button) => button.getBoundingClientRect().width >= 150,
        ),
    )
    await page.screenshot({
        path: `${artifacts}/clear-buddy-actions.png`,
        fullPage: true,
    })
    await accept.click()
    await accept.waitFor({ state: 'hidden' })
    await decline.click()
    await decline.waitFor({ state: 'hidden' })
    await page.evaluate(() => (location.hash = '#fleets'))
    await page.waitForSelector('#live-page-fleets:not([hidden])')
    assert.ok(
        await page
            .locator('#fleet-slots')
            .evaluate(
                (node) => parseFloat(getComputedStyle(node).fontSize) >= 22,
            ),
    )
    await page.screenshot({
        path: `${artifacts}/large-fleet-interface.png`,
        fullPage: true,
    })
    await page.evaluate(() => (location.hash = '#options'))
    await page.locator('#live-ui-text-reset').click()
    assert.equal(await page.locator('#live-ui-text-scale').inputValue(), '100')
    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(
        await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
    )
    assert.deepEqual(errors, [])
    console.log(
        'PASS: actual colony dispatch, segmented flight time, spherical colony and cargo, persistent readable UI, large production/fleets, clear technology, full note save, German reward artwork and accepting/rejecting friendship requests',
    )
    await context.close()
} finally {
    await browser.close()
}
