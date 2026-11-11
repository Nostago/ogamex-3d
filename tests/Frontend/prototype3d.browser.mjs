// Optional Chromium test; supports the Laravel route and the standalone offline export.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const artifacts = process.env.ARTIFACT_DIR || '/tmp/ogamex-3d-browser';
const standalone = process.env.PROTOTYPE_HTML ? await readFile(process.env.PROTOTYPE_HTML, 'utf8') : null;
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(90000);
    const errors = [], network = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
    async function load() {
        if (standalone) {
            await page.context().setOffline(true);
            await page.goto('about:blank');
            await page.setContent(standalone);
        } else {
            await page.goto(`${process.env.PROTOTYPE_BASE_URL || 'http://127.0.0.1'}/prototype-3d`);
        }
        await page.waitForSelector('#prototype[data-ready="true"]');
    }
    const settle = () => page.waitForFunction(() => document.querySelector('#scene').dataset.camera === 'idle');
    const level = value => page.waitForFunction(value => document.querySelector('.detail-level').textContent === `${value} / 8` && !document.querySelector('#prototype').dataset.building, value);
    const progress = () => page.waitForFunction(() => document.querySelector('#build-progress')?.value > 0.05);
    await load();
    const canvas = page.locator('canvas');
    assert.equal(await canvas.count(), 1);
    await page.screenshot({ path: `${artifacts}/colony.png` });
    const label = await page.locator('.building-label').filter({ hasText: 'Kristallmine' }).boundingBox();
    await page.mouse.click(label.x + label.width / 2, label.y + label.height + 95);
    assert.equal(await page.locator('#building-info h3').textContent(), 'Kristallmine');
    assert.equal(await page.locator('#scene').getAttribute('data-focus'), 'crystal');
    await settle();
    await page.screenshot({ path: `${artifacts}/focus.png` });
    const beforeUpgrade = await canvas.screenshot();
    await page.locator('#upgrade-building').click();
    await progress();
    assert.equal(await page.locator('.detail-level').textContent(), '3 / 8', 'Do not commit before construction finishes');
    assert.equal(await page.locator('#upgrade-building').isDisabled(), true);
    await page.screenshot({ path: `${artifacts}/construction.png` });
    await level(4);
    assert.notDeepEqual(beforeUpgrade, await canvas.screenshot());
    for (let next = 5; next <= 8; next++) {
        await page.locator('#upgrade-building').click();
        await level(next);
    }
    assert.equal(await page.locator('#upgrade-building').isDisabled(), true);
    await page.locator('#reset-demo').click();
    await level(4);
    await page.locator('#upgrade-building').click();
    await progress();
    await page.locator('#reset-demo').click();
    await page.waitForTimeout(2200);
    await level(4);
    assert.equal(await page.locator('#build-progress').count(), 0, 'Reset must cancel construction');
    await page.locator('#upgrade-building').click();
    await progress();
    await page.locator('#orbit-view').click();
    assert.equal(await page.locator('#orbit-info').isVisible(), true);
    await settle();
    assert.equal(await page.locator('#prototype').getAttribute('data-building'), null);
    await page.screenshot({ path: `${artifacts}/orbit.png` });
    await page.locator('#colony-view').click();
    await settle();
    await level(4);
    const beforeDrag = await canvas.screenshot();
    await page.mouse.move(600, 550);
    await page.mouse.down();
    await page.mouse.move(790, 590, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(100);
    assert.notDeepEqual(beforeDrag, await canvas.screenshot());
    const beforeZoom = await canvas.screenshot();
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(100);
    assert.notDeepEqual(beforeZoom, await canvas.screenshot());
    assert.equal(await page.locator('#building-info h3').textContent(), 'Metallmine');
    await page.locator('#reset-camera').click();
    await settle();
    assert.equal(await page.locator('#scene').getAttribute('data-focus'), '');
    await page.locator('#rotate').click();
    const beforeRotation = await canvas.screenshot();
    await page.waitForTimeout(500);
    assert.notDeepEqual(beforeRotation, await canvas.screenshot());
    await page.locator('[data-building="solar"]').click();
    assert.equal(await page.locator('#rotate').getAttribute('aria-pressed'), 'false');
    await settle();
    await page.locator('#reset-camera').click();
    await settle();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `${artifacts}/mobile.png`, fullPage: true });
    await page.locator('[data-building="deuterium"]').click();
    await settle();
    assert.equal(await page.locator('#scene').getAttribute('data-focus'), 'deuterium');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('[data-building="solar"]').click();
    await settle();
    await page.locator('#upgrade-building').click();
    await level(6);
    assert.equal(await page.locator('#build-progress').count(), 0);
    const still = await canvas.screenshot();
    await page.waitForTimeout(300);
    assert.deepEqual(still, await canvas.screenshot(), 'Reduced motion must stop operating animations');
    await load();
    await level(4);
    // Construct the new facilities on explicit free lots; keep this path fast and static.
    await page.locator('#toggle-build').click();
    await page.locator('#build-plot').selectOption('plot-06');
    await page.locator('#preview-plot').click();
    assert.equal(await page.locator('#scene').getAttribute('data-focus'), 'plot-06');
    await page.locator('#build-facility').click();
    await page.waitForFunction(() => document.querySelector('#structure-count').textContent === '05');
    assert.equal(await page.locator('#building-info h3').textContent(), 'Schiffswerft');
    const shipyardId = await page.locator('.building-item[aria-pressed="true"]').getAttribute('data-building');
    assert.equal(shipyardId, 'shipyard-plot-06');
    await page.locator('#upgrade-building').click();
    await level(2);
    for (const [index, type] of ['research', 'robotics', 'metalStorage', 'crystalStorage', 'deuteriumStorage', 'rocket', 'laser'].entries()) {
        await page.locator('#toggle-build').click();
        await page.locator('#build-type').selectOption(type);
        if (type !== 'rocket' && type !== 'laser') assert.equal(await page.locator('#build-type option[value="shipyard"]').count(), 0);
        await page.locator('#build-facility').click();
        await page.waitForFunction(count => document.querySelector('#structure-count').textContent === String(count).padStart(2, '0'), index + 6);
    }
    assert.equal(await page.locator('.building-item').count(), 12);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('#reset-camera').click();
    await settle();
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${artifacts}/expanded-colony.png` });
    await page.locator('#reset-demo').click();
    await page.waitForFunction(() => document.querySelector('#structure-count').textContent === '04');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('#toggle-build').click();
    await page.locator('#build-facility').click();
    await progress();
    await page.locator('#orbit-view').click();
    await page.waitForTimeout(2200);
    assert.equal(await page.locator('.building-item').count(), 4, 'Cancelling a new build must leave its lot free');
    await page.locator('#colony-view').click();
    await page.locator('#toggle-build').click();
    assert.equal(await page.locator('#build-plot option').count(), 12);
    assert.deepEqual(errors, []);
    if (standalone) assert.deepEqual(network, [], 'Offline export must make no HTTP requests');
    console.log('PASS: new facility construction, unique facilities, plot choice, upgrades, cancelled placement, colony reset, WebGL, raycast, camera focus/overview, animated construction, delayed commit, cancellation/reset, level cap, orbit, drag, zoom, rotation, mobile, reduced motion, reload; no page errors');
} finally { await browser.close(); }
