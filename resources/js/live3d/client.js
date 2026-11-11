export function createLiveClient({
    stateUrl,
    commandUrl,
    token,
    fetcher = fetch,
}) {
    let version = 0,
        pending = null,
        writing = false
    async function json(response) {
        if (
            response.status === 401 ||
            response.status === 419 ||
            response.redirected
        )
            throw Object.assign(new Error('session'), { code: 'session' })
        if (!response.ok)
            throw Object.assign(new Error('request'), {
                code: response.status === 404 ? 'planet' : 'request',
            })
        return response.json()
    }
    return {
        get writing() {
            return writing
        },
        async load(planet) {
            if (writing) return null
            pending?.abort()
            pending = new AbortController()
            const current = ++version,
                url = new URL(stateUrl, location.origin)
            url.searchParams.set('planet', planet)
            try {
                const data = await json(
                    await fetcher(url, {
                        credentials: 'same-origin',
                        cache: 'no-store',
                        headers: { Accept: 'application/json' },
                        signal: pending.signal,
                    }),
                )
                return current === version ? data : null
            } catch (error) {
                if (error.name === 'AbortError' || current !== version)
                    return null
                throw error
            }
        },
        async command(planet, action, payload) {
            if (writing)
                throw Object.assign(new Error('busy'), { code: 'busy' })
            writing = true
            ++version
            pending?.abort()
            try {
                // Never retry writes: refresh state after an uncertain response.
                const result = await json(
                    await fetcher(commandUrl, {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            'X-CSRF-TOKEN': token,
                        },
                        body: JSON.stringify({
                            ...payload,
                            planet,
                            action,
                            _token: token,
                        }),
                    }),
                )
                if (result.status !== 'success' && result.success !== true)
                    throw Object.assign(
                        new Error(
                            result.message ||
                                result.errors?.[0]?.message ||
                                'rejected',
                        ),
                        { code: 'rejected' },
                    )
                return result
            } finally {
                writing = false
            }
        },
        dispose() {
            ++version
            pending?.abort()
        },
    }
}
