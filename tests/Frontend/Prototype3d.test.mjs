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
