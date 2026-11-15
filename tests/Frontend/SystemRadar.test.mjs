import assert from 'node:assert/strict'
import test from 'node:test'
import {
    systemPosition,
    fleetPoint,
    reportFor,
} from '../../resources/js/live3d/systemRadar.js'
test('every selected home position is central, with fourteen distinct bounded neighbours', () => {
    for (let home = 1; home <= 15; home++) {
        assert.deepEqual(systemPosition(home, home), { x: 50, y: 50 })
        const points = Array.from({ length: 15 }, (_, i) =>
            systemPosition(i + 1, home),
        )
        assert.equal(
            new Set(points.map((point) => `${point.x}:${point.y}`)).size,
            15,
        )
        assert.ok(
            points.every(
                (point) =>
                    point.x >= 0 &&
                    point.x <= 100 &&
                    point.y >= 0 &&
                    point.y <= 100,
            ),
        )
    }
})
test('radar progresses by authoritative flight times and accepts original return direction and holding', () => {
    const fleet = {
        origin: '1:2:8',
        destination: '1:2:3',
        departure: 100,
        arrival: 200,
    }
    const before = fleetPoint(fleet, 1, 2, 8, 0),
        midway = fleetPoint(fleet, 1, 2, 8, 150),
        end = fleetPoint(fleet, 1, 2, 8, 250)
    assert.deepEqual({ x: before.x, y: before.y }, systemPosition(8, 8))
    assert.equal(midway.progress, 0.5)
    assert.equal(midway.x, (before.from.x + before.to.x) / 2)
    assert.deepEqual({ x: end.x, y: end.y }, systemPosition(3, 8))
    const back = fleetPoint(
        { ...fleet, origin: fleet.destination, destination: fleet.origin },
        1,
        2,
        8,
        200,
    )
    assert.deepEqual({ x: back.x, y: back.y }, { x: 50, y: 50 })
    assert.equal(
        fleetPoint({ ...fleet, holding: true }, 1, 2, 8, 150).progress,
        1,
    )
    assert.equal(
        fleetPoint({ ...fleet, origin: '9:499:15' }, 1, 2, 8, 100).from.x,
        99,
    )
})
test('historical reports never become intelligence about a new owner, destroyed world or different body', () => {
    const report = {
            position: 3,
            type: 1,
            targetPlayer: 42,
            assessment: 'armed',
        },
        row = { position: 3, playerId: 42, planets: [{ planetType: 1 }] }
    assert.equal(reportFor([report], row), report)
    assert.equal(reportFor([report], { ...row, playerId: 43 }), null)
    assert.equal(
        reportFor([report], {
            ...row,
            planets: [{ planetType: 1, isDestroyed: true }],
        }),
        null,
    )
    assert.equal(reportFor([report], row, 3), null)
})
