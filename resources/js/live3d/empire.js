import { renderDuration } from './duration.js'

export function resourceStatus(resource) {
    if (Number(resource.amount) >= Number(resource.limit)) return 'full'
    return Number(resource.amount) >= Number(resource.limit) * 0.9
        ? 'warning'
        : 'normal'
}
export function renderEmpire(host, worlds, { t, el, number, navigate }) {
    // Polling updates values without replacing a focused control or moving the page.
    const ids = new Set(worlds.map((world) => String(world.id)))
    for (const card of host.querySelectorAll('[data-empire-world]'))
        if (!ids.has(card.dataset.empireWorld)) card.remove()
    for (const world of worlds) {
        let card = host.querySelector(`[data-empire-world="${world.id}"]`)
        if (!card) {
            card = el('article', 'card empire-world')
            card.dataset.empireWorld = world.id
            const header = el('header'),
                image = el('img'),
                name = el('h2'),
                coords = el('p', 'muted')
            image.alt = ''
            const title = el('div')
            title.append(name, coords)
            header.append(image, title)
            const resources = el('div', 'empire-resources'),
                energy = el('p', 'empire-energy'),
                orders = el('div', 'empire-orders'),
                actions = el('div', 'live-groups')
            orders.setAttribute('aria-label', t.activity)
            for (const [label, page] of [
                ['open_world', 'planet'],
                ['open_orders', 'buildings'],
            ]) {
                const button = el('button', '', t[label])
                button.type = 'button'
                button.onclick = () => navigate(page, null, null, world.id)
                actions.append(button)
            }
            card.append(header, resources, energy, orders, actions)
            host.append(card)
        }
        card.querySelector('h2').textContent = world.name
        card.querySelector('header p').textContent =
            `[${world.coordinates}]${world.type === 3 ? ' · ' + t.moon : ''}`
        card.querySelector('img').src = world.image
        const resources = card.querySelector('.empire-resources')
        resources.replaceChildren()
        for (const key of ['metal', 'crystal', 'deuterium']) {
            const value = world.resources[key],
                level = resourceStatus(value),
                row = el('div', 'empire-resource')
            row.dataset.storageState = level
            row.append(
                el('strong', '', t[key]),
                el(
                    'span',
                    '',
                    `${number(value.amount)} / ${number(value.limit)}`,
                ),
                el(
                    'small',
                    '',
                    `${value.hour >= 0 ? '+' : ''}${number(value.hour)} / h`,
                ),
            )
            const meter = el('progress')
            meter.max = Math.max(1, Number(value.limit))
            meter.value = Math.max(0, Number(value.amount))
            meter.setAttribute('aria-label', `${t.storage} ${t[key]}`)
            row.append(meter)
            if (level !== 'normal')
                row.append(
                    el(
                        'b',
                        'empire-alert',
                        t[
                            level === 'full'
                                ? 'storage_full'
                                : 'storage_warning'
                        ],
                    ),
                )
            resources.append(row)
        }
        const energy = card.querySelector('.empire-energy'),
            shortage = world.energy.used > world.energy.made
        energy.dataset.shortage = String(shortage)
        energy.textContent = `${shortage ? '⚠ ' + t.energy_shortage : t.energy}: ${number(world.energy.made)} / ${number(world.energy.used)} · ${number(world.energy.factor)} %`
        const orders = card.querySelector('.empire-orders')
        const orderIds = new Set(
            world.orders.map((order) => `${order.kind}-${order.id}`),
        )
        for (const row of orders.querySelectorAll('[data-empire-order]'))
            if (!orderIds.has(row.dataset.empireOrder)) row.remove()
        orders.querySelector('p')?.remove()
        for (const order of world.orders) {
            const key = `${order.kind}-${order.id}`
            let row = orders.querySelector(`[data-empire-order="${key}"]`)
            if (!row) {
                row = el('button', 'empire-order')
                row.type = 'button'
                row.dataset.empireOrder = key
                const clock = el('span')
                clock.dataset.remaining = order.active
                    ? order.remaining
                    : order.seconds
                renderDuration(clock, order.remaining, t)
                row.append(el('strong'), el('small'), clock)
                orders.append(row)
            }
            row.querySelector('strong').textContent = order.name
            row.querySelector('small').textContent =
                `${order.active ? t.active_order : t.planned_order}${order.quantity ? ' · ' + number(order.quantity) : ' · ' + t.level + ' ' + order.target}`
            const clock = row.lastElementChild
            clock.dataset.remaining = order.active
                ? order.remaining
                : order.seconds
            clock.dataset.active = String(order.active)
            row.onclick = () =>
                navigate(
                    order.kind === 'research'
                        ? 'research'
                        : order.objectType === 'ship'
                          ? 'ships'
                          : order.objectType === 'defense'
                            ? 'defense'
                            : 'buildings',
                    order.objectType,
                    order.objectId,
                    world.id,
                )
        }
        if (!world.orders.length)
            orders.append(el('p', 'muted', t.empty_orders))
    }
}
