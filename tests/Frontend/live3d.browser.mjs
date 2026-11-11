import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const account = JSON.parse(
    await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8'),
);
const base = process.env.LIVE_BASE_URL || 'http://127.0.0.1';
const artifacts = process.env.ARTIFACT_DIR || '/tmp/ogamex-live';
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: [
        '--no-sandbox',
        '--enable-unsafe-swiftshader',
        '--use-gl=angle',
        '--use-angle=swiftshader',
    ],
});
try {
    const context = await browser.newContext({
        baseURL: base,
        viewport: { width: 1440, height: 1000 },
        reducedMotion: 'reduce',
    });
    const login = await context.request.get('/login'),
        html = await login.text();
    const token = html.match(/name="csrf-token" content="([^"]+)"/)[1];
    const signed = await context.request.post('/login', {
        form: {
            email: account.email,
            password: account.password,
            _token: token,
        },
        maxRedirects: 0,
    });
    assert.ok([302, 303].includes(signed.status()));
    const page = await context.newPage(),
        errors = [];
    page.setDefaultTimeout(60000);
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/play-3d#planet');
    await page.waitForSelector('#prototype[data-ready="true"]');
    assert.equal(
        await page
            .locator('[data-advance-time],#reset-all,#reset-demo')
            .count(),
        0,
    );
    assert.equal(await page.locator('canvas').count(), 1);
    assert.equal(
        await page.locator('#scene').getAttribute('data-units'),
        await page
            .locator('#live-bootstrap')
            .evaluate((n) =>
                String(JSON.parse(n.textContent).initial.shipTotal),
            ),
    );
    await page.screenshot({
        path: `${artifacts}/live-planet.png`,
        fullPage: true,
    });
    async function nav(name) {
        await page.locator(`[data-live-page="${name}"]`).click();
        await page.waitForFunction(
            (name) =>
                document.querySelector('#live-heading').textContent ===
                JSON.parse(
                    document.querySelector('#live-bootstrap').textContent,
                ).t[name],
            name,
        );
    }
    async function cancel(kind) {
        page.once('dialog', (d) => d.accept());
        await page.locator(`[data-queue="${kind}"] button`).first().click();
        await page.waitForFunction(
            (kind) =>
                document.querySelectorAll(`[data-queue="${kind}"]`).length ===
                0,
            kind,
        );
    }
    await nav('buildings');
    await page.locator('[data-object="metal_mine"]').click();
    await page.locator('#live-start').click();
    await page.locator('[data-queue="building"]').waitFor();
    await cancel('building');
    await nav('research');
    assert.ok((await page.locator('[data-object]').count()) > 6);
    await page.locator('[data-object="energy_technology"]').click();
    await page.locator('#live-start').click();
    await page.locator('[data-queue="research"]').waitFor();
    await page.screenshot({
        path: `${artifacts}/live-research.png`,
        fullPage: true,
    });
    await cancel('research');
    await nav('ships');
    assert.ok((await page.locator('[data-object]').count()) > 3);
    await page.locator('[data-object="light_fighter"]').click();
    await page.locator('#live-quantity').fill('3');
    await page.locator('#live-start').click();
    await page.locator('[data-queue="unit"]').first().waitFor();
    assert.match(
        await page.locator('[data-queue="unit"]').first().textContent(),
        /3/,
    );
    const first = await page.locator('#live-planet').inputValue(),
        options = await page
            .locator('#live-planet option')
            .evaluateAll((nodes) => nodes.map((n) => n.value));
    if (options.length > 1) {
        await page
            .locator('#live-planet')
            .selectOption(options.find((x) => x !== first));
        await page.waitForFunction(
            (first) => document.querySelector('#live-planet').value !== first,
            first,
        );
        await page.locator('#live-refresh').click();
        await page.locator('#live-planet').selectOption(first);
        await page.locator('[data-queue="unit"]').first().waitFor();
    }
    for (const name of ['fleets', 'galaxy', 'messages']) {
        await nav(name);
        await page.waitForFunction(() => {
            const f = document.querySelector('#live-original');
            return (
                f.contentDocument?.readyState === 'complete' &&
                f.contentWindow.location.pathname !== 'about:blank'
            );
        });
        await page.waitForFunction(
            (name) =>
                document
                    .querySelector('#live-original')
                    .contentWindow.location.pathname.startsWith(
                        {
                            fleets: '/fleet',
                            galaxy: '/galaxy',
                            messages: '/messages',
                        }[name],
                    ),
            name,
        );
        assert.ok(await page.locator('#live-original').getAttribute('src'));
        await page.screenshot({
            path: `${artifacts}/live-${name}.png`,
            fullPage: true,
        });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const name of [
        'planet',
        'buildings',
        'research',
        'ships',
        'fleets',
        'galaxy',
        'messages',
    ]) {
        await nav(name);
        assert.equal(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
            name,
        );
    }
    await nav('ships');
    await page.screenshot({
        path: `${artifacts}/live-mobile-ships.png`,
        fullPage: true,
    });
    // The original authenticated queues persist across a full page reload.
    await page.reload();
    await page.waitForSelector('#prototype[data-ready="true"]');
    await page.locator('[data-queue="unit"]').first().waitFor();
    assert.deepEqual(errors, []);
    console.log(
        'PASS real Laravel login, live planet state, building/research creation and cancellation, paid ship queue, planet context, complete original fleet/galaxy/message views, seven mobile sections and persistent server queues',
    );
    await context.close();
} finally {
    await browser.close();
}
