import { reportFor } from './systemRadar.js'

// Presentation of already disclosed data. No discovery of foreign inventories.
export function recentMapEvents(tactical, rows, now) {
    const events = (tactical?.events || []).filter(
        (e) => now - e.time >= 0 && now - e.time <= 300,
    )
    for (const row of rows || []) {
        for (const type of [1, 3]) {
            const report = reportFor(tactical?.reports, row, type)
            if (
                report?.observed &&
                now - report.observed >= 0 &&
                now - report.observed <= 300
            )
                events.push({
                    id: `report-${row.position}-${type}-${report.observed}`,
                    kind: 'report',
                    time: report.observed,
                    position: row.position,
                    type,
                })
        }
    }
    for (const fleet of tactical?.fleets || []) {
        const [g, s, p] = fleet.destination.split(':').map(Number)
        if (
            !fleet.holding &&
            g === tactical.galaxy &&
            s === tactical.system &&
            fleet.arrival >= now &&
            fleet.arrival - now <= 60
        )
            events.push({
                id: `arrival-${fleet.id}-${fleet.arrival}`,
                kind: 'arrival',
                time: fleet.arrival,
                position: p,
                type: fleet.destinationType,
                name: fleet.label,
            })
    }
    return events.sort((a, b) => b.time - a.time).slice(0, 12)
}
export function createMapEvents({ host, nodes, t, el }) {
    const toggle = document.querySelector('#map-event-animations')
    let seen = new Set(),
        signature = '',
        scope = ''
    try {
        toggle.checked =
            localStorage.getItem('ogamex-map-event-animations') !== 'off'
    } catch {}
    const apply = () => {
        host.dataset.eventAnimations = String(toggle.checked)
    }
    toggle.onchange = () => {
        apply()
        try {
            localStorage.setItem(
                'ogamex-map-event-animations',
                toggle.checked ? 'on' : 'off',
            )
        } catch {}
    }
    apply()
    return {
        render(tactical, rows, now) {
            if (!tactical) return
            const nextScope = `${tactical.galaxy}:${tactical.system}`
            if (scope !== nextScope) {
                seen = new Set()
                signature = ''
                scope = nextScope
            }
            const events = recentMapEvents(tactical, rows, now),
                nextSignature = JSON.stringify(events)
            if (signature === nextSignature) return
            signature = nextSignature
            const list = document.querySelector('#map-recent-events')
            list.replaceChildren()
            nodes
                .querySelectorAll('.map-event-badge')
                .forEach((n) => n.remove())
            for (const event of events) {
                const label = `${t['event_' + event.kind]}${event.name ? ' · ' + event.name : ''}${event.level ? ' · ' + t.event_level + ' ' + event.level : ''}`
                const node = nodes.querySelector(
                    `[data-map-position="${event.position}"]`,
                )
                if (!node) continue
                const badge = el(
                    'span',
                    'map-event-badge',
                    t['event_' + event.kind],
                )
                badge.title = label
                badge.dataset.eventKind = event.kind
                if (!seen.has(event.id)) badge.classList.add('map-event-new')
                if (!node.querySelector('.map-event-badge')) node.append(badge)
                const entry = el(
                    'button',
                    'map-event-entry',
                    `${label} · [${tactical.galaxy}:${tactical.system}:${event.position}]${event.type === 3 ? ' · ' + t.moon : ''}`,
                )
                entry.type = 'button'
                entry.onclick = () => node.click()
                list.append(entry)
                seen.add(event.id)
            }
            if (!events.length) list.append(el('p', 'muted', t.event_empty))
            // Bound memory even in a tab open for days.
            if (seen.size > 200) seen = new Set(events.map((e) => e.id))
        },
        reset() {
            signature = ''
        },
        clear() {
            signature = ''
            document.querySelector('#map-recent-events').replaceChildren()
            nodes
                .querySelectorAll('.map-event-badge')
                .forEach((n) => n.remove())
        },
    }
}
