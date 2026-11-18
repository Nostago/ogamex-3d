import test from 'node:test'
import assert from 'node:assert/strict'
import {
    replayFrame,
    advanceReplay,
    replayCount,
    sideTypes,
} from '../../resources/js/live3d/battleTimeline.js'
test('replay clock supports initial state, partial rounds, speed, end and backwards seeking', () => {
    assert.deepEqual(replayFrame(0, 6), { index: 0, phase: 1 })
    assert.deepEqual(replayFrame(1.5, 6), { index: 2, phase: 0.5 })
    assert.equal(advanceReplay(0, 1200, 2, 6), 1)
    assert.equal(advanceReplay(0, 1200, 0.5, 6), 0.25)
    assert.equal(advanceReplay(5, 99999, 4, 6), 6)
    assert.deepEqual(replayFrame(-10, 6), { index: 0, phase: 1 })
    assert.deepEqual(replayFrame(99, 6), { index: 6, phase: 1 })
    assert.equal(advanceReplay(0, 3000, 1, 0), 0)
})
test('missing round data stays unknown and counts retain integer precision', () => {
    assert.equal(replayCount(null, 'light_fighter'), null)
    assert.equal(replayCount({}, 'light_fighter'), '0')
    assert.equal(
        replayCount({ light_fighter: '9007199254740993' }, 'light_fighter'),
        '9007199254740993',
    )
    assert.equal(replayCount({ light_fighter: 'NaN' }, 'light_fighter'), null)
    const data = {
        catalog: [
            { key: 'light_fighter' },
            { key: 'rocket_launcher' },
            { key: 'reaper' },
        ],
        frames: [
            { attacker: { units: { light_fighter: '4' } } },
            { attacker: { units: { light_fighter: '0', reaper: '1' } } },
        ],
    }
    assert.deepEqual(
        sideTypes(data, 'attacker').map((unit) => unit.key),
        ['light_fighter', 'reaper'],
    )
})
