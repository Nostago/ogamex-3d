import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../resources/js/prototype3d/vendor/three.module.min.js';
import { buildingCatalog } from '../../resources/js/prototype3d/catalog.js';
import { createBuilding } from '../../resources/js/prototype3d/buildings.js';

const keys = ['steel', 'painted', 'dark', 'concrete', 'insulation', 'gold', 'cyan', 'window', 'warmWindow', 'panel', 'purple', 'ore', 'contact'];
const palette = Object.fromEntries(keys.map(key => [key, new THREE.MeshStandardMaterial()]));
for (const id of Object.keys(buildingCatalog)) {
    test(`${id}: complete finite assemblies at every demo level, within geometry budget`, () => {
        let firstSize, lastSize;
        for (let level = 1; level <= 8; level++) {
            const model = createBuilding(id, level, palette);
            for (const animate of model.motion) { animate(0); animate(120); }
            const size = new THREE.Box3().setFromObject(model.group).getSize(new THREE.Vector3());
            assert.ok(size.toArray().every(Number.isFinite));
            assert.ok(size.x < 3.5 && size.z < 3.5 && size.y < 3.5, 'Assembly must fit its lot');
            assert.ok(model.motion.length > 0, 'Every facility must keep operating animations');
            let draws = 0, triangles = 0;
            model.group.traverse(object => {
                if (!object.geometry) return;
                draws++;
                triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
                assert.ok(object.geometry.attributes.position.array.every(Number.isFinite));
                object.geometry.dispose();
            });
            assert.ok(draws <= 130, `${draws} meshes exceeds the per-building budget`);
            assert.ok(triangles < 20000, `${triangles} triangles exceeds the per-building budget`);
            if (level === 1) firstSize = size;
            if (level === 8) lastSize = size;
        }
        assert.ok(lastSize.y > firstSize.y || lastSize.z > firstSize.z, 'Upgrades must change the assembly dimensions');
    });
}
