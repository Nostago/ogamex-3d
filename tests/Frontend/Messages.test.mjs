import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createDemoInbox,
    messageTabs,
} from '../../resources/js/prototype3d/messages.js';
import { createDemoProvider } from '../../resources/js/prototype3d/data.js';
test('inbox follows original tab keys, ten-per-page loading and read state', () => {
    const box = createDemoInbox();
    assert.deepEqual(Object.keys(messageTabs), [
        'fleets',
        'communication',
        'economy',
        'universe',
        'system',
        'favorites',
    ]);
    for (let i = 0; i < 13; i++)
        box.arrival(
            {
                name: `Fleet ${i}`,
                originName: 'A',
                targetName: 'B',
                ships: [{ type: 'probe', count: 1 }],
            },
            i,
        );
    const page = box.page('fleets', 'other');
    assert.equal(page.ids.length, 10);
    assert.equal(page.pages, 2);
    assert.equal(
        box.snapshot().filter((m) => m.key === 'fleet_deployment' && !m.viewed)
            .length,
        3,
    );
    const second = box.page('fleets', 'other', 2);
    assert.equal(second.ids.length, 3);
    assert.equal(
        box.snapshot().filter((m) => m.key === 'fleet_deployment' && !m.viewed)
            .length,
        0,
    );
    assert.equal(box.page('favorites', 'favorites').total, 0);
    assert.throws(() => box.page('constructor', 'other'));
    assert.throws(() => box.page('fleets', 'other', 0));
});
test('deletion and copied message snapshots are isolated from original data', () => {
    const box = createDemoInbox();
    const first = box.snapshot()[0];
    first.params.name = 'modified';
    assert.deepEqual(box.snapshot()[0].params, {});
    box.delete(first.id);
    assert.equal(box.snapshot().length, 4);
    assert.throws(() => box.delete(first.id));
});
test('mail is global across planets and remains bounded; it is never sent to a server', async () => {
    const p = createDemoProvider();
    const read = await p.readMessages('system', 'system');
    assert.equal(read.messages.find((m) => m.tab === 'system').viewed, true);
    await p.selectPlanet('small');
    assert.equal(
        (await p.load()).messages.find((m) => m.tab === 'system').viewed,
        true,
    );
    const box = createDemoInbox();
    for (let i = 0; i < 130; i++)
        box.arrival(
            { name: 'Sample', originName: 'A', targetName: 'B', ships: [] },
            i,
        );
    assert.equal(box.snapshot().length, 100);
});
