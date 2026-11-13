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
    await page.goto('/play-3d#admin');
    await page.waitForSelector('#prototype[data-ready="true"]');
    assert.equal(await page.locator('#live-page-admin').isVisible(), true);
    const bootstrap = await page
        .locator('#live-bootstrap')
        .evaluate((n) => JSON.parse(n.textContent));
    assert.equal(bootstrap.isAdmin, true);
    const target = bootstrap.initial.planet.id;
    const before = (
        await (
            await context.request.get(`/play-3d/state?planet=${target}`)
        ).json()
    ).resources.metal.amount;
    async function saved(click) {
        const response = page.waitForResponse(
            (r) =>
                r.url().endsWith('/play-3d/admin/command') &&
                r.request().method() === 'POST',
        );
        await click();
        assert.equal((await response).status(), 200);
        await page.waitForFunction(
            () =>
                !document.querySelector(
                    '#live-admin-resources button[type="submit"]',
                ).disabled,
        );
    }
    await saved(() =>
        page.locator('#live-admin-resources button[type="submit"]').click(),
    );
    let snapshot = await (
        await context.request.get(`/play-3d/state?planet=${target}`)
    ).json();
    assert.ok(snapshot.resources.metal.amount >= before + 10000000);
    await page.screenshot({
        path: `${artifacts}/admin-test-tools.png`,
        fullPage: true,
    });
    await page.locator('#live-admin-object').selectOption('1');
    await page.locator('#live-admin-amount').fill('7');
    page.once('dialog', (dialog) => dialog.accept());
    await saved(() =>
        page.locator('#live-admin-objects button[type="submit"]').click(),
    );
    snapshot = await (
        await context.request.get(`/play-3d/state?planet=${target}`)
    ).json();
    assert.equal(
        snapshot.objects.find((o) => o.key === 'metal_mine').amount,
        '7',
    );
    const previousCruisers = BigInt(
        snapshot.objects.find((o) => o.key === 'cruiser').amount,
    );
    await page.locator('#live-admin-kind').selectOption('ship');
    await page.locator('#live-admin-object').selectOption('206');
    await page.locator('#live-admin-amount').fill('1000000');
    page.once('dialog', (dialog) => dialog.accept());
    await saved(() =>
        page.locator('#live-admin-objects button[type="submit"]').click(),
    );
    snapshot = await (
        await context.request.get(`/play-3d/state?planet=${target}`)
    ).json();
    assert.equal(
        snapshot.objects.find((o) => o.key === 'cruiser').amount,
        String(previousCruisers + 1000000n),
    );
    for (const [tab, path] of [
        ['settings', '/admin/server-settings'],
        ['security', '/admin/server-administration'],
        ['rules', '/admin/rules'],
        ['timing', '/admin/fleet-timing'],
        ['tools', '/admin/developer-shortcuts'],
    ]) {
        await page.locator(`[data-admin-tab="${tab}"]`).click();
        await page.waitForFunction((path) => {
            const f = document.querySelector('#live-admin-frame');
            return (
                f.contentDocument?.readyState === 'complete' &&
                f.contentWindow.location.pathname === path &&
                !!f.contentDocument.querySelector('style:last-child')
            );
        }, path);
        if (tab === 'settings') {
            const frame = page.frameLocator('#live-admin-frame');
            assert.ok(
                (await frame.locator('form input,form select').count()) > 40,
            );
            assert.equal(
                await frame.locator('form [name="cp"]').first().inputValue(),
                String(target),
            );
            assert.ok(await frame.locator('form [name="_token"]').count());
            await page.screenshot({
                path: `${artifacts}/admin-universe.png`,
                fullPage: true,
            });
        }
    }
    await page.locator('.main-nav [data-live-page="planet"]').click();
    await page.waitForFunction(
        () => Number(document.querySelector('#scene').dataset.frames) > 0,
    );
    assert.ok(
        Number(await page.locator('#scene').getAttribute('data-buildings')) >=
            4,
    );
    assert.ok(
        Number(await page.locator('#scene').getAttribute('data-ships')) > 0,
    );
    await page.waitForFunction(
        () => document.querySelector('#scene').dataset.texture === 'atlas',
    );
    await page.screenshot({
        path: `${artifacts}/colony-and-cruisers.png`,
        fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.main-nav [data-live-page="admin"]').click();
    await page.locator('[data-admin-tab="test"]').click();
    assert.equal(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
    );
    await page.screenshot({
        path: `${artifacts}/admin-mobile.png`,
        fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
        'PASS admin original resource grant and object paths persist, million cruisers visible, five original admin areas retain forms/CSRF/planet binding, mobile workspace',
    );
    await context.close();
} finally {
    await browser.close();
}
