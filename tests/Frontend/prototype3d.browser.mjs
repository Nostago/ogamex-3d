// Optional browser smoke test. Install Playwright outside the project (see docs).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const artifacts = process.env.ARTIFACT_DIR || '/tmp/ogamex-3d-browser';
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${process.env.PROTOTYPE_BASE_URL || 'http://127.0.0.1'}/prototype-3d`);
    await page.waitForSelector('#prototype[data-ready="true"]');
    await page.waitForTimeout(800);
    const canvas = page.locator('canvas');
    assert.equal(await canvas.count(), 1);
    await page.screenshot({ path: `${artifacts}/colony.png` });
    // Select a visible crystal spire through raycasting, not the sidebar.
    const label = await page.locator('.building-label').filter({ hasText: 'Kristallmine' }).boundingBox();
    await page.mouse.click(label.x + label.width / 2, label.y + label.height + 95);
    assert.equal(await page.locator('#building-info h3').textContent(), 'Kristallmine');
    const beforeUpgrade = await canvas.screenshot();
    await page.locator('#upgrade-building').click();
    await page.waitForFunction(() => document.querySelector('.detail-level').textContent === '4 / 8');
    const afterUpgrade = await canvas.screenshot();
    assert.notDeepEqual(beforeUpgrade, afterUpgrade, 'Upgrade must change the rendered model');
    for (let index = 0; index < 4; index++) await page.locator('#upgrade-building').click();
    assert.equal(await page.locator('#upgrade-building').isDisabled(), true);
    await page.locator('#reset-demo').click();
    assert.equal(await page.locator('.detail-level').textContent(), '4 / 8');
    await page.locator('#orbit-view').click();
    assert.equal(await page.locator('#orbit-info').isVisible(), true);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${artifacts}/orbit.png` });
    await page.locator('#colony-view').click();
    const beforeDrag = await canvas.screenshot();
    await page.mouse.move(600, 550);
    await page.mouse.down();
    await page.mouse.move(790, 590, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(100);
    assert.notDeepEqual(beforeDrag, await canvas.screenshot(), 'Dragging must rotate the view');
    const beforeZoom = await canvas.screenshot();
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(100);
    assert.notDeepEqual(beforeZoom, await canvas.screenshot(), 'Wheel must zoom');
    assert.equal(await page.locator('#building-info h3').textContent(), 'Metallmine', 'Drag must not select');
    await page.locator('#reset-camera').click();
    await page.locator('#rotate').click();
    const beforeRotation = await canvas.screenshot();
    await page.waitForTimeout(500);
    assert.notDeepEqual(beforeRotation, await canvas.screenshot(), 'Automatic rotation must animate');
    await page.locator('#rotate').click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `${artifacts}/mobile.png`, fullPage: true });
    await page.locator('[data-building="deuterium"]').click();
    assert.equal(await page.locator('#building-info h3').textContent(), 'Deuterium-Synthesizer');
    await page.reload();
    await page.waitForSelector('#prototype[data-ready="true"]');
    assert.equal(await page.locator('.detail-level').textContent(), '4 / 8');
    assert.deepEqual(errors, []);
    console.log('PASS: WebGL, raycast selection, visible upgrade, level cap, reset, orbit, drag, zoom, rotation, mobile, reload; no page errors');
} finally { await browser.close(); }
