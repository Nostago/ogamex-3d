import { planetTint } from './planetAppearance.js'
import { createFleetTooltip, appendComposition } from './fleetTooltip.js'

import {
    systemPosition,
    fleetPoint,
    reportFor,
    spaceRadarContacts,
} from './systemRadar.js'
import { formatDuration, renderDuration } from './duration.js'
const bodiesOf = (row) =>
    Array.isArray(row.planets) ? row.planets : row.planets ? [row.planets] : []
function plain(value) {
    return (
        new DOMParser().parseFromString(String(value || ''), 'text/html').body
            .textContent || ''
    )
}
export function createSystemMap({
    config,
    t,
    el,
    state,
    actions,
    switchPlanet,
    fleetPanel,
    quickFleet,
    onError,
    number,
    openFleet,
}) {
    const host = document.querySelector('#live-system-map'),
        nodes = document.querySelector('#system-map-nodes'),
        status = document.querySelector('#system-map-status'),
        dialog = document.querySelector('#system-map-dialog'),
        details = document.querySelector('#system-map-details'),
        planner = document.querySelector('#system-map-planner'),
        fleetRoot = document.querySelector('#live-page-fleets'),
        fleetHome = document.createComment('fleet-workspace-home')
    fleetRoot.before(fleetHome)
    let controller,
        key = '',
        data,
        active = false,
        loadedAt = 0,
        lastFocus,
        planning = false,
        tactical = null,
        tacticalRequest,
        tacticalReceived = 0,
        tacticalAttempt = 0,
        selectedRow,
        radarContacts = [],
        radarSignature = ''
    const tooltip = createFleetTooltip({ t, el, number, now })
    function closeActions() {
        if (dialog.open) dialog.close()
    }
    function closePlanner(focus = false) {
        if (!planning) return
        planning = false
        fleetPanel.hide()
        fleetRoot.hidden = true
        fleetHome.after(fleetRoot)
        planner.hidden = true
        if (focus) lastFocus?.focus()
    }
    function openPlan(value) {
        closeActions()
        quickFleet.open(value, { advanced: () => openAdvancedPlan(value) })
    }
    function openAdvancedPlan(value) {
        const target = new URL(value, location.origin)
        closeActions()
        planning = true
        document.querySelector('#system-map-plan-content').append(fleetRoot)
        planner.hidden = false
        fleetRoot.hidden = false
        fleetPanel.show('plan', Object.fromEntries(target.searchParams))
        document.querySelector('#system-map-plan-title').focus()
        planner.scrollIntoView({ behavior: 'instant', block: 'start' })
    }
    function select(row, button) {
        if (!active || !data || nodes.inert) return
        lastFocus = button
        selectedRow = row
        details.replaceChildren()
        const world = state().planet,
            own = state().planets,
            bodies = bodiesOf(row),
            planet = bodies.find((body) => body.planetType === 1)
        document.querySelector('#system-map-dialog-title').textContent =
            `${planet?.planetName || t.free_position} [${data.galaxy}:${data.system}:${row.position}]`
        const owner = plain(row.playerName)
        if (owner)
            details.append(el('p', 'system-map-owner', `${t.owner}: ${owner}`))
        for (const body of bodies) {
            const owned = own.find(
                (item) => String(item.id) === String(body.planetId),
            )
            if (!owned) continue
            const pick = el(
                'button',
                'system-map-select',
                String(owned.id) === String(world.id)
                    ? t.map_current
                    : `${t.map_select}: ${owned.name}${owned.type === 3 ? ' · ' + t.moon : ''}`,
            )
            pick.disabled = String(owned.id) === String(world.id)
            pick.onclick = () => {
                closeActions()
                switchPlanet(owned.id)
            }
            details.append(pick)
        }
        const intelligence = el('section', 'map-intelligence')
        intelligence.id = 'system-map-intelligence'
        details.append(intelligence)
        renderIntel()
        actions.renderActions(details, row, data, {
            close: closeActions,
            openFleet: openPlan,
        })
        dialog.showModal()
    }
    function paint() {
        nodes.replaceChildren()
        const world = state().planet,
            own = state().planets,
            currentPosition = Number(world.coordinates.split(':')[2])
        for (const row of data.rows.filter(
            (row) => row.position >= 1 && row.position <= 15,
        )) {
            const bodies = bodiesOf(row),
                planet = bodies.find((body) => body.planetType === 1),
                moon = bodies.some((body) => body.planetType === 3),
                owned = bodies.some((body) =>
                    own.some(
                        (item) => String(item.id) === String(body.planetId),
                    ),
                ),
                current = Number(row.position) === currentPosition,
                position = systemPosition(row.position, currentPosition),
                button = el('button', 'system-map-node')
            button.type = 'button'
            button.dataset.mapPosition = row.position
            button.dataset.occupied = String(Boolean(planet))
            button.dataset.owned = String(owned)
            button.dataset.current = String(current)
            if (current) button.setAttribute('aria-current', 'location')
            button.style.setProperty('--x', `${position.x}%`)
            button.style.setProperty('--y', `${position.y}%`)
            button.style.setProperty(
                '--planet-colour',
                `#${planetTint(
                    planet?.planetId ||
                        `${data.galaxy}:${data.system}:${row.position}`,
                )
                    .toString(16)
                    .padStart(6, '0')}`,
            )
            const orb = el('span', 'map-orb')
            orb.setAttribute('aria-hidden', 'true')
            const coordinate = `[${data.galaxy}:${data.system}:${row.position}]`,
                name = planet?.planetName || t.free_position
            button.append(
                orb,
                el('strong', 'map-node-name', name),
                el('span', 'map-node-coords', coordinate),
            )
            button.append(
                el(
                    'span',
                    'map-node-state',
                    current
                        ? t.map_current
                        : owned
                          ? t.map_owned
                          : planet
                            ? plain(row.playerName)
                            : t.map_empty,
                ),
            )
            if (moon) button.append(el('span', 'map-node-moon', `◉ ${t.moon}`))
            if (bodies.some((body) => body.planetType === 2))
                button.append(el('span', 'map-node-debris', `◇ ${t.debris}`))
            button.setAttribute(
                'aria-label',
                `${name} ${coordinate}${current ? ' · ' + t.map_current : ''} · ${t.more_actions}`,
            )
            button.setAttribute('aria-haspopup', 'dialog')
            button.onclick = () => select(row, button)
            nodes.append(button)
        }
        document.querySelector('#system-map-title').textContent =
            `${t.map_system} [${data.galaxy}:${data.system}]`
    }
    async function load(force = false) {
        const world = state().planet,
            source = String(world.id)
        if (!force && key === source && data) return
        key = source
        closeActions()
        closePlanner()
        controller?.abort()
        const request = (controller = new AbortController())
        tacticalRequest?.abort()
        tactical = null
        tooltip.hide()
        radarSignature = ''
        radarContacts = []
        document.querySelector('#system-map-radar').replaceChildren()
        document.querySelector('#system-map-flight-lines').replaceChildren()
        document.querySelector('#system-map-fleet-list').replaceChildren()
        nodes.inert = true
        nodes.replaceChildren()
        delete host.dataset.planet
        status.textContent = t.loading
        host.setAttribute('aria-busy', 'true')
        const [galaxy, system] = world.coordinates.split(':').map(Number),
            target = new URL(config.galaxyUrl, location.origin)
        target.search = new URLSearchParams({ planet: source, galaxy, system })
        try {
            const response = await fetch(target, {
                signal: request.signal,
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { Accept: 'application/json' },
            })
            if (response.redirected || [401, 419].includes(response.status))
                throw { code: 'session' }
            if (!response.ok) throw { code: 'request' }
            const result = await response.json()
            if (
                request !== controller ||
                request.signal.aborted ||
                String(state().planet.id) !== source ||
                !active
            )
                return
            data = result
            host.dataset.planet = source
            paint()
            paintConnections()
            loadTactical(source, request)
            nodes.inert = false
            loadedAt = Date.now()
            status.textContent = t.map_hint
        } catch (error) {
            if (
                error.name === 'AbortError' ||
                request !== controller ||
                !active ||
                String(state().planet.id) !== source
            )
                return
            key = ''
            data = null
            status.textContent = t.error_request
            onError(error)
        } finally {
            if (request === controller) host.setAttribute('aria-busy', 'false')
        }
    }
    const svg = (tag, attributes) => {
        const element = document.createElementNS(
            'http://www.w3.org/2000/svg',
            tag,
        )
        for (const [key, value] of Object.entries(attributes))
            element.setAttribute(key, value)
        return element
    }
    function paintConnections() {
        const lines = document.querySelector('#system-map-connections'),
            home = Number(state().planet.coordinates.split(':')[2])
        lines.replaceChildren()
        const positions = Array.from(
            { length: 15 },
            (_, index) => index + 1,
        ).filter((position) => position !== home)
        for (let index = 0; index < positions.length; index++) {
            const from = systemPosition(positions[index], home),
                to = systemPosition(
                    positions[(index + 1) % positions.length],
                    home,
                )
            lines.append(
                svg('line', { x1: from.x, y1: from.y, x2: to.x, y2: to.y }),
            )
            if (index % 3 === 0)
                lines.append(
                    svg('line', { x1: 50, y1: 50, x2: from.x, y2: from.y }),
                )
        }
    }
    function now() {
        return tactical
            ? tactical.serverTime + (Date.now() - tacticalReceived) / 1000
            : Date.now() / 1000
    }
    function age(report) {
        return report?.observed
            ? Math.max(0, now() - report.observed)
            : Infinity
    }
    function riskText(report) {
        if (!report) return t.map_unknown
        return `${t['map_risk_' + report.assessment]}${age(report) >= 86400 ? ' · ' + t.map_stale : ''}`
    }
    function updateIntel() {
        for (const row of data.rows) {
            const button = nodes.querySelector(
                `[data-map-position="${row.position}"]`,
            )
            if (
                !button ||
                button.dataset.occupied !== 'true' ||
                button.dataset.owned === 'true'
            )
                continue
            const report = reportFor(tactical?.reports, row),
                badge =
                    button.querySelector('.map-risk') || el('span', 'map-risk')
            button.dataset.risk = report?.assessment || 'unknown'
            button.dataset.stale = String(!report || age(report) >= 86400)
            badge.textContent = riskText(report)
            button.append(badge)
        }
        if (dialog.open && selectedRow) renderIntel()
    }
    function renderIntel() {
        const host = document.querySelector('#system-map-intelligence')
        if (!host || !selectedRow) return
        host.replaceChildren(el('h3', '', t.map_intel))
        let found = false
        for (const type of [1, 3]) {
            const report = reportFor(tactical?.reports, selectedRow, type)
            if (!report) continue
            found = true
            const group = el('section', 'map-report')
            group.dataset.reportType = type
            group.dataset.assessment = report.assessment
            group.append(
                el('h4', '', type === 3 ? t.moon : t.planet),
                el('strong', 'map-report-risk', riskText(report)),
            )
            group.append(
                el(
                    'p',
                    '',
                    `${t.map_report_time}: ${report.observed ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(report.observed * 1000) : t.map_unknown}`,
                ),
                el('p', 'muted', t.map_intel_hint),
            )
            for (const [key, values] of Object.entries(report.sections)) {
                const section = el('details', 'map-report-section'),
                    summary = el('summary', '', t['map_report_' + key])
                section.append(summary)
                if (key === 'resources') section.open = true
                if (values === null)
                    section.append(el('p', 'muted', t.map_not_observed))
                else if (!values.length)
                    section.append(el('p', '', t.map_none_found))
                else
                    for (const item of values) {
                        const row = el('div', 'stat-line', item.name)
                        row.append(el('strong', '', number(item.amount)))
                        section.append(row)
                    }
                group.append(section)
            }
            host.append(group)
        }
        if (!found)
            host.append(
                el(
                    'p',
                    'muted',
                    tactical ? t.map_no_report : t.map_intel_loading,
                ),
            )
    }
    function paintRadar() {
        const signature = JSON.stringify(tactical?.fleets || [])
        if (signature === radarSignature) {
            tickRadar()
            return
        }
        radarSignature = signature
        tooltip.hide()
        const layer = document.querySelector('#system-map-radar'),
            lines = document.querySelector('#system-map-flight-lines'),
            list = document.querySelector('#system-map-fleet-list')
        layer.replaceChildren()
        lines.replaceChildren()
        list.replaceChildren()
        radarContacts = []
        const fleets = tactical?.fleets || []
        list.append(el('h3', '', `${t.map_radar} · ${number(fleets.length)}`))
        list.append(el('p', 'muted', t.map_radar_hint))
        if (!fleets.length) list.append(el('p', '', t.map_no_contacts))
        for (const fleet of fleets.slice(0, 60)) {
            const marker = el('button', 'system-fleet-contact'),
                entry = el('button', 'map-fleet-entry')
            marker.type = entry.type = 'button'
            marker.dataset.relation = entry.dataset.relation = fleet.relation
            marker.dataset.fleetId = entry.dataset.fleetId = fleet.id
            marker.append(el('span', '', '➤'))
            const title = `${t[`mission_${fleet.mission}`] || fleet.label} · ${fleet.origin} → ${fleet.destination}${fleet.own ? ' · ' + number(fleet.count) + ' ' + t.ships : ''}`
            marker.setAttribute('aria-label', title)
            entry.append(el('strong', '', title), el('span', 'map-fleet-clock'))
            const open = () => {
                if (!active) return
                tooltip.hide()
                selectedRow = null
                document.querySelector('#system-map-dialog-title').textContent =
                    t.map_fleet
                details.replaceChildren(
                    el('h3', '', title),
                    el(
                        'p',
                        '',
                        fleet.returning
                            ? t.map_returning
                            : fleet.holding
                              ? t.map_holding
                              : t.map_outbound,
                    ),
                )
                const clock = el('p', 'map-contact-clock')
                clock.dataset.arrival = fleet.arrival
                details.append(clock)
                appendComposition(details, fleet, t, el, number)
                const movement = el('button', '', t.map_movements)
                movement.onclick = () => {
                    closeActions()
                    openFleet('/fleet/movement')
                }
                details.append(movement)
                lastFocus = marker
                dialog.showModal()
                tickRadar()
            }
            tooltip.bind(marker, fleet)
            tooltip.bind(entry, fleet)
            marker.onclick = entry.onclick = open
            layer.append(marker)
            list.append(entry)
            const line = svg('line', { 'data-relation': fleet.relation })
            lines.append(line)
            radarContacts.push({ fleet, marker, entry, line })
        }
        if (fleets.length > 60)
            list.append(
                el(
                    'p',
                    '',
                    t.map_contacts_limit.replace(
                        ':count',
                        number(fleets.length),
                    ),
                ),
            )
        tickRadar()
    }
    function tickRadar() {
        if (!active || !data || !tactical || document.hidden) return
        tooltip.tick()
        const home = Number(state().planet.coordinates.split(':')[2])
        const layer = document.querySelector('#system-map-radar')
        const points = radarContacts.map(({ fleet }) =>
            fleetPoint(fleet, data.galaxy, data.system, home, now()),
        )
        const displayed = spaceRadarContacts(
            points,
            Math.max(1, layer.clientWidth),
            Math.max(1, layer.clientHeight),
        )
        for (let index = 0; index < radarContacts.length; index++) {
            const { fleet, marker, entry, line } = radarContacts[index],
                point = points[index]
            marker.style.setProperty('--x', `${displayed[index].x}%`)
            marker.style.setProperty('--y', `${displayed[index].y}%`)
            const angle =
                (Math.atan2(
                    (point.to.y - point.from.y) *
                        marker.parentElement.clientHeight,
                    (point.to.x - point.from.x) *
                        marker.parentElement.clientWidth,
                ) *
                    180) /
                Math.PI
            marker.style.setProperty('--angle', `${angle}deg`)
            for (const [key, value] of Object.entries({
                x1: point.from.x,
                y1: point.from.y,
                x2: point.to.x,
                y2: point.to.y,
            }))
                line.setAttribute(key, value)
            const left = Math.max(0, fleet.arrival - now())
            marker.removeAttribute('title')
            if (left)
                renderDuration(entry.querySelector('.map-fleet-clock'), left, t)
            else
                entry.querySelector('.map-fleet-clock').textContent =
                    t.processing
        }
        const clock = details.querySelector('.map-contact-clock')
        if (clock)
            renderDuration(
                clock,
                Math.max(0, Number(clock.dataset.arrival) - now()),
                t,
            )
    }
    async function loadTactical(
        source = String(state().planet.id),
        parent = controller,
    ) {
        tacticalRequest?.abort()
        tacticalAttempt = Date.now()
        const request = (tacticalRequest = new AbortController()),
            url = new URL(config.systemMapUrl, location.origin)
        url.searchParams.set('planet', source)
        try {
            const response = await fetch(url, {
                signal: request.signal,
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { Accept: 'application/json' },
            })
            if (response.redirected || [401, 419].includes(response.status))
                throw { code: 'session' }
            if (!response.ok) throw { code: 'request' }
            const result = await response.json()
            if (
                request.signal.aborted ||
                parent !== controller ||
                !active ||
                String(state().planet.id) !== source
            )
                return
            tactical = result
            tacticalReceived = Date.now()
            updateIntel()
            // Avoid replacing a focused radar contact while its action dialog is open.
            if (!dialog.open || selectedRow) paintRadar()
        } catch (error) {
            if (
                error.name === 'AbortError' ||
                parent !== controller ||
                !active ||
                String(state().planet.id) !== source
            )
                return
            tactical = null
            updateIntel()
            radarContacts = []
            document.querySelector('#system-map-radar').replaceChildren()
            document.querySelector('#system-map-flight-lines').replaceChildren()
            document
                .querySelector('#system-map-fleet-list')
                .replaceChildren(
                    el('p', 'map-tactical-error', t.map_tactical_error),
                )
            if (error.code === 'session') onError(error)
        }
    }
    const radarTimer = setInterval(() => {
        tickRadar()
        if (
            active &&
            !document.hidden &&
            data &&
            Date.now() - tacticalAttempt > 15000 &&
            !planning &&
            !dialog.open
        )
            loadTactical()
    }, 1000)
    document.querySelector('#system-map-close').onclick = closeActions
    document.querySelector('#system-map-plan-close').onclick = () =>
        closePlanner(true)
    document.querySelector('#system-map-refresh').onclick = () => load(true)
    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) {
            const r = dialog.getBoundingClientRect()
            if (
                event.clientX < r.left ||
                event.clientX > r.right ||
                event.clientY < r.top ||
                event.clientY > r.bottom
            )
                closeActions()
        }
    })
    const timer = setInterval(() => {
        if (
            active &&
            !document.hidden &&
            !dialog.open &&
            !planning &&
            Date.now() - loadedAt > 30000
        )
            load(true)
    }, 30000)
    return {
        refreshRadar() {
            if (active && data) loadTactical()
        },
        show(force = false) {
            active = true
            load(force)
        },
        contextChanged() {
            if (active) load()
        },
        hide() {
            active = false
            tooltip.hide()
            nodes.inert = true
            tacticalRequest?.abort()
            controller?.abort()
            key = ''
            closeActions()
            closePlanner()
        },
        dispose() {
            tooltip.dispose()
            clearInterval(timer)
            clearInterval(radarTimer)
            tacticalRequest?.abort()
            controller?.abort()
            closeActions()
            closePlanner()
        },
    }
}
