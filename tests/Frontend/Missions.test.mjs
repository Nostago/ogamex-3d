import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoProvider } from '../../resources/js/prototype3d/data.js';
import {
    demoFlightMs,
    missionProgress,
} from '../../resources/js/prototype3d/missions.js';
const error = (code) => (e) => e.code === code;
const stock = (s, type = 'lightFighter') =>
    s.fleet.find((x) => x.type === type).count;
test('deployment conserves every ship and transfers the fleet exactly once, with an unread report', async () => {
    let clock = 1000;
    const p = createDemoProvider({ now: () => clock });
    await p.loadFleetExample('armada');
    const initial = await p.saveFleet('Alpha', {
        lightFighter: 10000,
        smallCargo: 300,
    });
    const id = initial.managedFleets[0].id;
    await p.selectPlanet('small');
    await p.saveFleet('Local', { probe: 1 });
    const target = await p.load();
    await p.selectPlanet('medium');
    const started = await p.startMission(id, 'small');
    assert.equal(started.shipInventory[0].onMission, 10000);
    assert.equal(stock(started), 750000);
    await assert.rejects(
        p.saveFleet('Edit', { lightFighter: 1 }, id),
        error('fleet_on_mission'),
    );
    await assert.rejects(p.disbandFleet(id), error('fleet_on_mission'));
    await assert.rejects(
        p.startMission(id, 'large'),
        error('fleet_on_mission'),
    );
    clock += demoFlightMs - 1;
    assert.equal(await p.advanceMissions(), null);
    clock++;
    const done = await p.advanceMissions();
    assert.equal(stock(done), 740000);
    assert.equal(done.managedFleets.length, 0);
    assert.equal(done.missions[0].status, 'arrived');
    assert.equal(
        done.messages.filter((m) => m.key === 'fleet_deployment').length,
        1,
    );
    assert.equal(done.messages.at(-1).viewed, false);
    const arrived = await p.selectPlanet('small');
    assert.equal(stock(arrived), 10001);
    assert.equal(stock(arrived, 'smallCargo'), 301);
    assert.equal(arrived.managedFleets.length, 2);
    assert.notEqual(arrived.managedFleets[1].id, target.managedFleets[0].id);
    assert.equal(arrived.managedFleets[1].name, 'Alpha');
    assert.equal(arrived.managedFleets[1].status, 'docked');
    assert.equal(await p.advanceMissions(), null);
    assert.deepEqual(await p.load(), arrived);
    assert.equal(stock(done) + stock(arrived), stock(initial) + stock(target));
    assert.equal(
        stock(done, 'smallCargo') + stock(arrived, 'smallCargo'),
        stock(initial, 'smallCargo') + stock(target, 'smallCargo'),
    );
});
test('progress uses the injected clock; invalid targets or dates cannot mutate state', async () => {
    let clock = 10;
    const p = createDemoProvider({ now: () => clock });
    const before = await p.saveFleet('Patrol', { lightFighter: 1 });
    const id = before.managedFleets[0].id;
    for (const target of ['unknown', 'medium']) {
        await assert.rejects(
            p.startMission(id, target),
            error('mission_target'),
        );
        assert.deepEqual(await p.load(), before);
    }
    clock = Infinity;
    await assert.rejects(p.startMission(id, 'small'), error('mission_clock'));
    assert.deepEqual(await p.load(), before);
    clock = 100;
    const s = await p.startMission(id, 'small'),
        m = s.missions[0];
    assert.equal(missionProgress(m, 0), 0);
    assert.equal(missionProgress(m, 100 + demoFlightMs / 2), 0.5);
    assert.equal(missionProgress(m, 100 + demoFlightMs + 1), 1);
});
test('simultaneous arrivals and hidden-page catch-up do not lose or duplicate fleets', async () => {
    let clock = 0;
    const p = createDemoProvider({ now: () => clock });
    await p.loadFleetExample('armada');
    for (let i = 0; i < 3; i++) {
        const s = await p.saveFleet(`Flight ${i}`, { probe: 1000 });
        await p.startMission(s.managedFleets.at(-1).id, 'small');
    }
    await p.selectPlanet('large');
    clock = demoFlightMs * 100;
    const s = await p.advanceMissions();
    assert.equal(s.planet.id, 'large');
    assert.equal(s.missions.filter((m) => m.status === 'arrived').length, 3);
    assert.equal(
        s.messages.filter((m) => m.key === 'fleet_deployment').length,
        3,
    );
    const target = await p.selectPlanet('small');
    assert.equal(stock(target, 'probe'), 3001);
    assert.equal(new Set(target.managedFleets.map((f) => f.id)).size, 3);
    assert.equal(await p.advanceMissions(), null);
});
test('resetting destination returns incoming reservations; resetting source cannot cause a late arrival', async () => {
    let clock = 0;
    const p = createDemoProvider({ now: () => clock });
    let s = await p.saveFleet('Returning', { lightFighter: 1 });
    await p.startMission(s.managedFleets[0].id, 'small');
    await p.selectPlanet('small');
    await p.reset();
    s = await p.selectPlanet('medium');
    assert.equal(s.managedFleets[0].status, 'docked');
    assert.equal(s.shipInventory[0].ready, 1);
    assert.equal(s.missions.length, 0);
    await p.startMission(s.managedFleets[0].id, 'small');
    await p.reset();
    clock = demoFlightMs * 2;
    assert.equal(await p.advanceMissions(), null);
    s = await p.selectPlanet('small');
    assert.equal(stock(s), 1);
    assert.equal(s.managedFleets.length, 0);
});
test('destination slots are reserved before departure and samples cannot replace incoming inventory', async () => {
    const p = createDemoProvider();
    await p.selectPlanet('small');
    await p.loadFleetExample('armada');
    for (let i = 0; i < 29; i++) await p.saveFleet(`Local ${i}`, { probe: 1 });
    await p.selectPlanet('medium');
    let s = await p.saveFleet('Incoming', { lightFighter: 1 });
    await p.startMission(s.managedFleets[0].id, 'small');
    s = await p.saveFleet('Second', { smallCargo: 1 });
    await assert.rejects(
        p.startMission(s.managedFleets.at(-1).id, 'small'),
        error('target_full'),
    );
    await p.selectPlanet('small');
    await assert.rejects(
        p.saveFleet('Too full', { probe: 1 }),
        error('fleet_slots'),
    );
    await p.selectPlanet('large');
    s = await p.saveFleet('Incoming large', { probe: 1 });
    await p.startMission(s.managedFleets[0].id, 'medium');
    await p.selectPlanet('medium');
    await assert.rejects(
        p.loadFleetExample('patrol'),
        error('missions_pending'),
    );
});
