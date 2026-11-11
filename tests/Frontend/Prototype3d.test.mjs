import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createDemoProvider,
    planBuild,
    terraformerBonus,
} from '../../resources/js/prototype3d/data.js';
import { demoPlanets } from '../../resources/js/prototype3d/planets.js';
import {
    createLayout,
    surfacePosition,
} from '../../resources/js/prototype3d/layout.js';

const code = (expected) => (error) => error.code === expected;
test('demo profiles separate physical diameter, logical fields and visual locations', async () => {
    const p = createDemoProvider();
    const snapshots = [];
    for (const profile of demoPlanets) {
        const s = await p.selectPlanet(profile.id);
        snapshots.push(s);
        assert.ok(s.capacity.remaining >= 0);
        assert.equal(s.layout.length, profile.visualLimit);
        assert.equal(
            s.capacity.field_current,
            s.buildings
                .filter((b) => !['laser', 'rocket'].includes(b.type))
                .reduce((n, b) => n + b.level, 0),
        );
    }
    assert.equal(new Set(snapshots.map((s) => s.planet.diameter)).size, 3);
    assert.equal(new Set(snapshots.map((s) => s.planet.renderRadius)).size, 3);
    assert.equal(new Set(snapshots.map((s) => s.buildings.length)).size, 3);
    assert.equal((await p.selectPlanet('small')).capacity.remaining, 1);
});
test('every consuming level uses one field; defense never consumes one; full means rejection without mutation', async () => {
    const p = createDemoProvider();
    await p.selectPlanet('small');
    const full = await p.upgrade('metal');
    assert.equal(full.capacity.field_current, 16);
    assert.equal(full.capacity.remaining, 0);
    await assert.rejects(p.upgrade('crystal'), code('fields_full'));
    await assert.rejects(p.build('research'), code('fields_full'));
    await assert.rejects(p.build('terraformer'), code('fields_full'));
    assert.deepEqual(await p.load(), full);
    const defense = await p.build('laser');
    const instance = defense.buildings.find((b) => b.type === 'laser');
    const upgraded = await p.upgrade(instance.id);
    assert.deepEqual(upgraded.capacity, full.capacity);
});
test('Terraformer adds verified bonus, consumes a field first, and never enlarges the sphere', async () => {
    const p = createDemoProvider();
    const before = await p.selectPlanet('small');
    const built = await p.build('terraformer');
    assert.equal(built.capacity.field_current, 16);
    assert.equal(built.capacity.terraformer_bonus, 5);
    assert.equal(built.capacity.effective_max, 21);
    assert.equal(built.capacity.remaining, 5);
    const terra = built.buildings.find((b) => b.type === 'terraformer');
    const next = await p.upgrade(terra.id);
    assert.equal(next.capacity.field_current, 17);
    assert.equal(next.capacity.effective_max, 27);
    assert.equal(next.planet.diameter, before.planet.diameter);
    assert.equal(next.planet.renderRadius, before.planet.renderRadius);
    assert.equal(terraformerBonus(8), 44);
    const visual = next.buildings.map((b) => [b.id, b.siteId]);
    assert.deepEqual(
        visual,
        built.buildings.map((b) => [b.id, b.siteId]),
    );
});
test('automatic sites are deterministic, unique and stable through builds and upgrades', async () => {
    const a = createDemoProvider(),
        b = createDemoProvider();
    const initial = await a.load();
    const planned = planBuild(initial, 'crystalStorage');
    const built = await a.build('crystalStorage');
    const copy = await b.build('crystalStorage');
    assert.deepEqual(built, copy);
    assert.equal(built.buildings.at(-1).siteId, planned.siteId);
    assert.deepEqual(
        built.buildings.slice(0, initial.buildings.length).map((x) => x.siteId),
        initial.buildings.map((x) => x.siteId),
    );
    assert.equal(
        new Set(built.buildings.map((x) => x.siteId)).size,
        built.buildings.length,
    );
    const upgrade = await a.upgrade('metal');
    assert.deepEqual(
        upgrade.buildings.map((x) => x.siteId),
        built.buildings.map((x) => x.siteId),
    );
    built.layout[0].normal[0] = 999;
    assert.notEqual((await a.load()).layout[0].normal[0], 999);
});
test('switch preserves independent planets, current reset affects only that planet, errors are atomic', async () => {
    const p = createDemoProvider();
    const medium = await p.upgrade('metal');
    await p.selectPlanet('small');
    await p.upgrade('metal');
    await p.reset();
    assert.equal((await p.load()).capacity.remaining, 1);
    assert.deepEqual(await p.selectPlanet('medium'), medium);
    await assert.rejects(p.selectPlanet('unknown'), code('unknown_planet'));
    await assert.rejects(p.build('constructor'), code('unknown_type'));
    await assert.rejects(p.build('metal'), code('already_built'));
    await assert.rejects(p.upgrade('unknown'), code('unknown_building'));
    assert.deepEqual(await p.load(), medium);
    const independent = createDemoProvider();
    assert.equal((await independent.load()).buildings[0].level, 4);
});
test('visual rendering limit is independent from unused gameplay fields', async () => {
    const p = createDemoProvider();
    let s = await p.load();
    const remaining = s.capacity.remaining;
    while (s.buildings.length < s.layout.length) s = await p.build('rocket');
    assert.equal(s.capacity.remaining, remaining);
    assert.ok(remaining > 0);
    await assert.rejects(p.build('laser'), code('visual_full'));
    assert.deepEqual(await p.load(), s);
});
test('all planet layouts fit their spheres without overlapping footprints and contain no NaNs', () => {
    for (const profile of demoPlanets) {
        const sites = createLayout(profile.renderRadius, profile.visualLimit);
        assert.deepEqual(
            sites,
            createLayout(profile.renderRadius, profile.visualLimit),
        );
        for (let i = 0; i < sites.length; i++) {
            const point = surfacePosition(sites[i], profile.renderRadius);
            assert.ok(point.every(Number.isFinite));
            assert.ok(
                Math.abs(Math.hypot(...point) - profile.renderRadius) < 1e-8,
            );
            for (let j = i + 1; j < sites.length; j++) {
                const other = surfacePosition(sites[j], profile.renderRadius);
                assert.ok(
                    Math.hypot(...point.map((v, k) => v - other[k])) >=
                        3.4 - 1e-8,
                );
            }
        }
    }
});
test('demo level cap prevents additional mutations while leaving field and site state intact', async () => {
    const provider = createDemoProvider();
    await provider.selectPlanet('large');
    for (let level = 5; level <= 8; level++) {
        const state = await provider.upgrade('metal');
        assert.equal(
            state.buildings.find((item) => item.id === 'metal').level,
            level,
        );
    }
    const maximum = await provider.load();
    assert.deepEqual(await provider.upgrade('metal'), maximum);
    await assert.rejects(provider.build('terraformer'), code('already_built'));
    assert.deepEqual(await provider.load(), maximum);
});
