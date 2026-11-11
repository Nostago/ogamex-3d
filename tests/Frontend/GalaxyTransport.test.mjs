import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoProvider } from '../../resources/js/prototype3d/data.js';
import {
    systemRows,
    validSystem,
} from '../../resources/js/prototype3d/galaxy.js';
import { cargoCapacity } from '../../resources/js/prototype3d/transport.js';
import { demoFlightMs } from '../../resources/js/prototype3d/missions.js';
const error = (code) => (e) => e.code === code;
const cargo = { metal: 3000, crystal: 1000, deuterium: 500 };
const setup = async () => {
    let clock = 1000;
    const p = createDemoProvider({ now: () => clock });
    const s = await p.saveFleet('Versorgung', {
        smallCargo: 1,
        lightFighter: 1,
    });
    return {
        p,
        s,
        id: s.managedFleets[0].id,
        tick: (ms) => {
            clock += ms;
        },
    };
};

test('galaxy coordinates are bounded and own colony positions match provider coordinates', async () => {
    const rows = systemRows(1, 42);
    assert.equal(rows.length, 16);
    assert.equal(rows[15].kind, 'expedition');
    assert.equal(rows.filter((r) => r.kind === 'own').length, 3);
    const p = createDemoProvider();
    for (const row of rows.filter((r) => r.planetId)) {
        assert.equal(
            (await p.selectPlanet(row.planetId)).coordinates,
            row.coordinates,
        );
    }
    for (const [g, s] of [
        [0, 42],
        [4, 1],
        [1, 0],
        [1, 500],
        [1.5, 42],
        [NaN, 42],
    ]) {
        assert.equal(validSystem(g, s), false);
        assert.throws(() => systemRows(g, s), RangeError);
    }
    assert.equal(validSystem(3, 499), true);
    assert.equal(
        systemRows(2, 42).filter((r) => r.kind === 'empty').length,
        15,
    );
});

test('transport debits at launch, delivers once, returns ships without moving their inventory', async () => {
    const { p, s, id, tick } = await setup();
    const started = await p.startMission(id, 'small', 'transport', cargo);
    assert.deepEqual(started.resources, {
        metal: 97000,
        crystal: 49000,
        deuterium: 24500,
    });
    assert.equal(
        started.shipInventory.find((x) => x.type === 'smallCargo').available,
        0,
    );
    assert.equal(started.managedFleets[0].status, 'mission');
    assert.equal((await p.selectPlanet('small')).incomingTotal, 0);
    tick(demoFlightMs);
    const delivered = await p.advanceMissions();
    assert.deepEqual(delivered.resources, {
        metal: 103000,
        crystal: 51000,
        deuterium: 25500,
    });
    assert.equal(delivered.missions[0].delivered, true);
    assert.equal(delivered.fleet.find((x) => x.type === 'smallCargo').count, 1);
    assert.equal(await p.advanceMissions(), null);
    await p.selectPlanet('medium');
    await assert.rejects(p.disbandFleet(id), error('fleet_on_mission'));
    await assert.rejects(
        p.startMission(id, 'large', 'transport', cargo),
        error('fleet_on_mission'),
    );
    tick(demoFlightMs);
    const returned = await p.advanceMissions();
    assert.equal(returned.managedFleets[0].status, 'docked');
    assert.deepEqual(returned.fleet, s.fleet);
    assert.equal(
        returned.messages.filter((m) => m.key.startsWith('transport_')).length,
        2,
    );
    assert.equal(await p.advanceMissions(), null);
    const target = await p.selectPlanet('small');
    for (const key of Object.keys(cargo))
        assert.equal(
            returned.resources[key] + target.resources[key],
            2 * s.resources[key],
        );
});

test('invalid, excessive and duplicate dispatches never debit resources or unlock ships', async () => {
    const { p, s, id } = await setup();
    for (const [value, code] of [
        [{ metal: 0, crystal: 0, deuterium: 0 }, 'invalid_cargo'],
        [{ ...cargo, metal: -1 }, 'invalid_cargo'],
        [{ ...cargo, metal: 0.5 }, 'invalid_cargo'],
        [{ ...cargo, metal: Infinity }, 'invalid_cargo'],
        [{ ...cargo, metal: 100001 }, 'cargo_stock'],
        [{ ...cargo, metal: 5000 }, 'cargo_capacity'],
        [{ ...cargo, energy: 1 }, 'invalid_cargo'],
    ]) {
        await assert.rejects(
            p.startMission(id, 'small', 'transport', value),
            error(code),
        );
        assert.deepEqual(await p.load(), s);
    }
    assert.equal(cargoCapacity([{ type: 'probe', count: 1000000 }]), 0);
    const results = await Promise.allSettled([
        p.startMission(id, 'small', 'transport', cargo),
        p.startMission(id, 'small', 'transport', cargo),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal((await p.load()).resources.metal, 97000);
});

test('background catch-up processes both phases once and reset refunds undelivered cargo only', async () => {
    const { p, id, tick } = await setup();
    await p.startMission(id, 'small', 'transport', cargo);
    tick(demoFlightMs * 3);
    const caughtUp = await p.advanceMissions();
    assert.equal(caughtUp.managedFleets[0].status, 'docked');
    assert.equal(
        caughtUp.messages.filter((m) => m.key.startsWith('transport_')).length,
        2,
    );
    await p.startMission(id, 'large', 'transport', cargo);
    await p.selectPlanet('large');
    await p.reset();
    const refunded = await p.selectPlanet('medium');
    assert.deepEqual(refunded.resources, caughtUp.resources);
    assert.equal(refunded.managedFleets[0].status, 'docked');
    await p.startMission(id, 'large', 'transport', cargo);
    tick(demoFlightMs);
    await p.advanceMissions();
    await p.selectPlanet('large');
    await p.reset();
    const notRefunded = await p.selectPlanet('medium');
    assert.equal(
        notRefunded.resources.metal,
        caughtUp.resources.metal - cargo.metal,
    );
    tick(demoFlightMs * 2);
    assert.equal(await p.advanceMissions(), null);
});

test('concurrent transports cannot spend the same stock twice and cannot use pending ships', async () => {
    const { p, id } = await setup();
    await p.load();
    await p.enqueueShip('smallCargo', 100);
    await assert.rejects(
        p.saveFleet('Future', { smallCargo: 100 }),
        error('fleet_unavailable'),
    );
    // One high-capacity ready group, then a second group of ready ships.
    await p.cancelShipOrder('order-1');
    await p.disbandFleet(id);
    await p.loadFleetExample('armada');
    await p.saveFleet('A', { smallCargo: 100 });
    const state = await p.saveFleet('B', { smallCargo: 100 });
    const ids = state.managedFleets.map((g) => g.id);
    const all = { metal: 100000, crystal: 50000, deuterium: 25000 };
    const results = await Promise.allSettled(
        ids.map((fleet) => p.startMission(fleet, 'small', 'transport', all)),
    );
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.deepEqual((await p.load()).resources, {
        metal: 0,
        crystal: 0,
        deuterium: 0,
    });
});

test('origin reset cancels outgoing cargo without late delivery; snapshots do not mutate stored cargo', async () => {
    const { p, id, tick } = await setup();
    const started = await p.startMission(id, 'small', 'transport', cargo);
    started.missions[0].cargo.metal = 999999;
    started.resources.metal = 999999;
    assert.equal((await p.load()).missions[0].cargo.metal, 3000);
    await p.reset();
    tick(demoFlightMs * 3);
    assert.equal(await p.advanceMissions(), null);
    assert.deepEqual((await p.load()).resources, {
        metal: 100000,
        crystal: 50000,
        deuterium: 25000,
    });
    assert.deepEqual((await p.selectPlanet('small')).resources, {
        metal: 100000,
        crystal: 50000,
        deuterium: 25000,
    });
});
