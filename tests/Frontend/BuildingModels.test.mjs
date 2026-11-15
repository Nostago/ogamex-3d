import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../resources/js/prototype3d/vendor/three.module.min.js';
import { createBuilding, buildingModelTypes } from '../../resources/js/prototype3d/buildings.js';
import { createInfrastructure } from '../../resources/js/prototype3d/infrastructure.js';
import { createLayout } from '../../resources/js/prototype3d/layout.js';
import { fitModelCamera } from '../../resources/js/prototype3d/modelCamera.js';
import { modelAliases } from '../../resources/js/live3d/visualState.js';
const palette = Object.fromEntries([
    'steel', 'painted', 'dark', 'concrete', 'insulation', 'gold', 'cyan',
    'window', 'warmWindow', 'panel', 'purple', 'ore', 'contact',
].map((key) => [key, new THREE.MeshStandardMaterial()]));
function inspect(group) {
    let triangles = 0, meshes = 0;
    group.traverse((part) => {
        if (!part.isMesh) return;
        meshes++;
        const geometry = part.geometry;
        triangles += (geometry.index?.count || geometry.attributes.position.count) / 3;
        assert.ok([...geometry.attributes.position.array].every(Number.isFinite));
    });
    const bounds = new THREE.Box3().setFromObject(group);
    assert.ok(bounds.min.y >= -0.08);
    assert.ok(bounds.max.y > 0.6 && bounds.max.y < 5);
    return { triangles, meshes, size: bounds.getSize(new THREE.Vector3()).toArray() };
}
function dispose(group) { group.traverse((part) => part.geometry?.dispose()); }
test('all original buildings and defenses use finite, bounded detailed model geometry', () => {
    assert.equal(Object.keys(modelAliases).length, 29);
    for (const type of new Set(Object.values(modelAliases))) {
        assert.ok(buildingModelTypes.includes(type));
        for (const level of [1, 5, 8, 100]) {
            const { group } = createBuilding(type, level, palette);
            const measured = inspect(group);
            assert.ok(measured.meshes <= 20, `${type}: ${measured.meshes} draw batches`);
            assert.ok(measured.triangles < 20000, `${type}: geometry budget`);
            assert.ok(measured.size[0] >= 2.6 && measured.size[0] < 4);
            dispose(group);
        }
    }
});
test('upgrades add bounded modules while high gameplay levels cannot explode model cost', () => {
    for (const type of buildingModelTypes) {
        const low = createBuilding(type, 1, palette),
            high = createBuilding(type, 8, palette),
            extreme = createBuilding(type, 100, palette);
        assert.ok(inspect(high.group).triangles > inspect(low.group).triangles, type);
        assert.deepEqual(inspect(extreme.group), inspect(high.group), type);
        [low, high, extreme].forEach(({ group }) => dispose(group));
    }
});
test('roads and traffic remain valid for empty, partial and complete colonies', () => {
    const layout = createLayout(8, 32);
    for (const count of [0, 1, 2, 3, 4, 19, 29]) {
        const network = createInfrastructure(palette, layout.slice(0, count), 8);
        assert.ok(network.roadCount >= count);
        for (const time of [0, 1, 1000]) network.animate(time, true);
        network.group.traverse((part) => {
            assert.ok(part.position.toArray().every(Number.isFinite));
            if (part.geometry) assert.ok([...part.geometry.attributes.position.array].every(Number.isFinite));
        });
        dispose(network.group);
        network.dispose();
    }
});

test('model cameras keep all corners visible on wide and narrow detail panels', () => {
    for (const type of buildingModelTypes) {
        const model = createBuilding(type, 8, palette);
        const size = new THREE.Box3().setFromObject(model.group).getSize(new THREE.Vector3());
        for (const aspect of [0.7, 4 / 3, 2.2]) {
            const camera = new THREE.PerspectiveCamera(34, aspect, 0.05, 100);
            fitModelCamera(camera, size);
            camera.updateMatrixWorld();
            for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
                const point = new THREE.Vector3(x * size.x, y * size.y, z * size.z).multiplyScalar(0.5).project(camera);
                assert.ok(Math.abs(point.x) < 0.94 && Math.abs(point.y) < 0.94, `${type}: aspect ${aspect}`);
                assert.ok(point.z > -1 && point.z < 1);
            }
        }
        dispose(model.group);
    }
});

test('grounded models omit raised plinths and roads carry crates to plot boundaries', async () => {
    const {createSiteGround,sitePort,roadPoint,colonyDeckHeight}=await import('../../resources/js/prototype3d/colonyGround.js')
    for(const radius of [8,9.5,12]){
        const sites=createLayout(radius,32).slice(0,4)
        const infrastructure=createInfrastructure(palette,sites,radius,{grounded:true})
        assert.equal(infrastructure.parcelCount,6)
        const parcels=infrastructure.group.children.filter(o=>o.userData.transport==='parcel')
        assert.equal(parcels.length,6)
        assert.ok(parcels.every(p=>p.children.length===3))
        for(const time of [0,5,14,29,57]){
            infrastructure.animate(time,true)
            for(const parcel of parcels)assert.ok(parcel.position.length()>=radius+colonyDeckHeight-0.001)
        }
        const {siteGroundHeight}=await import('../../resources/js/prototype3d/colonyGround.js')
        for(const route of infrastructure.routes)for(let step=0;step<=40;step++){
            const point=infrastructure.sample(route,step/40)
            for(const site of sites){
                const normal=new THREE.Vector3(...site.normal)
                const local=point.clone().addScaledVector(normal,-radius).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(normal,new THREE.Vector3(0,1,0)))
                if(Math.max(Math.abs(local.x),Math.abs(local.z))<1.6)assert.ok(local.y>=siteGroundHeight(radius,local.x,local.z)+0.01,'Roads and packages must stay above graded ground')
            }
        }
        const a=sites[0],b=sites[1],start=sitePort(a,radius,true,b),end=sitePort(b,radius,true,a)
        for(let step=0;step<=100;step++){
            const point=roadPoint(start,end,radius,step/100)
            assert.ok(point.length()>=radius+colonyDeckHeight-0.0001)
            for(const site of [a,b]){
                const normal=new THREE.Vector3(...site.normal)
                const local=point.clone().addScaledVector(normal,-radius).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(normal,new THREE.Vector3(0,1,0)))
                assert.ok(Math.abs(local.x)>=1.32||Math.abs(local.z)>=1.27,'Parcel route must not cross a building footprint')
            }
        }
        const ground=createSiteGround(radius),positions=ground.attributes.position
        for(let i=0;i<positions.count;i++){
            const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i)
            if(Math.max(Math.abs(x),Math.abs(z))<1.35)assert.ok(Math.abs(y-colonyDeckHeight)<0.0001)
        }
        ground.dispose();dispose(infrastructure.group);infrastructure.dispose()
    }
    for(const type of ['metal','crystal','deuterium','solar']){
        const model=createBuilding(type,5,palette,{grounded:true})
        assert.equal(model.group.userData.grounded,true)
        assert.ok(model.group.position.y<0)
        dispose(model.group)
    }
})
