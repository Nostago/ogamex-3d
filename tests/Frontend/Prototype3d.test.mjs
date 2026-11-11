import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoProvider, buildingTypes } from '../../resources/js/prototype3d/data.js';

test('demo upgrades are isolated, capped, and return independent snapshots', async () => {
    const first = createDemoProvider();
    const second = createDemoProvider();
    const initial = await first.load();
    assert.deepEqual(initial.buildings.map(item => item.id), buildingTypes);
    let upgraded = await first.upgrade('metal');
    assert.equal(upgraded.buildings[0].level, initial.buildings[0].level + 1);
    assert.ok(upgraded.buildings[0].production > initial.buildings[0].production);
    assert.deepEqual(await second.load(), initial);
    initial.buildings[0].level = 99;
    assert.notEqual((await first.load()).buildings[0].level, 99);
    for (let i = 0; i < 12; i++) upgraded = await first.upgrade('metal');
    assert.equal(upgraded.buildings[0].level, 8);
    assert.deepEqual(await first.reset(), await second.load());
    await assert.rejects(first.upgrade('unknown'));
});

test('construction is atomic, validates plots and uniqueness, and resets the whole colony', async () => {
    const provider = createDemoProvider();
    const initial = await provider.load();
    assert.equal(initial.plots.length, 16);
    const site = initial.plots.find(plot => !plot.occupiedBy).id;
    await assert.rejects(provider.build('unknown', site));
    await assert.rejects(provider.build('constructor', site));
    await assert.rejects(provider.build('shipyard', 'missing'));
    await assert.rejects(provider.build('shipyard', initial.buildings[0].plotId));
    assert.deepEqual(await provider.load(), initial);
    const built = await provider.build('shipyard', site);
    const shipyard = built.buildings.find(item => item.type === 'shipyard');
    assert.equal(shipyard.level, 1);
    assert.equal(shipyard.production, 0);
    assert.equal(built.plots.find(plot => plot.id === site).occupiedBy, shipyard.id);
    const next = built.plots.find(plot => !plot.occupiedBy).id;
    await assert.rejects(provider.build('shipyard', next));
    const upgraded = await provider.upgrade(shipyard.id);
    assert.equal(upgraded.buildings.find(item => item.id === shipyard.id).level, 2);
    assert.equal(upgraded.buildings[0].level, initial.buildings[0].level);
    let state = upgraded;
    for (const plot of state.plots.filter(item => !item.occupiedBy)) state = await provider.build('rocket', plot.id);
    assert.equal(state.buildings.length, 16);
    assert.equal(new Set(state.buildings.map(item => item.id)).size, 16);
    assert.equal(state.plots.filter(item => !item.occupiedBy).length, 0);
    await assert.rejects(provider.build('laser', site));
    assert.deepEqual(await provider.reset(), initial);
});

test('all plots have unique finite surface positions and non-overlapping footprints', async () => {
    const { colonyPlots, surfacePosition, buildingCatalog } = await import('../../resources/js/prototype3d/catalog.js');
    assert.equal(Object.keys(buildingCatalog).length, 12);
    assert.equal(new Set(colonyPlots.map(plot => plot.id)).size, 16);
    for (let i = 0; i < colonyPlots.length; i++) {
        const point = surfacePosition(colonyPlots[i]);
        assert.ok(point.every(Number.isFinite));
        assert.ok(Math.abs(Math.hypot(...point) - 8) < 1e-9);
        for (let j = i + 1; j < colonyPlots.length; j++) {
            const other = surfacePosition(colonyPlots[j]);
            assert.ok(Math.hypot(...point.map((value, axis) => value - other[axis])) > 3.3);
        }
    }
});
