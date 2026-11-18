import test from 'node:test'
import assert from 'node:assert/strict'
import { grantRequestId } from '../../resources/js/live3d/adminShipGrants.js'
test('ship grant request IDs are valid distinct version 4 UUIDs', () => {
    const ids = new Set()
    for (let i = 0; i < 100; i++) {
        const id = grantRequestId()
        assert.match(
            id,
            /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
        )
        ids.add(id)
    }
    assert.equal(ids.size, 100)
})
