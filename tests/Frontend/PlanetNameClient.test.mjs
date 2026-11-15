import test from 'node:test'
import assert from 'node:assert/strict'
import { createLiveClient } from '../../resources/js/live3d/client.js'
globalThis.location = { origin: 'https://ogamex.test' }
test('rename binds explicit planet and CSRF and retains the original validation feedback without retrying', async () => {
    const writes = []
    const client = createLiveClient({
        stateUrl: '/state',
        commandUrl: '/command',
        token: 'fixture-token',
        fetcher: async (url, options) => {
            writes.push(JSON.parse(options.body))
            return new Response(
                JSON.stringify({
                    status: 'error',
                    errorbox: {
                        failed: true,
                        text: 'Der Planetenname ist ungültig.',
                    },
                }),
                { status: 200 },
            )
        },
    })
    await assert.rejects(
        client.command('42', 'rename-planet', { newPlanetName: '-Invalid' }),
        (error) =>
            error.code === 'rejected' &&
            error.message === 'Der Planetenname ist ungültig.',
    )
    assert.deepEqual(writes, [
        {
            newPlanetName: '-Invalid',
            planet: '42',
            action: 'rename-planet',
            _token: 'fixture-token',
        },
    ])
    assert.equal(client.writing, false)
})
