import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDemoProvider } from '../../resources/js/prototype3d/data.js';
import {
    production,
    price,
    duration,
    storageLimit,
    integrate,
} from '../../resources/js/prototype3d/economy.js';
import { saveKey } from '../../resources/js/prototype3d/demoStorage.js';
const reference = JSON.parse(
    await readFile(
        new URL('../fixtures/prototype-production.json', import.meta.url),
    ),
);
const memory = () => {
    const data = new Map();
    return {
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, value),
    };
};
const setup = (storage = null) => {
    let clock = 1000;
    const create = () =>
        createDemoProvider({ now: () => clock, economyMode: true, storage });
    return {
        p: create(),
        create,
        tick: (ms) => {
            clock += ms;
        },
    };
};
const error = (code) => (e) => e.code === code;
async function unlock(p) {
    await p.startResearch('energyTech');
    await p.advanceTime(3600);
    await p.startResearch('combustion');
    await p.advanceTime(3600);
}

test('mine and energy values use PHP original formula fixtures for every demo level', () => {
    const by = (type, level) =>
        reference.find((r) => r.type === type && r.level === level);
    for (let level = 1; level <= 8; level++) {
        const stats = production(
            ['metal', 'crystal', 'deuterium', 'solar'].map((type) => ({
                type,
                level,
            })),
            'medium',
            {},
            { deuterium: 1000 },
        );
        const metal = by('metal_mine', level).metal;
        assert.equal(
            stats.mines.metal,
            Math.ceil(metal + Math.floor(metal * 0.23)),
        );
        assert.equal(
            stats.mines.crystal,
            Math.ceil(by('crystal_mine', level).crystal),
        );
        assert.equal(
            stats.mines.deuterium,
            Math.ceil(by('deuterium_synthesizer', level).deuterium),
        );
        assert.equal(
            stats.energyMade,
            Math.floor(by('solar_plant', level).energy),
        );
        assert.equal(
            stats.energyUsed,
            -Math.floor(by('metal_mine', level).energy) -
                Math.floor(by('crystal_mine', level).energy) -
                Math.floor(by('deuterium_synthesizer', level).energy),
        );
    }
    const initial = production(
        [
            { type: 'metal', level: 4 },
            { type: 'crystal', level: 3 },
            { type: 'deuterium', level: 2 },
            { type: 'solar', level: 5 },
        ],
        'medium',
        {},
        { deuterium: 2000 },
    );
    assert.deepEqual(initial.rates, { metal: 253, crystal: 95, deuterium: 31 });
});

test('energy shortage preserves basic income, cold planets produce more deuterium, storage retains trade surplus', () => {
    const buildings = [
        { type: 'metal', level: 4 },
        { type: 'deuterium', level: 4 },
    ];
    const short = production(buildings, 'medium', {}, {});
    assert.equal(short.factor, 0);
    assert.equal(short.rates.metal, 37);
    assert.equal(short.rates.crystal, 15);
    assert.equal(short.rates.deuterium, 0);
    const full = [...buildings, { type: 'solar', level: 8 }];
    assert.ok(
        production(full, 'large', {}, {}).rates.deuterium >
            production(full, 'small', {}, {}).rates.deuterium,
    );
    assert.equal(storageLimit(0), 10000);
    assert.equal(storageLimit(1), 20000);
    assert.equal(
        integrate({ metal: 9999, crystal: 15000, deuterium: 0 }, short, 3600000)
            .metal,
        10000,
    );
    assert.equal(
        integrate({ metal: 9999, crystal: 15000, deuterium: 0 }, short, 3600000)
            .crystal,
        15000,
    );
});

test('original costs and times include early-building factor, robotics, shipyard and research lab', () => {
    assert.deepEqual(price('metal', 5), {
        metal: 303,
        crystal: 75,
        deuterium: 0,
        energy: 0,
    });
    assert.deepEqual(price('energyTech', 2), {
        metal: 0,
        crystal: 1600,
        deuterium: 800,
        energy: 0,
    });
    assert.deepEqual(price('lightFighter', 1, 2), {
        metal: 6000,
        crystal: 2000,
        deuterium: 0,
        energy: 0,
    });
    assert.equal(duration('metal', price('metal'), [], 1), 30000);
    assert.equal(
        duration('lightFighter', price('lightFighter'), [
            { type: 'shipyard', level: 2 },
        ]),
        1920000,
    );
    assert.equal(
        duration('energyTech', price('energyTech'), [
            { type: 'research', level: 2 },
        ]),
        960000,
    );
});

test('timed building pays once and production switches at the exact completion boundary', async () => {
    const { p, tick } = setup();
    const initial = await p.load();
    const start = await p.upgrade('metal');
    assert.equal(start.resources.metal, 4697);
    await assert.rejects(p.upgrade('crystal'), error('economy_busy'));
    assert.equal((await p.load()).resources.metal, 4697);
    const delay = start.buildingJob.endsAt - start.worldTime;
    tick(delay - 1);
    assert.equal(
        (await p.load()).buildings.find((b) => b.id === 'metal').level,
        4,
    );
    tick(1);
    const done = await p.load();
    assert.equal(done.buildings.find((b) => b.id === 'metal').level, 5);
    assert.equal(done.buildingJob, null);
    const expected = 4697 + (initial.economy.rates.metal * delay) / 3600000;
    assert.ok(Math.abs(done.resources.metal - expected) < 1e-8);
    tick(3600000);
    const after = await p.load();
    assert.ok(
        Math.abs(
            after.resources.metal -
                done.resources.metal -
                done.economy.rates.metal,
        ) < 1e-8,
    );
});

test('research is global, requirements gate new ships, and simultaneous research cannot double-spend', async () => {
    const { p } = setup();
    await assert.rejects(
        p.enqueueShip('lightFighter', 1),
        error('requirements'),
    );
    const results = await Promise.allSettled([
        p.startResearch('energyTech'),
        p.startResearch('energyTech'),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal((await p.load()).resources.crystal, 4200);
    await assert.rejects(p.upgrade('research'), error('economy_busy'));
    await p.advanceTime(3600);
    assert.equal((await p.selectPlanet('small')).research.energyTech, 1);
    await p.selectPlanet('medium');
    await p.startResearch('combustion');
    await p.advanceTime(3600);
    const queued = await p.enqueueShip('lightFighter', 1);
    assert.equal(queued.orders.length, 1);
    await assert.rejects(p.enqueueShip('probe', 1), error('requirements'));
    await assert.rejects(
        p.enqueueShip('lightFighter', 1000000),
        error('resources_short'),
    );
});

test('ship batches deliver per unit, pause/resume correctly, and refund only unfinished units', async () => {
    const { p, tick } = setup();
    await unlock(p);
    for (let i = 0; i < 4; i++) await p.advanceTime(3600);
    await p.enqueueShip('lightFighter', 2);
    const start = await p.startAllShipOrders();
    await assert.rejects(p.startAllShipOrders(), error('economy_busy'));
    tick(start.shipJob.unitMs);
    const partial = await p.load();
    assert.equal(partial.fleet[0].count, 2);
    assert.equal(partial.orders[0].quantity, 1);
    await p.stopShipOrders();
    tick(3600000);
    const paused = await p.load();
    assert.equal(paused.fleet[0].count, 2);
    const before = paused.resources.metal;
    const cancelled = await p.cancelShipOrder('order-1');
    assert.equal(cancelled.resources.metal, before + 3000);
    assert.equal(cancelled.shipJob, null);
    assert.equal(cancelled.fleet[0].count, 2);
});

test('saved jobs catch up once across reloads, paused jobs stay paused and corrupted saves recover', async () => {
    const storage = memory(),
        { p, create, tick } = setup(storage);
    await unlock(p);
    await p.enqueueShip('lightFighter', 1);
    await p.startAllShipOrders();
    tick(3600000);
    const restored = await create().load();
    assert.equal(restored.fleet[0].count, 2);
    assert.equal(restored.shipJob, null);
    assert.equal((await create().load()).fleet[0].count, 2);
    storage.setItem(saveKey, '{"schema":1,"states":[]}');
    const recovered = await create().load();
    assert.equal(recovered.fleet[0].count, 1);
    assert.equal(recovered.saveStatus, 'invalid');
    const broken = createDemoProvider({
        economyMode: true,
        now: () => 1000,
        storage: {
            getItem() {
                throw new Error('denied');
            },
            setItem() {
                throw new Error('quota');
            },
        },
    });
    assert.equal((await broken.load()).saveStatus, 'memory');
});

test('production, transport and reset share a consistent timeline without late arrivals', async () => {
    const { p } = setup();
    const initial = await p.load();
    const group = await p.saveFleet('Test', { smallCargo: 1 });
    await p.startMission(group.managedFleets[0].id, 'small', 'transport', {
        metal: 100,
        crystal: 50,
        deuterium: 0,
    });
    await p.advanceTime(60);
    const target = await p.selectPlanet('small');
    assert.ok(target.resources.metal > initial.resources.metal + 100);
    await p.selectPlanet('medium');
    assert.equal((await p.load()).managedFleets[0].status, 'docked');
    await p.startResearch('energyTech');
    await p.resetAll();
    await p.advanceTime(3600);
    const reset = await p.load();
    assert.equal(reset.research.energyTech, 0);
    assert.equal(reset.researchJob, null);
    assert.equal(reset.missions.length, 0);
});

test('paused progress survives reload and FIFO orders use exact prior completion timestamps', async () => {
    const storage = memory(),
        { p, create, tick } = setup(storage);
    await unlock(p);
    for (let i = 0; i < 5; i++) await p.advanceTime(3600);
    await p.enqueueShip('lightFighter', 1);
    await p.enqueueShip('lightFighter', 1);
    const started = await p.startAllShipOrders();
    tick(started.shipJob.unitMs + 1000);
    const partial = await p.load();
    assert.equal(partial.orders[0].status, 'completed');
    assert.equal(partial.shipJob.startedAt, started.shipJob.endsAt);
    await p.stopShipOrders();
    tick(3600000);
    await p.load();
    const q = create();
    const restored = await q.load();
    assert.equal(restored.saveStatus, 'saved');
    assert.equal(restored.fleet[0].count, 2);
    assert.ok(restored.shipJob.paused);
    await q.startAllShipOrders();
    tick(restored.shipJob.unitMs - 1000);
    const done = await q.load();
    assert.equal(done.fleet[0].count, 3);
    assert.equal(done.shipJob, null);
});

test('million-ship completion is arithmetic and consumes only the paid reservation', async () => {
    const storage = memory(),
        { p, create, tick } = setup(storage);
    await p.load();
    const save = JSON.parse(storage.getItem(saveKey));
    save.research.energyTech = 1;
    save.research.combustion = 1;
    save.states.find(([key]) => key === 'medium')[1].resources = {
        metal: 1e12,
        crystal: 1e12,
        deuterium: 1e12,
    };
    storage.setItem(saveKey, JSON.stringify(save));
    const q = create();
    await q.enqueueShip('lightFighter', 1000000);
    const start = await q.startAllShipOrders();
    tick(start.shipJob.unitMs * 1000000);
    const done = await q.load();
    assert.equal(done.fleet[0].count, 1000001);
    assert.equal(done.orders[0].status, 'completed');
    assert.equal(
        done.formations.find((f) => f.type === 'lightFighter').modelCount,
        4,
    );
});
