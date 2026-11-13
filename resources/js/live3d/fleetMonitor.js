// Counts and the next event come from the original fleet eventbox controller,
// including its original expedition/holding/return rules.
export function createFleetMonitor({
    url,
    t,
    el,
    number,
    navigate,
    onSession,
}) {
    const host = document.querySelector('#live-fleet-events')
    let controller,
        timer,
        received = 0,
        event
    function render() {
        if (!event) return
        host.replaceChildren(el('h2', '', t.fleet_operations))
        for (const kind of ['friendly', 'neutral', 'hostile']) {
            const button = el('button', `stat-line event-${kind}`, t[kind])
            button.append(el('strong', '', number(event[kind])))
            button.addEventListener('click', () => navigate('fleets'))
            host.append(button)
        }
        const next = el('p', 'next-fleet-event')
        if (event.eventTime > 0) {
            next.append(
                el('strong', '', event.eventText),
                el('span', 'fleet-event-clock'),
            )
            host.append(next)
            tick()
        } else host.append(el('p', 'muted', t.no_fleet_events))
    }
    function tick() {
        const node = host.querySelector('.fleet-event-clock')
        if (node)
            node.textContent = `${Math.max(0, event.eventTime - Math.floor((Date.now() - received) / 1000))} s`
    }
    async function refresh() {
        if (controller || document.hidden) return
        controller = new AbortController()
        try {
            const response = await fetch(url, {
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            })
            if (
                response.status === 401 ||
                response.status === 419 ||
                response.redirected
            ) {
                onSession()
                return
            }
            if (!response.ok) throw new Error('fleet_event_request')
            event = await response.json()
            received = Date.now()
            render()
        } catch (error) {
            if (error.name !== 'AbortError') {
                host.replaceChildren(
                    el('h2', '', t.fleet_operations),
                    el('p', 'muted', t.error_request),
                )
            }
        } finally {
            controller = null
        }
    }
    timer = setInterval(() => {
        if (!document.hidden && Date.now() - received > 15000) refresh()
        tick()
    }, 1000)
    refresh()
    return {
        refresh,
        dispose() {
            clearInterval(timer)
            controller?.abort()
        },
    }
}
