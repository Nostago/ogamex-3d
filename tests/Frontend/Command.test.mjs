import test from 'node:test'
import assert from 'node:assert/strict'
import { recentMapEvents } from '../../resources/js/live3d/mapEvents.js'
import { resourceStatus } from '../../resources/js/live3d/empire.js'

test('storage status handles overfilled stocks and a zero-capacity world', () => {
    assert.equal(resourceStatus({ amount: 80, limit: 100 }), 'normal')
    assert.equal(resourceStatus({ amount: 90, limit: 100 }), 'warning')
    assert.equal(resourceStatus({ amount: 120, limit: 100 }), 'full')
    assert.equal(resourceStatus({ amount: 0, limit: 0 }), 'full')
})
test('map events expire and never revive a report after an ownership change', () => {
    const now = 1000,
        rows = [{ position: 2, playerId: 7, planets: [{ planetType: 1 }] }],
        data = {
            galaxy: 1,
            system: 2,
            events: [
                { id: 'building-1', kind: 'building', time: 999, position: 8 },
                { id: 'old', time: 699 },
                { id: 'future', time: 1001 },
            ],
            reports: [{ position: 2, type: 1, targetPlayer: 7, observed: 900 }],
            fleets: [
                {
                    id: 2,
                    arrival: 1050,
                    destination: '1:2:2',
                    destinationType: 1,
                },
                { id: 3, arrival: 1050, destination: '1:3:2' },
                { id: 4, arrival: 1061, destination: '1:2:2' },
                { id: 5, arrival: 999, destination: '1:2:2' },
            ],
        }
    assert.deepEqual(
        recentMapEvents(data, rows, now).map((e) => e.kind),
        ['arrival', 'building', 'report'],
    )
    rows[0].playerId = 8
    assert.ok(
        recentMapEvents(data, rows, now).every((e) => e.kind !== 'report'),
    )
    rows[0].playerId = 7
    rows[0].planets[0].isDestroyed = true
    assert.ok(
        recentMapEvents(data, rows, now).every((e) => e.kind !== 'report'),
    )
    assert.equal(
        data.events.length,
        3,
        'event projection must not mutate server data',
    )
})
