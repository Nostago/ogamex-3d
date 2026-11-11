// Optional real WebGL test, against Laravel or the standalone offline export.
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
        viewport: { width: 1280, height: 900 },
        reducedMotion: 'reduce',
    });
    page.setDefaultTimeout(90000);
    const errors = [],
        network = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
        if (/^https?:/.test(request.url())) network.push(request.url());
    });
    async function load() {
        if (standalone) {
            await page.context().setOffline(true);
            await page.goto('about:blank');
            await page.setContent(standalone);
        } else
            await page.goto(
                `${process.env.PROTOTYPE_BASE_URL || 'http://127.0.0.1'}/prototype-3d`,
            );
        await page.waitForSelector('#prototype[data-ready="true"]');
    }
    const text = (selector) => page.locator(selector).textContent();
    const settle = () =>
        page.waitForFunction(
            () => document.querySelector('#scene').dataset.camera === 'idle',
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
    async function planet(id, fields, count, radius) {
        await page.locator('#planet-select').selectOption(id);
        await page.waitForFunction(
            (id) => document.querySelector('#scene').dataset.planet === id,
            id,
        );
        assert.equal(await text('#fields-used'), fields);
        assert.equal(await page.locator('.building-item').count(), count);
        assert.equal(
            await page.locator('#scene').getAttribute('data-radius'),
            String(radius),
        );
        await settle();
    }
    async function build(type, count) {
        await page.locator('#toggle-build').click();
        assert.equal(
            await page.locator('#build-plot, #preview-plot').count(),
            0,
            'No manual placement UI',
        );
        await page.locator('#build-type').selectOption(type);
        await page.locator('#build-facility').click();
        await page.waitForFunction(
            (count) =>
                document.querySelectorAll('.building-item').length === count &&
                !document.querySelector('#prototype').dataset.building,
            count,
        );
    }
    await load();
    assert.equal(await text('#fields-used'), '20 / 32');
    assert.equal(await page.locator('canvas').count(), 1);
    await settle();
    await page.screenshot({ path: `${artifacts}/medium.png` });
    const label = await page
        .locator('.building-label')
        .filter({ hasText: 'Kristallmine' })
        .boundingBox();
    await page.mouse.click(
        label.x + label.width / 2,
        label.y + label.height + 40,
    );
    assert.equal(
        await text('#building-info h3'),
        'Kristallmine',
        'Buildings must be directly selectable by raycast',
    );
    await page.locator('#reset-camera').click();
    await settle();
    console.log('PASS initial WebGL, raycast, medium planet');
    await planet('large', '29 / 69', 13, 12);
    assert.equal(await text('#planet-diameter'), '22.000 km');
    await page.screenshot({ path: `${artifacts}/large.png` });
    await planet('small', '15 / 16', 6, 6);
    assert.equal(await text('#planet-diameter'), '9.000 km');
    await page.screenshot({ path: `${artifacts}/small.png` });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('[data-building="metal"]').click();
    await settle();
    await page.locator('#upgrade-building').click();
    await progress();
    assert.equal(
        await text('#fields-used'),
        '15 / 16',
        'No premature data commit',
    );
    assert.equal(await text('.detail-level'), '4 / 8');
    await page.screenshot({ path: `${artifacts}/construction.png` });
    await level(5);
    assert.equal(await text('#fields-used'), '16 / 16');
    assert.equal(await text('#fields-free'), '0');
    assert.equal(await page.locator('#upgrade-building').isDisabled(), true);
    await page.locator('#toggle-build').click();
    await page.locator('#build-type').selectOption('terraformer');
    assert.equal(await page.locator('#build-facility').isDisabled(), true);
    assert.match(await text('#build-limit'), /freie.*Feld/i);
    await page.locator('#toggle-build').click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await build('laser', 7);
    assert.equal(
        await text('#fields-used'),
        '16 / 16',
        'Defense has no field cost',
    );
    await page.locator('#upgrade-building').click();
    await level(2);
    assert.equal(await text('#fields-used'), '16 / 16');
    console.log(
        'PASS normal scaffold animation, delayed commit, full capacity, defense exception',
    );
    await page.locator('#reset-demo').click();
    await level(4);
    await build('terraformer', 7);
    assert.equal(await text('#fields-used'), '16 / 21');
    assert.equal(await text('#fields-free'), '5');
    assert.equal(await text('#planet-diameter'), '9.000 km');
    assert.equal(await page.locator('#scene').getAttribute('data-radius'), '6');
    assert.match(
        await page.locator('#scene').getAttribute('data-focus'),
        /^terraformer-site-/,
    );
    await page.locator('#upgrade-building').click();
    await level(2);
    assert.equal(await text('#fields-used'), '17 / 27');
    await page.screenshot({ path: `${artifacts}/terraformer.png` });
    await planet('medium', '20 / 32', 9, 8.5);
    await page.locator('#upgrade-building').click();
    await level(5);
    await planet('small', '17 / 27', 7, 6);
    await page.locator('#reset-demo').click();
    await level(4);
    await planet('medium', '21 / 32', 9, 8.5);
    await planet('small', '15 / 16', 6, 6);
    console.log(
        'PASS Terraformer, stable physical size, independent states and planet-only reset',
    );
    // Cancelling at all supported boundaries must not leak mutations to another planet.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('#toggle-build').click();
    await page.locator('#build-facility').click();
    await progress();
    await planet('medium', '21 / 32', 9, 8.5);
    await planet('small', '15 / 16', 6, 6);
    await page.locator('#upgrade-building').click();
    await progress();
    await page.locator('#orbit-view').click();
    assert.equal(
        await page.locator('#prototype').getAttribute('data-building'),
        null,
    );
    assert.equal(await page.locator('#orbit-info').isVisible(), true);
    await settle();
    await page.screenshot({ path: `${artifacts}/orbit.png` });
    await page.locator('#colony-view').click();
    await level(4);
    assert.equal(await text('#fields-used'), '15 / 16');
    await page.locator('#upgrade-building').click();
    await progress();
    await page.locator('#reset-demo').click();
    await level(4);
    assert.equal(await text('#fields-used'), '15 / 16');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('#reset-camera').click();
    await settle();
    assert.equal(await page.locator('#scene').getAttribute('data-focus'), '');
    console.log('PASS planet switch, orbit and reset cancel construction');
    const canvas = page.locator('canvas');
    const beforeDrag = await canvas.screenshot();
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
        box.x + box.width / 2 + 100,
        box.y + box.height / 2 + 35,
        { steps: 4 },
    );
    await page.mouse.up();
    assert.notDeepEqual(beforeDrag, await canvas.screenshot());
    const beforeZoom = await canvas.screenshot();
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(100);
    assert.notDeepEqual(beforeZoom, await canvas.screenshot());
    await page.locator('[data-building="solar"]').click();
    await settle();
    assert.equal(
        await page.locator('#scene').getAttribute('data-focus'),
        'solar',
    );
    // Reduced motion makes upgrades immediate and operating machinery static.
    await page.locator('#upgrade-building').click();
    await level(6);
    assert.equal(await page.locator('#build-progress').count(), 0);
    const still = await canvas.screenshot();
    await page.waitForTimeout(250);
    assert.deepEqual(still, await canvas.screenshot());
    await page.locator('#rotate').click();
    assert.equal(
        await page.locator('#rotate').getAttribute('aria-pressed'),
        'true',
    );
    await page.locator('[data-building="solar"]').click();
    assert.equal(
        await page.locator('#rotate').getAttribute('aria-pressed'),
        'false',
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#reset-camera').click();
    await settle();
    assert.equal(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
    );
    await page.screenshot({ path: `${artifacts}/mobile.png`, fullPage: true });
    await load();
    await level(4);
    assert.equal(await text('#fields-used'), '20 / 32');
    assert.deepEqual(errors, []);
    if (standalone)
        assert.deepEqual(network, [], 'Standalone must make no HTTP requests');
    console.log(
        'PASS drag, zoom, focus, rotation controls, reduced motion, mobile, reload; no page errors',
    );
} finally {
    await browser.close();
}
