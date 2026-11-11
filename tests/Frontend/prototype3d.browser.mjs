import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const standalone = process.env.PROTOTYPE_HTML
    ? await readFile(process.env.PROTOTYPE_HTML, 'utf8')
    : null;
const artifacts = process.env.ARTIFACT_DIR || '/tmp/ogamex-3d-browser';
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
    const text = (s) => page.locator(s).textContent();
    const units = (n) =>
        page.waitForFunction(
            (n) =>
                document.querySelector('#scene').dataset.units === String(n) &&
                !document.querySelector('#prototype').dataset.building,
            n,
        );
    const progress = () =>
        page.waitForFunction(
            () => document.querySelector('#build-progress')?.value > 0.05,
        );
    const level = (n) =>
        page.waitForFunction(
            (n) =>
                document.querySelector('.detail-level').textContent ===
                    `${n} / 8` &&
                !document.querySelector('#prototype').dataset.building,
            n,
        );
    async function nav(name) {
        await page.locator(`[data-page-link="${name}"]`).click();
        await page.waitForFunction(
            (name) =>
                document.querySelector('#prototype').dataset.page === name,
            name,
        );
        assert.equal(await page.locator('.page:visible').count(), 1);
    }
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
    async function queue(type, quantity) {
        await page.locator('#ship-type').selectOption(type);
        await page.locator('#ship-quantity').fill(String(quantity));
        await page.locator('#build-ship').click();
    }
    async function create(name, amounts) {
        await page.locator('#new-fleet').click();
        await page.locator('#fleet-name').fill(name);
        for (const [type, n] of Object.entries(amounts))
            await page.locator(`#fleet-quantity-${type}`).fill(String(n));
        await page.locator('#save-fleet').click();
    }
    const group = (id) => page.locator(`[data-fleet="${id}"]`);
    const stock = (type, key) =>
        page.locator(`#stock-${type} .stock-${key} strong`).textContent();
    await load();
    assert.equal(await page.locator('#orbit-view').textContent(), '◎ Orbit');
    await page.locator('#orbit-view').click();
    assert.equal(
        await page.locator('#prototype').getAttribute('data-page'),
        'planet',
    );
    assert.equal(
        await page.locator('#prototype').getAttribute('data-mode'),
        'orbit',
    );
    assert.equal(await page.locator('#planet-orbit-info').isVisible(), true);
    await page.screenshot({
        path: `${artifacts}/planet-orbit.png`,
        fullPage: true,
    });
    await nav('fleets');
    assert.equal(await page.locator('#new-fleet').isVisible(), true);
    await nav('planet');
    assert.equal(
        await page.locator('#prototype').getAttribute('data-mode'),
        'orbit',
    );
    await page.locator('#colony-view').click();
    assert.equal(
        await page.locator('#prototype').getAttribute('data-mode'),
        'colony',
    );
    await nav('buildings');
    assert.equal(
        await page
            .locator(
                '#building-search,#building-category,#clear-building-filter',
            )
            .count(),
        0,
    );
    assert.equal(await page.locator('.building-category').count(), 3);
    for (const name of ['Rohstoffe', 'Schiffe', 'Verteidigung'])
        assert.match(await text('#building-list'), new RegExp(name));
    assert.equal(await page.locator('.building-item').count(), 9);
    await page.screenshot({
        path: `${artifacts}/buildings.png`,
        fullPage: true,
    });
    await nav('ships');
    assert.equal(await page.locator('.ship-stock-card').count(), 3);
    assert.equal(await stock('lightFighter', 'ready'), '1');
    await page.locator('#load-fleet-preset').click();
    await units(1100000);
    assert.equal(await stock('lightFighter', 'ready'), '750.000');
    await queue('lightFighter', 3000);
    assert.equal(await stock('lightFighter', 'in_production'), '3.000');
    assert.equal(await stock('lightFighter', 'ready'), '750.000');
    await nav('fleets');
    await page.locator('#new-fleet').click();
    await page.locator('#fleet-name').fill('Zukunft');
    await page.locator('#fleet-quantity-lightFighter').fill('751000');
    assert.equal(await page.locator('#save-fleet').isDisabled(), true);
    assert.match(await text('#fleet-editor-error'), /nicht frei verfügbar/);
    await page.locator('.fleet-editor button[type="button"]').click();
    await nav('ships');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('#start-ship-order').click();
    await progress();
    await page.screenshot({
        path: `${artifacts}/ships-production.png`,
        fullPage: true,
    });
    assert.equal(await stock('lightFighter', 'in_production'), '3.000');
    await nav('buildings');
    await units(1103000);
    await nav('ships');
    assert.equal(await stock('lightFighter', 'ready'), '753.000');
    assert.equal(await stock('lightFighter', 'in_production'), '0');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await nav('fleets');
    await create('Alpha', { lightFighter: 10000, smallCargo: 200 });
    assert.equal(await page.locator('[data-fleet]').count(), 1);
    assert.match(
        await group('fleet-1').textContent(),
        /10.000 × Leichter Jäger/,
    );
    await group('fleet-1').locator('[data-action="edit"]').click();
    assert.equal(
        await page.locator('#fleet-quantity-lightFighter').inputValue(),
        '10000',
    );
    await page.locator('#fleet-name').fill('Alpha II');
    await page.locator('#fleet-quantity-lightFighter').fill('12000');
    await page.locator('#fleet-quantity-smallCargo').fill('0');
    await page.locator('#save-fleet').click();
    await create('Beta', { lightFighter: 5000 });
    assert.equal(await page.locator('[data-fleet]').count(), 2);
    await nav('ships');
    assert.equal(await stock('lightFighter', 'ready'), '753.000');
    assert.equal(await stock('lightFighter', 'available'), '736.000');
    assert.equal(await page.locator('#load-fleet-preset').isDisabled(), true);
    await nav('fleets');
    await group('fleet-1').locator('[data-action="mission"]').click();
    assert.equal(
        await group('fleet-1').locator('[data-action="edit"]').isDisabled(),
        true,
    );
    assert.equal(
        await group('fleet-1').locator('[data-action="disband"]').isDisabled(),
        true,
    );
    assert.match(await group('fleet-1').textContent(), /Auf Mission/);
    await page.screenshot({
        path: `${artifacts}/fleet-mission-lock.png`,
        fullPage: true,
    });
    await nav('ships');
    assert.equal(await stock('lightFighter', 'ready'), '741.000');
    assert.equal(await stock('lightFighter', 'on_mission'), '12.000');
    assert.equal(await stock('lightFighter', 'available'), '736.000');
    await nav('fleets');
    await group('fleet-1').locator('[data-action="mission"]').click();
    await group('fleet-1').locator('[data-action="disband"]').click();
    assert.equal(await page.locator('[data-fleet]').count(), 1);
    await nav('ships');
    assert.equal(await stock('lightFighter', 'available'), '748.000');
    await nav('fleets');
    await group('fleet-2').locator('[data-action="disband"]').click();
    await create('Wache', { probe: 1000 });
    await page.locator('#new-fleet').click();
    await page.locator('#fleet-name').fill('Entwurf');
    await page.locator('#fleet-quantity-lightFighter').fill('123');
    await nav('ships');
    await nav('fleets');
    assert.equal(await page.locator('#fleet-name').inputValue(), 'Entwurf');
    assert.equal(
        await page.locator('#fleet-quantity-lightFighter').inputValue(),
        '123',
    );
    await page.screenshot({
        path: `${artifacts}/fleet-editor.png`,
        fullPage: true,
    });
    await page.locator('#planet-select').selectOption('small');
    await units(3);
    assert.equal(await page.locator('[data-fleet]').count(), 0);
    await create('Kleine Wache', { lightFighter: 1 });
    await page.locator('#planet-select').selectOption('medium');
    await units(1103000);
    assert.equal(await page.locator('[data-fleet]').count(), 1);
    assert.match(await text('#fleet-management'), /Wache/);
    await page.locator('#reset-demo').click();
    await units(3);
    assert.equal(await page.locator('[data-fleet]').count(), 0);
    await page.locator('#planet-select').selectOption('small');
    await units(3);
    assert.equal(await page.locator('[data-fleet]').count(), 1);
    await page.locator('#reset-demo').click();
    await units(3);
    await nav('buildings');
    await page.locator('[data-building="metal"]').click();
    await page.locator('#upgrade-building').click();
    await level(5);
    assert.equal(await text('#fields-used'), '16 / 16');
    assert.equal(await page.locator('#upgrade-building').isDisabled(), true);
    await page.locator('#reset-demo').click();
    await level(4);
    await page.locator('#toggle-build').click();
    await page.locator('#build-type').selectOption('terraformer');
    await page.locator('#build-facility').click();
    await level(1);
    assert.equal(await text('#fields-used'), '16 / 21');
    console.log(
        'PASS local Planet/Orbit, three building overviews, live per-type completed/production/free counts, no use of pending ships, create/edit/disband, mission lock, reservation release, per-planet isolation/reset and existing fields',
    );
    await load('ships');
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
        await page.screenshot({
            path: `${artifacts}/mobile-${name}.png`,
            fullPage: true,
        });
    }
    await create('Mobilflotte', { lightFighter: 1 });
    assert.equal(await page.locator('[data-fleet]').count(), 1);
    await page.screenshot({
        path: `${artifacts}/mobile-fleet-created.png`,
        fullPage: true,
    });
    await nav('ships');
    assert.equal(await stock('lightFighter', 'available'), '0');
    assert.equal(await page.locator('canvas').count(), 1);
    assert.deepEqual(errors, []);
    if (standalone) assert.deepEqual(network, []);
    console.log(
        'PASS mobile sections and fleet editor, deep link, one shared canvas, no page errors and no offline HTTP requests',
    );
} finally {
    await browser.close();
}
