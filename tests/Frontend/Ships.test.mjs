import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../resources/js/prototype3d/vendor/three.module.min.js';
import { createShip } from '../../resources/js/prototype3d/ships.js';
import { shipCatalog } from '../../resources/js/prototype3d/shipCatalog.js';
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
