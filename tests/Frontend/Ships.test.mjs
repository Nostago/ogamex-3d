import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../resources/js/prototype3d/vendor/three.module.min.js';
import { createShip } from '../../resources/js/prototype3d/ships.js';
import {
    shipCatalog,
    fleetLimit,
} from '../../resources/js/prototype3d/shipCatalog.js';
import {
    createDemoProvider,
    checkShipBuild,
} from '../../resources/js/prototype3d/data.js';

const palette = Object.fromEntries(
    [
        'steel',
        'painted',
        'window',
        'dark',
        'gold',
        'insulation',
        'panel',
        'cyan',
    ].map((key) => [key, new THREE.MeshStandardMaterial()]),
);
for (const type of Object.keys(shipCatalog)) {
    test(`${type}: finite, distinct low-budget procedural ship assembly`, () => {
        const group = createShip(type, palette);
        const size = new THREE.Box3()
            .setFromObject(group)
            .getSize(new THREE.Vector3());
        assert.ok(
            size
                .toArray()
                .every(
                    (value) => Number.isFinite(value) && value > 0 && value < 2,
                ),
        );
        let meshes = 0,
            triangles = 0;
        group.traverse((item) => {
            if (!item.geometry) return;
            meshes++;
            triangles +=
                (item.geometry.index?.count ??
                    item.geometry.attributes.position.count) / 3;
            assert.ok(
                item.geometry.attributes.position.array.every(Number.isFinite),
            );
            item.geometry.dispose();
        });
        assert.ok(meshes <= 25);
        assert.ok(triangles < 3000);
    });
}
test('ship builds change only the selected planet fleet, never gameplay fields or building levels', async () => {
    const provider = createDemoProvider();
    const before = await provider.selectPlanet('small');
    await provider.upgrade('metal');
    const full = await provider.load();
    const built = await provider.buildShip('smallCargo');
    assert.equal(built.ships.length, 4);
    assert.equal(built.ships.at(-1).origin, 'built');
    assert.deepEqual(built.buildings, full.buildings);
    assert.deepEqual(built.capacity, full.capacity);
    assert.equal(built.capacity.remaining, 0);
    assert.equal((await provider.selectPlanet('medium')).ships.length, 3);
    assert.deepEqual(await provider.selectPlanet('small'), built);
    built.ships[0].type = 'invalid';
    assert.equal((await provider.load()).ships[0].type, before.ships[0].type);
    await provider.reset();
    assert.equal((await provider.load()).ships.length, 3);
});
test('fleet limit, unknown type and missing shipyard are validated without mutations', async () => {
    const provider = createDemoProvider();
    const initial = await provider.load();
    assert.throws(
        () => checkShipBuild({ ...initial, buildings: [] }, 'lightFighter'),
        (e) => e.code === 'shipyard_required',
    );
    await assert.rejects(
        provider.buildShip('constructor'),
        (e) => e.code === 'unknown_ship',
    );
    assert.deepEqual(await provider.load(), initial);
    for (let i = 3; i < fleetLimit; i++) await provider.buildShip('probe');
    const full = await provider.load();
    assert.equal(new Set(full.ships.map((s) => s.id)).size, fleetLimit);
    await assert.rejects(
        provider.buildShip('probe'),
        (e) => e.code === 'fleet_full',
    );
    assert.deepEqual(await provider.load(), full);
    const other = createDemoProvider();
    assert.equal((await other.load()).ships.length, 3);
});
test('new facilities follow the existing field and automatic location contract; planet list is copied', async () => {
    const provider = createDemoProvider();
    const before = await provider.load();
    const planets = await provider.listPlanets();
    planets[0].name = 'changed';
    assert.notEqual((await provider.listPlanets())[0].name, 'changed');
    await provider.build('nanite');
    const built = await provider.build('fusion');
    assert.equal(
        built.capacity.field_current,
        before.capacity.field_current + 2,
    );
    assert.deepEqual(
        built.buildings.slice(0, before.buildings.length),
        before.buildings,
    );
    assert.equal(
        new Set(built.buildings.map((b) => b.siteId)).size,
        built.buildings.length,
    );
    await assert.rejects(
        provider.build('fusion'),
        (e) => e.code === 'already_built',
    );
});
