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
    await page.waitForFunction(
        () => Number(document.querySelector('#scene').dataset.frames) > 0,
    );
    assert.equal(
        await page.locator('#scene').getAttribute('data-renderer'),
        'webgl',
    );
    assert.equal(
        await page.locator('#live-overview-mode').getAttribute('aria-pressed'),
        'true',
    );
    assert.ok(
        Number(await page.locator('#scene').getAttribute('data-buildings')) >=
            4,
    );
    await page.waitForFunction(
        () => document.querySelector('#scene').dataset.texture === 'atlas',
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
        await page
            .locator(
                `.main-nav [data-live-page="${name}"]:not(.nav-galaxy-card)`,
            )
            .click();
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
    for (const name of ['fleets', 'messages', 'alliance']) {
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
                            alliance: '/alliance',
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
    await nav('galaxy');
    await page.locator('.galaxy-row[data-position="15"]').waitFor();
    assert.equal(await page.locator('#live-page-original').isVisible(), false);
    const firstSystem = Number(
        await page.locator('#live-system-number').inputValue(),
    );
    if (firstSystem < 499) {
        await page.locator('#live-system-next').click();
        await page.waitForFunction(
            (value) =>
                Number(document.querySelector('#live-system-number').value) ===
                value,
            firstSystem + 1,
        );
    }
    await page.locator('#live-system-number').fill('42');
    await page.waitForFunction(() =>
        document
            .querySelector('#live-galaxy-status')
            .textContent.startsWith('[1:42]'),
    );
    assert.equal(
        await page.locator('#live-galaxy-form button[type="submit"]').count(),
        0,
    );
    await page.locator('#live-system-home').click();
    await page.waitForFunction(
        (value) =>
            Number(document.querySelector('#live-system-number').value) ===
            value,
        firstSystem,
    );
    await page.screenshot({
        path: `${artifacts}/live-galaxy.png`,
        fullPage: true,
    });
    await nav('ships');
    await page.locator('[data-object="light_fighter"]').click();
    assert.match(
        await page.locator('[data-object="light_fighter"]').textContent(),
        /in Produktion/,
    );
    await page.locator('#live-quantity').fill('12');
    await page.locator('#live-refresh').click();
    await page.waitForTimeout(750);
    assert.equal(await page.locator('#live-quantity').inputValue(), '12');
    // Background snapshots preserve focused input, not just its value.
    await page.locator('#live-quantity').focus();
    await page.waitForTimeout(5500);
    assert.equal(await page.locator('#live-quantity').inputValue(), '12');
    assert.equal(
        await page
            .locator('#live-quantity')
            .evaluate((n) => n === document.activeElement),
        true,
    );
    await nav('planet');
    assert.ok(await page.locator('#live-dock .dock-order').count());
    await page.screenshot({
        path: `${artifacts}/live-command-overview.png`,
        fullPage: true,
    });
    await page.evaluate(() =>
        document
            .querySelector('#scene canvas')
            .getContext('webgl2')
            .getExtension('WEBGL_lose_context')
            .loseContext(),
    );
    await page.waitForFunction(
        () =>
            document.querySelector('#scene').dataset.renderer === 'software' &&
            Number(document.querySelector('#scene').dataset.frames) > 0,
    );
    await page.locator('#live-colony').click();
    await page.locator('#live-orbit').click();
    const pixelsBefore = await page
        .locator('#scene canvas')
        .evaluate((c) => c.toDataURL());
    await page.locator('#live-zoom-in').click();
    await page.waitForTimeout(250);
    assert.notEqual(
        await page.locator('#scene canvas').evaluate((c) => c.toDataURL()),
        pixelsBefore,
    );
    await page.screenshot({
        path: `${artifacts}/live-software-recovery.png`,
        fullPage: true,
    });
    await page.locator('#live-scene-retry').click();
    await page.waitForFunction(
        () =>
            document.querySelector('#scene').dataset.renderer === 'webgl' &&
            Number(document.querySelector('#scene').dataset.frames) > 0 &&
            document.querySelector('#live-scene-recovery').hidden,
    );
    await page.evaluate(() => {
        dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
        dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });
    await page.waitForTimeout(250);
    assert.equal(await page.locator('#scene canvas').count(), 1);
    await nav('defense');
    await page.locator('[data-object="rocket_launcher"]').click();
    assert.ok(await page.locator('#live-quantity').count());
    await page.setViewportSize({ width: 390, height: 844 });
    for (const name of [
        'planet',
        'buildings',
        'research',
        'ships',
        'fleets',
        'galaxy',
        'defense',
        'alliance',
        'messages',
    ]) {
        await nav(name);
        if (
            await page.evaluate(
                () => document.documentElement.scrollWidth > innerWidth,
            )
        ) {
            await page.screenshot({
                path: `${artifacts}/overflow-${name}.png`,
                fullPage: true,
            });
            console.log(
                'Overflow',
                name,
                await page.evaluate(() =>
                    [...document.querySelectorAll('body *')]
                        .filter(
                            (n) =>
                                n.getBoundingClientRect().right >
                                innerWidth + 1,
                        )
                        .slice(0, 20)
                        .map((n) => [
                            n.tagName,
                            n.id,
                            n.className,
                            n.getBoundingClientRect().right,
                        ]),
                ),
            );
        }
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
        'PASS real Laravel login, live planet state, building/research creation and cancellation, paid ship queue, planet context, original fleet/message views, native galaxy navigation, dashboard queues and preserved quantity input, nine mobile sections and persistent server queues',
    );
    await context.close();
} finally {
    await browser.close();
}
