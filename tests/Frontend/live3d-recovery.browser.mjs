import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url),
    { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const account = JSON.parse(
    await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8'),
);
const artifacts = process.env.ARTIFACT_DIR || '/tmp/ogamex-recovery';
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
    for (const scenario of ['no-gpu', 'missing-module']) {
        const context = await browser.newContext({
            baseURL: process.env.LIVE_BASE_URL || 'http://127.0.0.1',
            viewport: { width: 1440, height: 1000 },
            reducedMotion: 'reduce',
        });
        const login = await context.request.get('/login'),
            token = (await login.text()).match(
                /name="csrf-token" content="([^"]+)"/,
            )[1];
        const signed = await context.request.post('/login', {
            form: {
                email: account.email,
                password: account.password,
                _token: token,
            },
            maxRedirects: 0,
        });
        assert.ok([302, 303].includes(signed.status()));
        if (scenario === 'no-gpu')
            await context.addInitScript(() => {
                const original = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = function (
                    kind,
                    ...args
                ) {
                    return /webgl/.test(kind)
                        ? null
                        : original.call(this, kind, ...args);
                };
            });
        else
            await context.route('**/build/assets/scene-*.js', (route) =>
                route.abort(),
            );
        const page = await context.newPage(),
            errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto('/play-3d#planet');
        await page.waitForFunction(
            () =>
                document.querySelector('#scene')?.dataset.renderer ===
                    'software' &&
                Number(document.querySelector('#scene').dataset.frames) > 0,
            {},
            { timeout: 30000 },
        );
        assert.equal(
            await page.locator('#prototype').getAttribute('data-ready'),
            'true',
        );
        const initial = await page
            .locator('#scene canvas')
            .evaluate((c) => c.toDataURL());
        await page.locator('#live-zoom-in').click();
        await page.waitForFunction(
            (before) =>
                document.querySelector('#scene canvas').toDataURL() !== before,
            initial,
            { timeout: 10000 },
        );
        assert.ok(
            (await page
                .locator('#scene canvas')
                .evaluate((c) => c.toDataURL())) !== initial,
            'Zoom must change the rendered bitmap',
        );
        assert.ok(
            await page
                .locator('#scene canvas')
                .evaluate(
                    (c) =>
                        c
                            .getContext('2d')
                            .getImageData(
                                Math.floor(c.width / 2),
                                Math.floor(c.height / 2),
                                1,
                                1,
                            ).data[3] > 0,
                ),
        );
        await page.screenshot({
            path: `${artifacts}/${scenario}.png`,
            fullPage: true,
        });
        await page.locator('.main-nav [data-live-page="ships"]').click();
        await page.locator('[data-object="light_fighter"]').click();
        assert.ok(await page.locator('#live-quantity').isVisible());
        assert.deepEqual(errors, []);
        await context.close();
        console.log(
            `PASS ${scenario}: interactive CPU geometry, changed zoom pixels, game catalog stays usable, no uncaught errors`,
        );
    }
} finally {
    await browser.close();
}
