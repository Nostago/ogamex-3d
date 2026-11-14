// Presentation only. Every amount and queue entry comes from the Laravel snapshot.
export function renderDashboard(state, t, el, number, navigate) {
    const summary = document.querySelector('#live-overview')
    summary.replaceChildren(
        el('span', 'eyebrow', `[${state.planet.coordinates}]`),
        el('h2', '', state.planet.name),
    )
    const image = el('img', 'planet-portrait')
    image.src = state.planet.image
    image.alt = ''
    summary.prepend(image)
    for (const [key, value] of [
        [
            'fields',
            `${number(state.planet.fieldsUsed)} / ${number(state.planet.fieldsMax)}`,
        ],
        ['diameter', `${number(state.planet.diameter)} km`],
        ['temperature', `${number(state.planet.temperature)} °C`],
        ['energy_factor', `${number(state.energy.factor)} %`],
    ]) {
        const row = el('div', 'stat-line', t[key])
        row.append(el('strong', '', value))
        summary.append(row)
    }
    const production = document.querySelector('#live-production')
    production.replaceChildren(el('h2', '', t.production))
    for (const key of ['metal', 'crystal', 'deuterium']) {
        const data = state.resources[key],
            row = el('div', `production-row resource-${key}`)
        row.append(
            el('span', '', t[key]),
            el(
                'strong',
                '',
                `${data.hour >= 0 ? '+' : ''}${number(data.hour)}`,
            ),
        )
        const meter = el('progress')
        meter.max = Math.max(1, data.limit)
        meter.value = Math.max(0, data.amount)
        meter.setAttribute('aria-label', `${t.storage} ${t[key]}`)
        row.append(meter)
        production.append(row)
    }
    const operations = document.querySelector('#live-operations')
    operations.replaceChildren(el('h2', '', t.operations))
    for (const [key, value, page] of [
        ['ships', number(state.shipTotal), 'ships'],
        ['defenses', number(state.defenseTotal), 'defense'],
        [
            'fleet_slots',
            `${state.fleetSlots.used} / ${state.fleetSlots.max}`,
            'fleets',
        ],
        ['unread', number(state.unread), 'messages'],
    ]) {
        const button = el('button', 'stat-line', t[key])
        button.append(el('strong', '', `${value} ›`))
        button.addEventListener('click', () =>
            navigate(page, key === 'defenses' ? 'defense' : null),
        )
        operations.append(button)
    }
    const inbox = document.querySelector(
        '.main-nav [data-live-page="messages"]',
    )
    inbox.querySelector('.nav-count')?.remove()
    if (state.unread) inbox.append(el('b', 'nav-count', number(state.unread)))
    const dock = document.querySelector('#live-dock')
    dock.replaceChildren(el('h2', '', t.activity))
    dock.append(el('p', 'muted', t.op_activity_scope))
    const items = state.activity || []
    for (const item of items) {
        const object = state.objects.find((o) => o.id === item.objectId)
        const { kind, active } = item
        const button = el('button', 'dock-order')
        button.dataset.orderId = item.id
        button.dataset.orderKind = kind
        button.dataset.orderActive = String(active)
        button.dataset.orderPlanet = item.planet
        const image = el('img')
        image.src = item.image || object?.image || ''
        image.alt = ''
        button.append(
            image,
            el(
                'small',
                '',
                `${t[`queue_${kind}`]} · ${active ? t.current_order : t.following_order}`,
            ),
            el(
                'strong',
                '',
                `${item.name}${kind === 'unit' ? ` · ${number(item.quantity)}` : ` · ${t.level} ${item.target}`}`,
            ),
            el('small', '', `${item.planetName} [${item.coordinates}]`),
        )
        const countdown = el('span')
        countdown.dataset.remaining = item.remaining
        countdown.dataset.active = String(active || kind === 'unit')
        button.append(countdown)
        if (active) {
            const progress = el('progress')
            progress.max = Math.max(1, item.seconds)
            progress.value = Math.max(0, item.seconds - item.remaining)
            progress.dataset.total = item.seconds
            progress.dataset.progressRemaining = item.remaining
            progress.dataset.active = 'true'
            progress.setAttribute('aria-label', item.name)
            button.append(progress)
        }
        const type = item.objectType || object?.type
        button.addEventListener('click', () =>
            navigate(
                kind === 'research'
                    ? 'research'
                    : type === 'ship'
                      ? 'ships'
                      : type === 'defense'
                        ? 'defense'
                        : 'buildings',
                type,
                item.objectId,
                item.planet,
            ),
        )
        dock.append(button)
    }
    if (!items.length) dock.append(el('p', '', t.no_orders))
}
