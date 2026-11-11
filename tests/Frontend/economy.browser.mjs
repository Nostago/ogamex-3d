import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const html = await readFile(process.env.PROTOTYPE_HTML, 'utf8');
const artifacts = process.env.ARTIFACT_DIR || '/tmp/ogamex-economy';
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
        viewport: { width: 1440, height: 1000 },
        reducedMotion: 'reduce',
    });
    await context.setOffline(true);
    const errors = [],
        unexpected = [];
    await context.route('**/*', async (route) => {
        if (route.request().url().startsWith('https://ogamex-demo.invalid/'))
            await route.fulfill({
                status: 200,
                contentType: 'text/html',
                body: html,
            });
        else {
            unexpected.push(route.request().url());
            await route.abort();
        }
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.on('pageerror', (e) => errors.push(e.message));
    async function ready() {
        await page.waitForSelector('#prototype[data-ready="true"]');
    }
    async function nav(name) {
        await page.locator(`[data-page-link="${name}"]`).click();
        await page.waitForFunction(
            (name) =>
                document.querySelector('#prototype').dataset.page === name,
            name,
        );
    }
    async function hour() {
        await page.locator('[data-advance-time="3600"]').click();
    }
    async function tech(type) {
        await page.locator(`[data-start-research="${type}"]`).click();
        await hour();
    }
    async function queue(n) {
        await page.locator('#ship-quantity').fill(String(n));
        await page.locator('#build-ship').click();
    }
    const stock = () =>
        page.locator('#stock-lightFighter .stock-ready strong').textContent();
    await page.goto('https://ogamex-demo.invalid/#planet');
    await ready();
    assert.equal(
        await page.locator('#rate-metal').textContent(),
        'Metall: 253 / h',
    );
    assert.equal(
        await page.locator('#rate-crystal').textContent(),
        'Kristall: 95 / h',
    );
    assert.equal(
        await page.locator('#rate-deuterium').textContent(),
        'Deuterium: 31 / h',
    );
    assert.match(
        await page.locator('#save-status').textContent(),
        /gespeichert/,
    );
    await page.screenshot({
        path: `${artifacts}/economy-overview.png`,
        fullPage: true,
    });
    await nav('buildings');
    await page.locator('.building-item[data-building="metal"]').click();
    await page.locator('#upgrade-building').click();
    assert.equal(await page.locator('#upgrade-building').isDisabled(), true);
    assert.match(
        await page.locator('#economy-jobs').textContent(),
        /Gebäudeauftrag/,
    );
    await hour();
    assert.equal(await page.locator('.detail-level').textContent(), '5 / 8');
    await nav('ships');
    assert.equal(await page.locator('#build-ship').isDisabled(), true);
    await nav('research');
    assert.equal(
        await page.locator('[data-start-research="combustion"]').isDisabled(),
        true,
    );
    await tech('energyTech');
    await tech('combustion');
    assert.match(
        await page.locator('[data-research="combustion"]').textContent(),
        /Stufe: 1/,
    );
    await page.screenshot({
        path: `${artifacts}/research.png`,
        fullPage: true,
    });
    for (let i = 0; i < 5; i++) await hour();
    await nav('ships');
    await queue(1);
    await queue(1);
    assert.equal(await page.locator('[data-order]').count(), 2);
    await page.locator('#run-all-ship-orders').click();
    await hour();
    assert.equal(await stock(), '2');
    assert.equal(await page.locator('[data-order]').count(), 1);
    await page.locator('#pause-ship-orders').click();
    await page.screenshot({
        path: `${artifacts}/paused-ship-queue.png`,
        fullPage: true,
    });
    await page.reload();
    await ready();
    assert.equal(await stock(), '2');
    assert.match(await page.locator('#economy-jobs').textContent(), /pausiert/);
    await hour();
    assert.equal(await stock(), '2');
    await page.locator('#run-all-ship-orders').click();
    await hour();
    assert.equal(await stock(), '3');
    assert.equal(await page.locator('[data-order]').count(), 0);
    await nav('fleets');
    await page.locator('#new-fleet').click();
    await page.locator('#fleet-name').fill('Versorgung');
    await page.locator('#fleet-quantity-smallCargo').fill('1');
    await page.locator('#save-fleet').click();
    await nav('galaxy');
    await page.locator('[data-position="6"]').click();
    await page.locator('#galaxy-plan-transport').click();
    assert.equal(await page.locator('#transport-target').inputValue(), 'small');
    await page.locator('#cargo-metal').fill('100');
    await page.locator('#cargo-crystal').fill('50');
    await page.locator('#launch-transport').click();
    await page.locator('[data-advance-time="60"]').click();
    assert.match(
        await page.locator('.mission-card').textContent(),
        /Zurück am Ursprung/,
    );
    await nav('messages');
    await page.locator('#mail-tab-fleets').click();
    await page.locator('#mail-subtab-transport').click();
    assert.match(
        await page.locator('#message-center').textContent(),
        /Transport zugestellt/,
    );
    await page.locator('#planet-select').selectOption('small');
    await nav('research');
    assert.match(
        await page.locator('[data-research="energyTech"]').textContent(),
        /Stufe: 1/,
    );
    await page.reload();
    await ready();
    assert.equal(await page.locator('#planet-select').inputValue(), 'small');
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
        await page.screenshot({
            path: `${artifacts}/mobile-${name}.png`,
            fullPage: true,
        });
    }
    // Reset must also clear a selected facility that is absent in the seed colony.
    await page.locator('#planet-select').selectOption('medium');
    await hour();
    await hour();
    await nav('buildings');
    await page.locator('#toggle-build').click();
    await page.locator('#build-type').selectOption('crystalStorage');
    await page.locator('#build-facility').click();
    await hour();
    await page
        .locator('.building-item[data-building^="crystalStorage-"]')
        .click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('#reset-all').click();
    await nav('research');
    assert.match(
        await page.locator('[data-research="energyTech"]').textContent(),
        /Stufe: 0/,
    );
    await page.reload();
    await ready();
    assert.match(
        await page.locator('[data-research="energyTech"]').textContent(),
        /Stufe: 0/,
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(unexpected, []);
    await context.close();
    const memory = await browser.newContext({ reducedMotion: 'reduce' });
    await memory.setOffline(true);
    await memory.addInitScript(() =>
        Object.defineProperty(window, 'localStorage', {
            get() {
                throw new Error('blocked');
            },
        }),
    );
    await memory.route('**/*', (route) =>
        route.fulfill({ status: 200, contentType: 'text/html', body: html }),
    );
    const fallback = await memory.newPage();
    await fallback.goto('https://ogamex-demo.invalid/#planet');
    await fallback.waitForSelector('#prototype[data-ready="true"]');
    assert.match(
        await fallback.locator('#save-status').textContent(),
        /nur in dieser Sitzung/,
    );
    await memory.close();
    console.log(
        'PASS original production, paid timed construction, global research/unlocks, serial ship jobs, pause/reload/resume, transports/reports, seven mobile workspaces, persistent reset, storage fallback, offline with no external requests or errors',
    );
} finally {
    await browser.close();
}
