import test from 'node:test'
import assert from 'node:assert/strict'
import { strategyShares } from '../../resources/js/live3d/botStrategy.js'
test('percentages and reduced weights display the same strategy proportions', () => {
    assert.deepEqual(strategyShares({ fleet: 2, economy: 1, research: 1 }), {
        fleet: 50,
        economy: 25,
        research: 25,
    })
    assert.deepEqual(
        strategyShares({ fleet: '50', economy: '25', research: '25' }),
        { fleet: 50, economy: 25, research: 25 },
    )
    assert.deepEqual(strategyShares({ fleet: 0, economy: 0, research: 5 }), {
        fleet: 0,
        economy: 0,
        research: 100,
    })
})
test('invalid and zero-only weights cannot produce a misleading percentage preview', () => {
    for (const fleet of [-1, 'wrong', Infinity])
        assert.equal(strategyShares({ fleet, economy: 1, research: 1 }), null)
    assert.equal(strategyShares({ fleet: 0, economy: 0, research: 0 }), null)
})
