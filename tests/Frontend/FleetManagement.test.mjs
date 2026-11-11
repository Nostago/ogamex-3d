import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoProvider } from '../../resources/js/prototype3d/data.js';
import { buildingCatalog } from '../../resources/js/prototype3d/catalog.js';
import {
    buildingGroup,
    buildingGroups,
} from '../../resources/js/prototype3d/buildingGroups.js';
const error = (code) => (e) => e.code === code;
const item = (s, type = 'lightFighter') =>
    s.shipInventory.find((x) => x.type === type);
test('all facilities appear in exactly one of the three requested building overviews', () => {
    assert.deepEqual(buildingGroups, ['resources', 'ships', 'defense']);
    for (const type of Object.keys(buildingCatalog))
        assert.ok(buildingGroups.includes(buildingGroup(type)));
    assert.equal(buildingGroup('metalStorage'), 'resources');
    assert.equal(buildingGroup('shipyard'), 'ships');
    assert.equal(buildingGroup('rocket'), 'defense');
});
test('creating, editing and disbanding fleets reserve quantities without changing built stock', async () => {
    const p = createDemoProvider();
    const base = await p.loadFleetExample('armada');
    const a = await p.saveFleet('Alpha', {
        lightFighter: 10000,
        smallCargo: 2000,
    });
    const id = a.managedFleets[0].id;
    assert.deepEqual(a.fleet, base.fleet);
    assert.equal(item(a).available, 740000);
    const b = await p.saveFleet('Beta', { lightFighter: 5000 });
    const edited = await p.saveFleet('Alpha II', { lightFighter: 745000 }, id);
    assert.equal(item(edited).available, 0);
    assert.equal(item(edited, 'smallCargo').available, 250000);
    await assert.rejects(
        p.saveFleet('Excess', { lightFighter: 1 }),
        error('fleet_unavailable'),
    );
    assert.deepEqual(await p.load(), edited);
    const disbanded = await p.disbandFleet(id);
    assert.equal(item(disbanded).available, 745000);
    assert.deepEqual(disbanded.fleet, base.fleet);
    assert.equal(disbanded.managedFleets[0].id, b.managedFleets[1].id);
});
test('mission lock applies in provider and retains all reservations until disbanded', async () => {
    const p = createDemoProvider();
    const saved = await p.saveFleet('Patrol', { lightFighter: 1 });
    const id = saved.managedFleets[0].id;
    const away = await p.setFleetMission(id, true);
    assert.equal(item(away).available, 0);
    assert.equal(item(away).ready, 0);
    assert.equal(item(away).onMission, 1);
    assert.ok(!away.formations.some((f) => f.type === 'lightFighter'));
    await assert.rejects(
        p.saveFleet('Rename', { lightFighter: 1 }, id),
        error('fleet_on_mission'),
    );
    await assert.rejects(p.disbandFleet(id), error('fleet_on_mission'));
    await assert.rejects(p.setFleetMission(id, true), error('fleet_status'));
    await assert.rejects(
        p.saveFleet('Duplicate', { lightFighter: 1 }),
        error('fleet_unavailable'),
    );
    assert.deepEqual(await p.load(), away);
    const returned = await p.setFleetMission(id, false);
    assert.equal(item(returned).ready, 1);
    assert.equal(item(returned).available, 0);
    const free = await p.disbandFleet(id);
    assert.equal(item(free).available, 1);
    assert.equal(item(free).completed, 1);
});
test('pending production is visible per type but cannot be allocated before completion', async () => {
    const p = createDemoProvider();
    const queued = await p.enqueueShip('lightFighter', 3000);
    assert.equal(item(queued).inProduction, 3000);
    assert.equal(item(queued).ready, 1);
    await assert.rejects(
        p.saveFleet('Future', { lightFighter: 3000 }),
        error('fleet_unavailable'),
    );
    const done = await p.completeShipOrder(queued.orders[0].id);
    assert.equal(item(done).ready, 3001);
    assert.equal(item(done).inProduction, 0);
    const saved = await p.saveFleet('Ready', { lightFighter: 3000 });
    assert.equal(item(saved).available, 1);
});
test('invalid edits fail atomically and fleet snapshots are copied deeply', async () => {
    const p = createDemoProvider();
    const s = await p.saveFleet('Valid', { smallCargo: 1 });
    const id = s.managedFleets[0].id;
    for (const counts of [
        {},
        [],
        null,
        { probe: -1 },
        { probe: 0.5 },
        { probe: '1' },
        { probe: Infinity },
        { probe: Number.MAX_SAFE_INTEGER },
        { unknown: 1 },
    ]) {
        await assert.rejects(p.saveFleet('Bad', counts));
        assert.deepEqual(await p.load(), s);
    }
    for (const name of ['', ' ', 'x'.repeat(61), 'line\nfeed'])
        await assert.rejects(
            p.saveFleet(name, { smallCargo: 1 }, id),
            error('fleet_name'),
        );
    await assert.rejects(p.disbandFleet('unknown'), error('unknown_fleet'));
    await assert.rejects(
        p.saveFleet('Stale', { probe: 1 }, 'unknown'),
        error('unknown_fleet'),
    );
    await assert.rejects(p.loadFleetExample('patrol'), error('fleets_exist'));
    assert.deepEqual(await p.load(), s);
    s.managedFleets[0].ships[0].count = 999;
    assert.equal((await p.load()).managedFleets[0].ships[0].count, 1);
});
test('fleet storage is bounded and planet switching/reset cannot leak reservations', async () => {
    const p = createDemoProvider();
    await p.loadFleetExample('armada');
    for (let i = 0; i < 30; i++) await p.saveFleet(`Fleet ${i}`, { probe: 1 });
    const medium = await p.load();
    await assert.rejects(
        p.saveFleet('Overflow', { probe: 1 }),
        error('fleet_slots'),
    );
    assert.deepEqual(await p.load(), medium);
    await p.selectPlanet('small');
    await p.saveFleet('Small', { lightFighter: 1 });
    await p.reset();
    assert.equal((await p.load()).managedFleets.length, 0);
    assert.deepEqual(await p.selectPlanet('medium'), medium);
    await p.reset();
    assert.equal((await p.load()).managedFleets.length, 0);
    const other = createDemoProvider();
    assert.equal((await other.load()).managedFleets.length, 0);
});
