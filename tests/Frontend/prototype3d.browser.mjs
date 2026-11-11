// Real Chromium/WebGL regression test for the four-workspace UI and offline ZIP.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const artifacts = process.env.ARTIFACT_DIR || '/tmp/ogamex-3d-browser';
const standalone = process.env.PROTOTYPE_HTML
    ? await readFile(process.env.PROTOTYPE_HTML, 'utf8')
    : null;
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: [
        '--no-sandbox',
        '--enable-unsafe-swiftshader',
        '--use-gl=angle',
        '--use-angle=swiftshader',
    ],
});
try {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: 'reduce',
    });
    page.setDefaultTimeout(90000);
    const errors = [],
        network = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (r) => {
        if (/^https?:/.test(r.url())) network.push(r.url());
    });
    const text = (selector) => page.locator(selector).textContent();
    const units = (value) =>
        page.waitForFunction(
            (value) =>
                document.querySelector('#scene').dataset.units ===
                    String(value) &&
                !document.querySelector('#prototype').dataset.building,
            value,
        );
    const level = (value) =>
        page.waitForFunction(
            (value) =>
                document.querySelector('.detail-level').textContent ===
                    `${value} / 8` &&
                !document.querySelector('#prototype').dataset.building,
            value,
        );
    const progress = () =>
        page.waitForFunction(
            () => document.querySelector('#build-progress')?.value > 0.05,
        );
    const settle = () =>
        page.waitForFunction(
            () => document.querySelector('#scene').dataset.camera === 'idle',
        );
    async function load(hash = 'planet') {
        if (standalone) {
            await page.context().setOffline(true);
            await page.goto(`about:blank#${hash}`);
            await page.setContent(standalone);
        } else
            await page.goto(
                `${process.env.PROTOTYPE_BASE_URL || 'http://127.0.0.1'}/prototype-3d#${hash}`,
            );
        await page.waitForSelector('#prototype[data-ready="true"]');
        await page.waitForFunction(
            (hash) =>
                document.querySelector('#prototype').dataset.page === hash,
            hash,
        );
    }
    async function nav(name) {
        await page.locator(`[data-page-link="${name}"]`).click();
        await page.waitForFunction(
            (name) =>
                document.querySelector('#prototype').dataset.page === name,
            name,
        );
        assert.equal(
            await page
                .locator(`[data-page-link="${name}"]`)
                .getAttribute('aria-current'),
            'page',
        );
        assert.equal(await page.locator('.page:visible').count(), 1);
    }
    async function preview(name, open) {
        const button = page.locator(`[data-preview="${name}"]`);
        if (((await button.getAttribute('aria-expanded')) === 'true') !== open)
            await button.click();
        await page.waitForFunction(
            (open) =>
                document.querySelector('#scene').dataset.rendering ===
                (open ? 'active' : 'paused'),
            open,
        );
    }
    async function queue(type, quantity) {
        await page.locator('#ship-type').selectOption(type);
        await page.locator('#ship-quantity').fill(String(quantity));
        await page.locator('#build-ship').click();
    }
    await load();
    await settle();
    assert.equal(await page.locator('.main-nav a').count(), 4);
    assert.equal(await page.locator('canvas').count(), 1);
    assert.equal(await page.locator('#ship-quantity').isVisible(), false);
    assert.equal(await page.locator('#building-list').isVisible(), false);
    await page.screenshot({ path: `${artifacts}/planet.png`, fullPage: true });
    const canvas = page.locator('canvas');
    await canvas.evaluate((node) => (node.dataset.identity = 'original'));
    const label = await page
        .locator('.building-label')
        .filter({ hasText: 'Kristallmine' })
        .boundingBox();
    await page.mouse.click(
        label.x + label.width / 2,
        label.y + label.height + 28,
    );
    await page.waitForFunction(
        () => document.querySelector('#prototype').dataset.page === 'buildings',
    );
    assert.equal(await text('#building-info h3'), 'Kristallmine');
    assert.equal(
        await page
            .locator('[data-preview="buildings"]')
            .getAttribute('aria-expanded'),
        'true',
    );
    await settle();
    assert.ok((await canvas.boundingBox()).height <= 300);
    await preview('buildings', false);
    assert.equal(await canvas.isVisible(), false);
    await nav('planet');
    assert.equal(await page.locator('#scene').getAttribute('data-focus'), '');
    await nav('buildings');
    await page.locator('#building-search').fill('Kristall');
    assert.equal(await page.locator('.building-item').count(), 1);
    await page.locator('#building-search').fill('xyz');
    assert.equal(await page.locator('#empty-buildings').isVisible(), true);
    await page.locator('#clear-building-filter').click();
    await page.locator('#building-category').selectOption('storage');
    assert.equal(await page.locator('.building-item').count(), 1);
    await page.locator('#clear-building-filter').click();
    await page.locator('[data-building="crystal"]').click();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('#upgrade-building').click();
    await progress();
    assert.equal(await text('.detail-level'), '3 / 8');
    await nav('ships');
    assert.equal(await page.locator('#cancel-operation').isVisible(), true);
    await level(4);
    assert.equal(
        await page.locator('#prototype').getAttribute('data-page'),
        'ships',
        'Completion must not navigate away',
    );
    assert.equal(await text('#fields-used'), '21 / 32');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('#ship-type').selectOption('smallCargo');
    await page.locator('#ship-quantity').fill('12345');
    await nav('buildings');
    await page.locator('#building-search').fill('Kristall');
    await nav('fleets');
    await nav('ships');
    assert.equal(await page.locator('#ship-quantity').inputValue(), '12345');
    assert.equal(await page.locator('#ship-type').inputValue(), 'smallCargo');
    await nav('buildings');
    assert.equal(
        await page.locator('#building-search').inputValue(),
        'Kristall',
    );
    await page.locator('#clear-building-filter').click();
    await page.screenshot({
        path: `${artifacts}/buildings.png`,
        fullPage: true,
    });
    await nav('fleets');
    assert.equal(await canvas.isVisible(), false);
    assert.equal(await page.locator('.fleet-table tbody tr').count(), 3);
    await page.locator('#load-fleet-preset').click();
    await units(1100000);
    assert.equal(await page.locator('#scene').getAttribute('data-ships'), '12');
    await page.screenshot({ path: `${artifacts}/fleets.png`, fullPage: true });
    await page.locator('[data-ship="ship-lightFighter"]').click();
    assert.match(await text('#formation-count'), /750.000/);
    await preview('fleets', true);
    await settle();
    assert.ok((await canvas.boundingBox()).height <= 300);
    await page.screenshot({
        path: `${artifacts}/fleet-preview.png`,
        fullPage: true,
    });
    await preview('fleets', false);
    await nav('planet');
    await page.waitForFunction(
        () => document.querySelector('#scene').dataset.rendering === 'active',
    );
    assert.ok((await canvas.boundingBox()).height > 400);
    assert.equal(await canvas.getAttribute('data-identity'), 'original');
    assert.equal(await page.locator('canvas').count(), 1);
    await nav('ships');
    await page.locator('#ship-quantity').fill('0');
    assert.equal(await page.locator('#build-ship').isDisabled(), true);
    await queue('lightFighter', 10000);
    await queue('smallCargo', 5000);
    assert.match(await text('#pending-total'), /15.000/);
    await preview('ships', true);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('#start-ship-order').click();
    await progress();
    assert.equal(
        await page.locator('#scene').getAttribute('data-units'),
        '1100000',
    );
    assert.equal(await page.locator('#build-progress').count(), 1);
    await page.screenshot({ path: `${artifacts}/ships.png`, fullPage: true });
    await nav('fleets'); // Navigation is view-only; the running quantity order continues.
    await units(1110000);
    assert.equal(
        await page.locator('#prototype').getAttribute('data-page'),
        'fleets',
    );
    await nav('ships');
    await preview('ships', false);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('#start-ship-order').click();
    await units(1115000);
    assert.equal(
        await page
            .locator('[data-ship="ship-lightFighter"]')
            .getAttribute('aria-pressed'),
        'true',
    );
    assert.match(await text('#pending-total'), /: 0$/);
    await queue('probe', 2000);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('#start-ship-order').click();
    await progress();
    await page.locator('#cancel-operation').click();
    assert.match(await text('#pending-total'), /2.000/);
    await units(1115000);
    await page.locator('.order-row button').click();
    assert.match(await text('#pending-total'), /: 0$/);
    await queue('probe', 77);
    await page.locator('#start-ship-order').click();
    await progress();
    await page.locator('#planet-select').selectOption('small');
    await page.waitForFunction(
        () => document.querySelector('#scene').dataset.planet === 'small',
    );
    assert.equal(
        await page.locator('#prototype').getAttribute('data-page'),
        'ships',
    );
    await units(3);
    await page.locator('#planet-select').selectOption('medium');
    await page.waitForFunction(
        () => document.querySelector('#scene').dataset.planet === 'medium',
    );
    await units(1115000);
    assert.match(await text('#pending-total'), /77/);
    await page.locator('#reset-demo').click();
    await units(3);
    assert.match(await text('#pending-total'), /: 0$/);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('#planet-select').selectOption('small');
    await units(3);
    await nav('buildings');
    await page.locator('[data-building="metal"]').click();
    await page.locator('#upgrade-building').click();
    await level(5);
    assert.equal(await text('#fields-used'), '16 / 16');
    assert.equal(await page.locator('#upgrade-building').isDisabled(), true);
    await page.locator('#toggle-build').click();
    await page.locator('#build-type').selectOption('terraformer');
    assert.equal(await page.locator('#build-facility').isDisabled(), true);
    await page.locator('#build-type').selectOption('laser');
    await page.locator('#build-facility').click();
    await level(1);
    assert.equal(await text('#fields-used'), '16 / 16');
    await page.locator('#reset-demo').click();
    await level(4);
    await page.locator('#toggle-build').click();
    await page.locator('#build-type').selectOption('terraformer');
    await page.locator('#build-facility').click();
    await level(1);
    assert.equal(await text('#fields-used'), '16 / 21');
    console.log(
        'PASS navigation, direct 3D selection, filters, persistent form values, previews, uninterrupted navigation during construction, explicit interruption, field limits and Terraformer',
    );
    // Offline deep links, browser history and phone layouts.
    await load('ships');
    assert.equal(await canvas.isVisible(), false);
    await nav('fleets');
    await page.goBack();
    await page.waitForFunction(
        () => document.querySelector('#prototype').dataset.page === 'ships',
    );
    await page.goForward();
    await page.waitForFunction(
        () => document.querySelector('#prototype').dataset.page === 'fleets',
    );
    await page.setViewportSize({ width: 390, height: 844 });
    for (const name of ['planet', 'buildings', 'ships', 'fleets']) {
        await nav(name);
        assert.equal(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
            name,
        );
        const navBox = await page.locator('.main-nav').boundingBox();
        assert.ok(navBox.y + navBox.height <= 845);
        if (name !== 'planet') assert.equal(await canvas.isVisible(), false);
        await page.screenshot({
            path: `${artifacts}/mobile-${name}.png`,
            fullPage: true,
        });
    }
    await nav('ships');
    await preview('ships', true);
    await preview('ships', false);
    assert.equal(await page.locator('canvas').count(), 1);
    await page.evaluate(() => (location.hash = '#unknown'));
    await page.waitForFunction(
        () => document.querySelector('#prototype').dataset.page === 'planet',
    );
    assert.deepEqual(errors, []);
    if (standalone)
        assert.deepEqual(network, [], 'Offline ZIP makes no HTTP requests');
    console.log(
        'PASS 1.1-million fleet and bounded models, per-planet queues/reset, mobile workspaces, single canvas, hidden renderer pause, deep links/back/forward, invalid routes, reduced motion; no page errors',
    );
} finally {
    await browser.close();
}
