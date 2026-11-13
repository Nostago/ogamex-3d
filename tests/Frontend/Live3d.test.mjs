import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiveClient } from '../../resources/js/live3d/client.js';
import {
    visualState,
    modelAliases,
} from '../../resources/js/live3d/visualState.js';
globalThis.location = { origin: 'https://ogamex.test' };
const options = {
    stateUrl: 'https://ogamex.test/play-3d/state',
    commandUrl: 'https://ogamex.test/play-3d/command',
    token: 'test-token',
};
const response = (value) =>
    new Response(JSON.stringify(value), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
test('late state responses cannot overwrite the newest planet selection', async () => {
    const pending = [];
    const client = createLiveClient({
        ...options,
        fetcher: () => new Promise((resolve) => pending.push(resolve)),
    });
    const first = client.load(1),
        second = client.load(2);
    pending[1](response({ planet: { id: 2 } }));
    assert.deepEqual(await second, { planet: { id: 2 } });
    pending[0](response({ planet: { id: 1 } }));
    assert.equal(await first, null);
});
test('writes bind planet, action and CSRF, block repeated submission, invalidate old reads and never retry', async () => {
    let finish,
        calls = 0,
        payload;
    const client = createLiveClient({
        ...options,
        fetcher: async (url, init) => {
            calls++;
            payload = JSON.parse(init.body);
            return new Promise((resolve) => {
                finish = resolve;
            });
        },
    });
    const write = client.command(42, 'build', {
        technologyId: 1,
        planet: 999,
        action: 'cancel-building',
        _token: 'wrong',
    });
    assert.equal(client.writing, true);
    await assert.rejects(
        client.command(42, 'build', { technologyId: 1 }),
        (e) => e.code === 'busy',
    );
    assert.equal(await client.load(7), null);
    assert.deepEqual(payload, {
        technologyId: 1,
        planet: 42,
        action: 'build',
        _token: 'test-token',
    });
    finish(new Response('', { status: 503 }));
    await assert.rejects(write, (e) => e.code === 'request');
    assert.equal(client.writing, false);
    assert.equal(calls, 1);
});
test('expired sessions and server rejections do not become local successes', async () => {
    const expired = createLiveClient({
        ...options,
        fetcher: async () => new Response('', { status: 419 }),
    });
    await assert.rejects(
        expired.command(1, 'build', { technologyId: 1 }),
        (e) => e.code === 'session',
    );
    const denied = createLiveClient({
        ...options,
        fetcher: async () =>
            response({ success: false, message: 'Original server rejection' }),
    });
    await assert.rejects(
        denied.command(1, 'build', { technologyId: 1 }),
        (e) =>
            e.code === 'rejected' && e.message === 'Original server rejection',
    );
});
test('visual adapter preserves actual levels, bounds million-ship geometry and keeps unsupported objects in the DTO', () => {
    const snapshot = {
        planet: { id: 42, diameter: 12800, type: 1 },
        shipTotal: '1050000',
        objects: [
            { id: 1, key: 'metal_mine', amount: '40' },
            { id: 204, key: 'light_fighter', amount: '1000000' },
            { id: 214, key: 'deathstar', amount: '50000' },
        ],
    };
    const original = structuredClone(snapshot),
        model = visualState(snapshot);
    assert.equal(model.fleetSummary.total, '1050000');
    assert.equal(model.buildings[0].level, 8);
    assert.equal(model.buildings[0].displayLevel, '40');
    assert.equal(model.formations[0].modelCount, 4);
    assert.equal(model.formations[0].count, 1000000);
    assert.deepEqual(snapshot, original);
});

test('small planets and moons can render every supported building without aborting startup', () => {
    const objects = Object.keys(modelAliases).map((key, index) => ({
        id: index + 1,
        key,
        amount: '40',
    }));
    for (const type of [1, 3])
        for (const diameter of [
            1000, 4000, 6000, 9000, 10000, 11000, 12000, 16000, 25000,
        ]) {
            const snapshot = {
                planet: { id: 42, diameter, type },
                shipTotal: '0',
                objects,
            };
            const model = visualState(snapshot);
            assert.equal(
                model.buildings.length,
                objects.length,
                `type ${type}, diameter ${diameter}`,
            );
            assert.equal(
                new Set(model.buildings.map((item) => item.siteId)).size,
                objects.length,
            );
            assert.ok(
                model.buildings.every((item) => item.displayLevel === '40'),
            );
        }
});

test('all live fleet types share a fixed twelve-model budget while catalog totals stay intact', () => {
    const keys = [
        'light_fighter',
        'heavy_fighter',
        'cruiser',
        'battle_ship',
        'battlecruiser',
        'bomber',
        'destroyer',
        'deathstar',
        'reaper',
        'small_cargo',
        'large_cargo',
        'colony_ship',
        'recycler',
        'espionage_probe',
        'pathfinder',
    ];
    const snapshot = {
        planet: { id: 42, diameter: 10000, type: 1 },
        shipTotal: '15000000',
        objects: keys.map((key, id) => ({
            id,
            key,
            name: key,
            amount: '1000000',
        })),
    };
    const before = structuredClone(snapshot),
        model = visualState(snapshot);
    assert.ok(
        model.formations.reduce((count, item) => count + item.modelCount, 0) <=
            12,
    );
    assert.ok(model.formations.some((item) => item.type === 'deathstar'));
    assert.equal(model.fleetSummary.total, '15000000');
    assert.deepEqual(snapshot, before);
});
