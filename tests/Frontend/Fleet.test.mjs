import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createDemoProvider,
    checkShipBuild,
} from '../../resources/js/prototype3d/data.js';
import {
    createFormations,
    maxOrderQuantity,
    maxPendingOrders,
    modelsPerFormation,
} from '../../resources/js/prototype3d/fleet.js';
const error = (code) => (e) => e.code === code;
test('a quantity order changes no inventory until completion, then adds exact quantity once', async () => {
    const p = createDemoProvider();
    const before = await p.load();
    const queued = await p.enqueueShip('lightFighter', 10000);
    const id = queued.orders.at(-1).id;
    assert.deepEqual(queued.fleet, before.fleet);
    assert.equal(queued.fleetSummary.pending, 10000);
    const done = await p.completeShipOrder(id);
    assert.equal(
        done.fleet.find((x) => x.type === 'lightFighter').count,
        10001,
    );
    assert.equal(done.fleetSummary.total, 10003);
    assert.equal(done.fleetSummary.pending, 0);
    assert.deepEqual(done.capacity, before.capacity);
    assert.deepEqual(done.buildings, before.buildings);
    await assert.rejects(p.completeShipOrder(id), error('unknown_order'));
    await assert.rejects(p.cancelShipOrder(id), error('unknown_order'));
    assert.deepEqual(await p.load(), done);
});
test('quantity validation rejects fractions, zero, negatives, unsafe numbers and coercions atomically', async () => {
    const p = createDemoProvider();
    const before = await p.load();
    for (const value of [
        0,
        -1,
        1.5,
        NaN,
        Infinity,
        '10000',
        null,
        undefined,
        maxOrderQuantity + 1,
        Number.MAX_SAFE_INTEGER,
    ]) {
        await assert.rejects(
            p.enqueueShip('probe', value),
            error('invalid_quantity'),
        );
        assert.deepEqual(await p.load(), before);
    }
    await assert.rejects(
        p.enqueueShip('constructor', 1),
        error('unknown_ship'),
    );
    assert.throws(
        () => checkShipBuild({ ...before, buildings: [] }, 'probe', 1),
        error('shipyard_required'),
    );
    assert.throws(
        () =>
            checkShipBuild(
                {
                    ...before,
                    fleet: [{ type: 'probe', count: Number.MAX_SAFE_INTEGER }],
                },
                'probe',
                1,
            ),
        error('count_overflow'),
    );
});
test('pending orders, cancellation, queue capacity and history stay bounded', async () => {
    const p = createDemoProvider();
    let state;
    for (let i = 0; i < maxPendingOrders; i++)
        state = await p.enqueueShip('probe', i + 1);
    const full = await p.load();
    assert.equal(full.fleetSummary.pending, 210);
    await assert.rejects(p.enqueueShip('probe', 1), error('queue_full'));
    assert.deepEqual(await p.load(), full);
    await assert.rejects(p.loadFleetExample('armada'), error('orders_pending'));
    const id = full.orders[0].id;
    await p.cancelShipOrder(id);
    await assert.rejects(p.completeShipOrder(id), error('unknown_order'));
    for (const order of (await p.load()).orders.filter(
        (o) => o.status === 'queued',
    ))
        await p.completeShipOrder(order.id);
    assert.equal((await p.load()).fleetSummary.total, 212);
    const ids = new Set(full.orders.map((o) => o.id));
    for (let i = 0; i < 30; i++) {
        state = await p.enqueueShip('probe', 1);
        const order = state.orders.at(-1);
        assert.ok(!ids.has(order.id));
        ids.add(order.id);
        await p.cancelShipOrder(order.id);
        assert.ok((await p.load()).orders.length <= maxPendingOrders + 5);
    }
});
test('million-scale example is data only; formations have a fixed geometry budget and stable IDs', async () => {
    const p = createDemoProvider();
    const before = await p.load();
    const large = await p.loadFleetExample('armada');
    assert.equal(large.fleetSummary.total, 1100000);
    assert.equal(large.fleet.length, 3);
    assert.equal(large.formations.length, 3);
    assert.equal(
        large.formations.reduce((n, f) => n + f.modelCount, 0),
        12,
    );
    assert.deepEqual(
        large.formations.map((f) => f.id),
        before.formations.map((f) => f.id),
    );
    assert.deepEqual(large.buildings, before.buildings);
    assert.deepEqual(large.capacity, before.capacity);
    const queued = await p.enqueueShip('probe', maxOrderQuantity);
    const done = await p.completeShipOrder(queued.orders.at(-1).id);
    assert.equal(done.fleetSummary.total, 1001100000);
    assert.equal(
        done.formations.reduce((n, f) => n + f.modelCount, 0),
        12,
    );
    assert.deepEqual(createFormations([{ type: 'probe', count: 0 }]), []);
    assert.equal(
        createFormations([{ type: 'probe', count: Number.MAX_SAFE_INTEGER }])[0]
            .modelCount,
        modelsPerFormation,
    );
    await assert.rejects(
        p.loadFleetExample('constructor'),
        error('unknown_preset'),
    );
    assert.deepEqual(await p.load(), done);
});
test('planet switching preserves queued quantities, reset is local, snapshots cannot mutate provider state', async () => {
    const p = createDemoProvider();
    const queued = await p.enqueueShip('smallCargo', 10000);
    await p.selectPlanet('small');
    await p.loadFleetExample('armada');
    await p.reset();
    assert.equal((await p.load()).fleetSummary.total, 3);
    assert.deepEqual(await p.selectPlanet('medium'), queued);
    queued.fleet[0].count = 999;
    queued.orders[0].quantity = 2;
    queued.formations[0].count = 999;
    const current = await p.load();
    assert.equal(current.fleet[0].count, 1);
    assert.equal(current.orders[0].quantity, 10000);
    const independent = createDemoProvider();
    assert.equal((await independent.load()).fleetSummary.pending, 0);
});
