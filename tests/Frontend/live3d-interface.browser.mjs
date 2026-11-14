import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const account = JSON.parse(await readFile(process.env.LIVE_ACCOUNT_FILE, 'utf8'));
const artifacts = process.env.ARTIFACT_DIR || '/tmp/ogamex-interface';
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
try {
    const context = await browser.newContext({baseURL: process.env.LIVE_BASE_URL || 'http://127.0.0.1', viewport: {width:1440,height:1000}, reducedMotion:'reduce'});
    const login = await context.request.get('/login');
    const token = (await login.text()).match(/name="csrf-token" content="([^"]+)"/)[1];
    const signed = await context.request.post('/login', { form: {email:account.email,password:account.password,_token:token},maxRedirects:0 });
    assert.ok([302,303].includes(signed.status()));
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(45000);
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/play-3d');
    await page.waitForSelector('#prototype[data-ready=true]');
    assert.equal(await page.locator('.resource-dark-matter').count(),1);
    assert.equal(await page.locator('.nav-help,.nav-banner').count(),0);
    assert.equal(await page.locator('[data-nav-action]').count(),7);
    const frame = page.frameLocator('#live-original');
    async function nav(area, path) {
        await page.locator(`.main-nav [data-live-page="${area}"]`).click();
        await page.waitForFunction(path=>{const f=document.querySelector('#live-original');return f.contentDocument?.readyState==='complete' && f.contentWindow.location.pathname===path && f.dataset.areaReady===path},path);
        assert.equal(await frame.locator('#top').isVisible(),false);
        const raw = await frame.locator('body').innerText();
        assert.equal(/t_ingame\.|t_resources\.|t_merchant\.|t_buddies\./.test(raw),false, `${area}: missing translations`);
    }
    for (const [area,path] of [['alliance','/alliance'],['messages','/messages'],['notes','/play-3d/notes'],['buddies','/buddies'],['options','/options'],['officers','/premium'],['shop','/shop'],['merchant','/merchant'],['highscore','/highscore'],['fleets','/fleet']]) {
        await nav(area,path);
        if (['officers','shop'].includes(area)) assert.equal(await page.locator('#live-original-capability').isVisible(),false);
        await page.screenshot({path:`${artifacts}/${area}.png`,fullPage:true});
    }
    // Original technology data is a full page, not a generic navigation description.
    await page.locator('[data-nav-action=technology]').click();
    await frame.locator('.live-tech-tabs').waitFor();
    assert.match(await frame.locator('body').innerText(),/Metallmine/);
    // Notes execute the original AJAX creation, then survive a fresh page load.
    const noteSubject = `UI Notiz ${Date.now() % 1000000}`;
    await nav('notes','/play-3d/notes');
    await frame.locator('#newNote').click();
    await frame.locator('[name="noticeSubject"]').fill(noteSubject);
    await frame.locator('[name="noticeText"]').fill('Gespeichert über die neue Oberfläche.');
    const saved = page.waitForResponse(r=>r.url().includes('/ajax/notes/create') && r.request().method()==='POST');
    await frame.locator('[name="noticeSubmit"]').click();
    assert.equal((await saved).status(),200);
    await frame.locator('#noteList').getByText(noteSubject,{exact:true}).waitFor();
    await page.reload();
    await page.waitForFunction(()=>document.querySelector('#live-original').dataset.areaReady==='/play-3d/notes');
    await frame.locator('#noteList').getByText(noteSubject,{exact:true}).waitFor();
    // The server provides colonisation availability; navigation never dispatches a fleet.
    await page.locator('.main-nav .nav-entry [data-live-page="galaxy"]').click();
    await page.locator('.galaxy-row[data-position="15"]').waitFor();
    const colonise = page.locator('.galaxy-row button:not(:disabled)').filter({hasText:'Kolonisieren'}).first();
    const colonisePosition = await colonise.evaluate(button => button.closest('.galaxy-row').dataset.position);
    assert.equal(await colonise.count(),1);
    await colonise.click();
    await page.waitForFunction(()=>{const f=document.querySelector('#live-original');return f.dataset.areaReady==='/fleet' && f.contentWindow.location.search.includes('mission=7')});
    assert.equal(await page.locator('#live-original').evaluate(f=>String(f.contentWindow.fleetDispatcher.targetPlanet.position)),colonisePosition);
    assert.equal(await page.locator('#live-original').evaluate(f=>String(f.contentWindow.fleetDispatcher.targetPlanet.galaxy)),await page.locator('#live-galaxy-number').inputValue());
    // A real native transport uses the original ship selector, target checker and dispatch.
    const bootstrap = await page.locator('#live-bootstrap').evaluate(n=>JSON.parse(n.textContent));
    const destination = bootstrap.initial.planets.find(p=>p.id !== bootstrap.initial.planet.id);
    assert.ok(destination, 'This isolated browser fixture needs a second owned planet');
    await nav('options','/options');
    await nav('fleets','/fleet');
    await frame.locator('#technologies [data-technology="202"] input').fill('1');
    await frame.locator('#technologies [data-technology="202"] input').press('Tab');
    await frame.locator('#continueToFleet2:not(.off)').click();
    await frame.locator('input#galaxy').waitFor({state:'visible'});
    const [g,sy,pos] = destination.coordinates.split(':');
    for (const [id,value] of [['galaxy',g],['system',sy],['position',pos]]) {
        await frame.locator(`input#${id}`).fill(value);
        await frame.locator(`input#${id}`).press('Tab');
    }
    const actualTarget = await page.locator('#live-original').evaluate(f=>f.contentWindow.fleetDispatcher.targetPlanet);
    assert.deepEqual([actualTarget.galaxy,actualTarget.system,actualTarget.position].map(String),[g,sy,pos]);
    await frame.locator('#missionButton3:not(.off)').waitFor();
    await frame.locator('#missionButton3').click();
    for (const [id,value] of [['metal','100'],['crystal','0'],['deuterium','0']]) {
        await frame.locator(`input#${id}`).fill(value);
        await frame.locator(`input#${id}`).press('Tab');
    }
    const dispatched = page.waitForResponse(r=>r.url().includes('/ajax/fleet/dispatch/send-fleet') && r.request().method()==='POST');
    await frame.locator('#sendFleet:not(.off)').click();
    assert.equal((await dispatched).status(),200);
    const sentState = await (await context.request.get(`/play-3d/state?planet=${bootstrap.initial.planet.id}`)).json();
    assert.ok(sentState.fleetSlots.used > 0, 'Original dispatch must create a server fleet');
    await page.locator('#live-area-tabs button').filter({hasText:'Flottenbewegungen'}).click();
    await frame.locator('#movement a.recallFleet').first().waitFor();
    await page.screenshot({path:`${artifacts}/native-fleet-movement.png`,fullPage:true});
    const recalled = page.waitForResponse(r=>r.url().includes('/ajax/fleet/dispatch/recall-fleet') && r.request().method()==='POST');
    await frame.locator('#movement a.recallFleet').first().click();
    assert.equal((await recalled).status(),200);
    // Construction preview is driven by a real paid order and does not mutate state locally.
    await page.locator('.main-nav [data-live-page="buildings"]').click();
    await page.locator('[data-object="metal_mine"]').click();
    await page.locator('#live-start').click();
    await page.waitForFunction(()=>document.querySelector('.object-artwork')?.dataset.building==='true');
    await page.waitForFunction(()=>Number(document.querySelector('.object-artwork').dataset.progress)>0);
    await page.screenshot({path:`${artifacts}/construction-animation.png`,fullPage:true});
    await page.locator('.main-nav .nav-entry [data-live-page="research"]').click();
    await page.locator('[data-object="energy_technology"]').click();
    assert.equal(await page.locator('.object-artwork').getAttribute('data-building'),'false');
    await page.locator('.main-nav .nav-entry [data-live-page="buildings"]').click();
    await page.locator('[data-object="metal_mine"]').click();
    page.once('dialog',d=>d.accept());
    await page.locator('[data-queue="building"] button').first().click();
    await page.waitForFunction(()=>document.querySelectorAll('[data-queue="building"]').length===0);
    await page.locator('.main-nav .nav-entry [data-live-page="ships"]').click();
    await page.locator('[data-object="light_fighter"]').click();
    await page.locator('#live-quantity').fill('1');
    await page.locator('#live-start').click();
    await page.waitForFunction(()=>document.querySelector('.object-artwork')?.dataset.building==='true');
    await page.screenshot({path:`${artifacts}/ship-production-animation.png`,fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await nav('options','/options');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
    assert.equal(await page.locator('.main-nav').evaluate(n=>n.scrollHeight<=n.clientHeight+2),true, 'Mobile navigation grows with the document');
    await page.screenshot({path:`${artifacts}/mobile-options.png`,fullPage:true});
    assert.deepEqual(errors,[]);
    console.log('PASS ten original areas in German, functional premium areas, original technology page, persistent native notes, colonisation target handoff, real native transport and recall, server-driven construction preview, mobile document flow');
} finally { await browser.close(); }
