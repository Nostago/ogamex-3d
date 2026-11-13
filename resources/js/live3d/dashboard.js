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
    let count = 0
    for (const [kind, items] of Object.entries(state.queues)) {
        if (!items.length) continue
        count += items.length
        const item = items[0],
            object = state.objects.find((o) => o.id === item.objectId)
        const button = el('button', 'dock-order')
        const image = el('img')
        if (object?.image) image.src = object.image
        image.alt = ''
        button.append(
            image,
            el('small', '', `${t[`queue_${kind}`]} · ${items.length}`),
            el('strong', '', item.name),
        )
        const countdown = el('span')
        countdown.dataset.remaining = item.remaining
        countdown.dataset.active = String(kind === 'unit' || item.active)
        button.append(countdown)
        const progress = el('progress')
        progress.max = Math.max(1, item.seconds)
        progress.value = Math.max(0, item.seconds - item.remaining)
        progress.dataset.total = item.seconds
        progress.dataset.progressRemaining = item.remaining
        progress.dataset.active = countdown.dataset.active
        progress.setAttribute('aria-label', item.name)
        button.append(progress)
        button.addEventListener('click', () =>
            navigate(
                kind === 'research'
                    ? 'research'
                    : object?.type === 'ship'
                      ? 'ships'
                      : 'buildings',
                object?.type,
                object?.id,
            ),
        )
        dock.append(button)
    }
    if (!count) dock.append(el('p', '', t.no_orders))
}
