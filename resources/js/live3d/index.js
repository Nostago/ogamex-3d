import '../../css/prototype3d.css'
import '../../css/live3d.css'
import { createPlanetScene } from '../prototype3d/scene.js'
import { visualState, modelAliases } from './visualState.js'
import { createLiveClient } from './client.js'
import { renderDashboard } from './dashboard.js'
import { createGalaxy } from './galaxy.js'

const config = JSON.parse(
        document.querySelector('#live-bootstrap').textContent,
    ),
    t = config.t
const client = createLiveClient({
    ...config,
    token: document.querySelector('meta[name="csrf-token"]').content,
})
const root = document.querySelector('#prototype'),
    status = document.querySelector('#live-status'),
    frame = document.querySelector('#live-original')
const pages = [
    'planet',
    'buildings',
    'research',
    'ships',
    'fleets',
    'galaxy',
    'messages',
]
let state = config.initial,
    page = routePage(),
    planet = String(state.planet.id),
    busy = false,
    scene = null,
    mode = 'colony',
    rotating = false,
    selected = {},
    group = 'building',
    quantity = '1',
    received = Date.now(),
    renderedScene = '',
    framePage = '',
    framePlanet = '',
    stopped = false
const number = (value) =>
    new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(
        typeof value === 'string' && /^\d+$/.test(value)
            ? BigInt(value)
            : Number(value),
    )
const el = (tag, cls, text) => {
    const n = document.createElement(tag)
    if (cls) n.className = cls
    if (text !== undefined) n.textContent = text
    return n
}
function routePage() {
    const name = location.hash.slice(1)
    return pages.includes(name) ? name : 'planet'
}
function contextUrl(url) {
    const result = new URL(url, location.origin)
    result.searchParams.set('cp', planet)
    return result.href
}
function objects() {
    return state.objects.filter((item) =>
        page === 'research'
            ? item.type === 'research'
            : page === 'ships'
              ? item.type === 'ship'
              : item.type === group,
    )
}
function show(name, fromFrame = false) {
    page = pages.includes(name) ? name : 'planet'
    if (location.hash !== `#${page}`) location.hash = page
    document.querySelectorAll('[data-live-page]').forEach((n) => {
        if (n.dataset.livePage === page) n.setAttribute('aria-current', 'page')
        else n.removeAttribute('aria-current')
    })
    document.querySelector('#live-heading').textContent = t[page]
    document.querySelector('#live-page-planet').hidden = page !== 'planet'
    document.querySelector('#live-page-catalog').hidden = ![
        'buildings',
        'research',
        'ships',
    ].includes(page)
    document.querySelector('#live-page-galaxy').hidden = page !== 'galaxy'
    document.querySelector('#live-page-original').hidden = ![
        'fleets',
        'messages',
    ].includes(page)
    if (page === 'galaxy') {
        document.querySelector('#live-galaxy-original').href = contextUrl(
            config.links.galaxy,
        )
        galaxy.show()
    }
    if (['fleets', 'messages'].includes(page)) {
        document.querySelector('#live-original-link').href = contextUrl(
            config.links[page],
        )
        if (!fromFrame && (framePage !== page || framePlanet !== planet)) {
            framePage = page
            framePlanet = planet
            frame.src = contextUrl(config.links[page])
        }
    } else renderCatalog()
    if (!fromFrame) window.scrollTo({ top: 0, behavior: 'instant' })
}
function render() {
    const selector = document.querySelector('#live-planet')
    selector.replaceChildren()
    for (const item of state.planets) {
        const option = el(
            'option',
            '',
            `${item.name} [${item.coordinates}]${item.type === 3 ? ' · ' + t.moon : ''}`,
        )
        option.value = item.id
        selector.append(option)
    }
    selector.value = planet
    selector.disabled = busy || stopped
    document.querySelector('#live-context').textContent =
        `${state.player} · ${state.planet.name} [${state.planet.coordinates}]`
    const balances = document.querySelector('#live-resources')
    balances.replaceChildren()
    for (const key of ['metal', 'crystal', 'deuterium']) {
        const value = state.resources[key],
            span = el('span', '', `${t[key]} `)
        span.append(el('strong', '', number(value.amount)))
        span.append(
            el(
                'small',
                'live-rate',
                `${value.hour >= 0 ? '+' : ''}${number(value.hour)} / h`,
            ),
        )
        span.title = `${t.storage}: ${number(value.amount)} / ${number(value.limit)}`
        span.classList.add(`resource-${key}`)
        span.dataset.resource = key
        balances.append(span)
    }
    const energy = el('span', 'resource-energy', t.energy)
    energy.append(
        el(
            'strong',
            '',
            `${number(state.energy.made)} / ${number(state.energy.used)}`,
        ),
        el(
            'small',
            'live-rate',
            `${t.energy_factor}: ${number(state.energy.factor)} %`,
        ),
    )
    balances.append(energy)
    renderDashboard(state, t, el, number, navigate)
    document.querySelector('#live-production-link').href = contextUrl(
        '/resources/settings',
    )
    const visual = visualState(state),
        signature = JSON.stringify(visual)
    if (scene && signature !== renderedScene) {
        try {
            scene.update(visual)
            renderedScene = signature
        } catch {
            scene?.dispose()
            scene = null
            status.textContent = t.scene_unavailable
        }
    }
    renderCatalog()
    renderQueues()
    document.querySelector('#live-refresh').disabled = busy || stopped
}
function renderCatalog() {
    const focus = document.activeElement?.id === 'live-quantity'
    const scroll = document.querySelector('#live-catalog').scrollTop
    const list = document.querySelector('#live-catalog'),
        detail = document.querySelector('#live-detail'),
        groups = document.querySelector('#live-groups')
    groups.replaceChildren()
    if (!['buildings', 'research', 'ships'].includes(page)) return
    if (page === 'buildings')
        for (const kind of ['building', 'station', 'defense']) {
            const button = el('button', '', t[kind])
            button.setAttribute('aria-pressed', String(group === kind))
            button.addEventListener('click', () => {
                group = kind
                renderCatalog()
            })
            groups.append(button)
        }
    const rows = objects()
    list.replaceChildren()
    if (!rows.some((o) => o.id === selected[page])) selected[page] = rows[0]?.id
    for (const item of rows) {
        const button = el('button', 'live-object')
        button.dataset.object = item.key
        button.setAttribute('aria-pressed', String(item.id === selected[page]))
        if (item.image) {
            const image = el('img', 'object-thumbnail')
            image.src = item.image
            image.alt = ''
            image.loading = 'lazy'
            button.append(image)
        }
        const text = el('span', 'object-text')
        text.append(
            el('strong', '', item.name),
            el(
                'small',
                '',
                `${['ship', 'defense'].includes(item.type) ? t.ready : t.level}: ${number(item.amount)}`,
            ),
        )
        const pending =
            item.type === 'ship' || item.type === 'defense'
                ? state.queues.unit
                      .filter((q) => q.objectId === item.id)
                      .reduce((total, q) => total + BigInt(q.quantity), 0n)
                : 0n
        if (pending > 0n)
            text.append(
                el(
                    'small',
                    'production-count',
                    `${number(String(pending))} ${t.in_production}`,
                ),
            )
        button.append(text, el('span', 'object-chevron', '›'))
        button.addEventListener('click', () => {
            selected[page] = item.id
            quantity = '1'
            renderCatalog()
            if (innerWidth < 850) detail.scrollIntoView({ block: 'start' })
        })
        list.append(button)
    }
    const item = rows.find((o) => o.id === selected[page])
    detail.replaceChildren()
    if (!item) {
        detail.append(el('p', '', t.empty))
        return
    }
    if (item.image) {
        const image = el('img', 'detail-image')
        image.src = item.image
        image.alt = ''
        detail.append(image)
    }
    detail.append(
        el('h2', '', item.name),
        el('p', '', item.description),
        el(
            'p',
            '',
            `${['ship', 'defense'].includes(item.type) ? t.ready : t.level}: ${number(item.amount)}`,
        ),
    )
    detail.append(el('h3', '', t.single_cost))
    const costs = el('div', 'cost-grid')
    for (const [key, value] of Object.entries(item.cost)) {
        if (!value) continue
        const row = el('div', `cost-item resource-${key}`, t[key])
        row.append(el('strong', '', number(value)))
        costs.append(row)
    }
    detail.append(
        costs,
        el('p', '', `${t.duration}: ${number(item.seconds)} s`),
    )
    const unit = ['ship', 'defense'].includes(item.type)
    if (item.requirements.length)
        detail.append(
            el(
                'p',
                '',
                `${t.requirements}: ${item.requirements.map((r) => `${r.name} ${r.level}`).join(', ')}`,
            ),
        )
    const reason = state.vacation
        ? t.vacation
        : !item.requirementsMet
          ? t.missing_requirements
          : !item.affordable
            ? t.missing_resources
            : null
    if (reason) detail.append(el('p', '', reason))
    const start = el('button', '', unit ? t.produce : t.start)
    start.id = 'live-start'
    start.disabled = busy || stopped || !!reason
    if (unit) {
        const label = el(
                'label',
                '',
                `${t.quantity} · ${t.available_budget}: ${number(item.maxAmount)}`,
            ),
            input = el('input')
        input.id = 'live-quantity'
        input.type = 'number'
        input.min = 1
        input.step = 1
        input.value = quantity
        const validate = () => {
            start.disabled =
                busy ||
                stopped ||
                !!reason ||
                !/^\d+$/.test(quantity) ||
                BigInt(quantity) < 1n ||
                BigInt(quantity) > BigInt(item.maxAmount)
        }
        input.addEventListener('input', () => {
            quantity = input.value
            validate()
        })
        label.append(input)
        detail.append(label)
        const presets = el('div', 'quantity-presets')
        for (const value of ['1', '10', '100', String(item.maxAmount)]) {
            const preset = el(
                'button',
                '',
                value === String(item.maxAmount) ? t.max : value,
            )
            preset.disabled =
                busy ||
                stopped ||
                BigInt(value) < 1n ||
                BigInt(value) > BigInt(item.maxAmount)
            preset.addEventListener('click', () => {
                quantity = value
                input.value = value
                validate()
            })
            presets.append(preset)
        }
        detail.append(presets)
        validate()
    }
    const action =
        item.type === 'research' ? 'research' : unit ? item.type : 'build'
    start.addEventListener('click', () =>
        command(action, {
            technologyId: item.id,
            ...(unit ? { amount: quantity } : {}),
        }),
    )
    detail.append(start)
    const note = el('p', '', t.server_checks)
    detail.append(note)
    list.scrollTop = scroll
    if (focus)
        document.querySelector('#live-quantity')?.focus({ preventScroll: true })
}
function renderQueues() {
    const host = document.querySelector('#live-queues')
    host.replaceChildren()
    for (const [kind, items] of Object.entries(state.queues)) {
        if (!items.length) continue
        const card = el('section', 'card')
        card.append(el('h2', '', t[`queue_${kind}`]))
        for (const item of items) {
            const row = el('p', 'live-queue')
            row.dataset.queue = kind
            row.append(
                el('strong', '', item.name),
                el(
                    'span',
                    '',
                    item.quantity
                        ? `${t.remaining}: ${number(item.quantity)}`
                        : `${t.target}: ${item.target}`,
                ),
            )
            const time = el('span')
            time.dataset.remaining = item.remaining
            time.dataset.active = String(kind === 'unit' || item.active)
            row.append(time)
            if (kind !== 'unit') {
                const cancel = el('button', '', t.cancel)
                cancel.disabled = busy || stopped
                cancel.addEventListener('click', () => {
                    if (confirm(t.cancel_confirm))
                        command(`cancel-${kind}`, {
                            technologyId: item.objectId,
                            listId: item.id,
                        })
                })
                row.append(cancel)
            }
            card.append(row)
        }
        host.append(card)
    }
    updateCountdowns()
}
function updateCountdowns() {
    for (const node of document.querySelectorAll('[data-progress-remaining]')) {
        if (node.dataset.active === 'true')
            node.value = Math.min(
                node.max,
                Math.max(
                    0,
                    Number(node.dataset.total) -
                        Number(node.dataset.progressRemaining) +
                        (Date.now() - received) / 1000,
                ),
            )
    }
    for (const node of document.querySelectorAll('[data-remaining]')) {
        const left = Math.max(
            0,
            Number(node.dataset.remaining) -
                Math.floor((Date.now() - received) / 1000),
        )
        node.textContent =
            node.dataset.active === 'true'
                ? left
                    ? `${left} s`
                    : t.processing
                : t.queued
    }
}
function failure(error) {
    status.textContent =
        error.code === 'rejected'
            ? error.message
            : t[`error_${error.code}`] || t.error_request
    if (error.code === 'session') {
        stopped = true
        document.querySelector('#live-login').hidden = false
        document
            .querySelectorAll('#live-detail button,#live-queues button')
            .forEach((n) => (n.disabled = true))
    }
}
async function refresh() {
    if (busy || stopped) return
    try {
        const next = await client.load(planet)
        if (next) {
            state = next
            received = Date.now()
            render()
        }
    } catch (error) {
        failure(error)
    }
}
async function command(action, payload) {
    if (busy || stopped) return
    busy = true
    render()
    try {
        await client.command(planet, action, payload)
        status.textContent = t.accepted
    } catch (error) {
        failure(error)
    } finally {
        busy = false
        await refresh()
        render()
    }
}
async function switchPlanet(id) {
    if (busy || stopped) return
    const previous = planet
    planet = String(id)
    try {
        const next = await client.load(planet)
        if (next) {
            state = next
            received = Date.now()
            render()
            show(page)
        }
    } catch (error) {
        planet = previous
        failure(error)
        render()
    }
}
frame.addEventListener('load', () => {
    try {
        const document = frame.contentDocument
        if (!document) return
        const url = new URL(frame.contentWindow.location.href)
        if (url.pathname.startsWith('/login')) {
            failure({ code: 'session' })
            return
        }
        const style = document.createElement('style')
        style.textContent =
            'body{background:#07121f!important;min-width:0!important;color:#bcd3e4}#siteHeader,#siteFooter,#headerbarcomponent,#resourcesbarcomponent,#left,#right,#pageReloader{display:none!important}#pageContent{width:100%!important;min-width:0!important;margin:0!important;padding:0!important}#middle{width:100%!important;min-width:0!important;float:none!important;margin:0!important;padding:0!important}#inhalt{margin:0 auto!important}'
        document.head.append(style)
        // A late load from a hidden original view must not undo navigation or
        // a planet selection in the surrounding interface.
        if (!['fleets', 'messages'].includes(page) || framePlanet !== planet)
            return
        const cp = url.searchParams.get('cp')
        if (
            cp &&
            cp !== planet &&
            state.planets.some((p) => String(p.id) === cp)
        ) {
            switchPlanet(cp)
            return
        }
        const area = url.pathname.startsWith('/fleet')
            ? 'fleets'
            : url.pathname.startsWith('/galaxy')
              ? 'galaxy'
              : url.pathname.startsWith('/messages')
                ? 'messages'
                : null
        if (area === 'galaxy') {
            show('galaxy')
            return
        }
        if (area && area !== page) {
            framePage = area
            show(area, true)
        }
    } catch {
        status.textContent = t.frame_fallback
    }
})
document.querySelectorAll('[data-live-page]').forEach((link) =>
    link.addEventListener('click', (event) => {
        event.preventDefault()
        show(link.dataset.livePage)
    }),
)
window.addEventListener('hashchange', () => {
    const target = routePage()
    if (target !== page) show(target)
})
document
    .querySelector('#live-planet')
    .addEventListener('change', (e) => switchPlanet(e.target.value))
document.querySelector('#live-refresh').addEventListener('click', () => {
    refresh()
    if (page === 'galaxy') galaxy.show(true)
})
function setMode(next) {
    mode = next
    root.dataset.mode = mode
    scene?.setMode(mode)
    document
        .querySelector('#live-colony')
        .setAttribute('aria-pressed', String(mode === 'colony'))
    document
        .querySelector('#live-orbit')
        .setAttribute('aria-pressed', String(mode === 'orbit'))
}
document
    .querySelector('#live-colony')
    .addEventListener('click', () => setMode('colony'))
document
    .querySelector('#live-orbit')
    .addEventListener('click', () => setMode('orbit'))
document
    .querySelector('#live-zoom-in')
    .addEventListener('click', () => scene?.zoom(-2))
document
    .querySelector('#live-zoom-out')
    .addEventListener('click', () => scene?.zoom(2))
document
    .querySelector('#live-camera')
    .addEventListener('click', () => scene?.resetCamera())
document.querySelector('#live-rotate').addEventListener('click', (e) => {
    rotating = !rotating
    scene?.setRotation(rotating)
    e.currentTarget.setAttribute('aria-pressed', String(rotating))
})
function navigate(target, category, id) {
    if (category && ['building', 'station', 'defense'].includes(category))
        group = category
    if (id) selected[target] = id
    show(target)
}
const galaxy = createGalaxy({
    url: config.galaxyUrl,
    t,
    el,
    number,
    context: () => state.planet,
    onError: failure,
    openFleet(url) {
        show('fleets')
        frame.src = contextUrl(url)
        document.querySelector('#live-original-link').href = contextUrl(url)
    },
})
render()
show(page)
try {
    const names = { ...config.models }
    for (const object of state.objects)
        if (modelAliases[object.key])
            names[modelAliases[object.key]] = object.name
    scene = createPlanetScene(
        document.querySelector('#scene'),
        document.querySelector('#scene-labels'),
        (id) => {
            const object = state.objects.find((o) => String(o.id) === id)
            if (object) {
                group = object.type
                selected.buildings = object.id
                show('buildings')
            }
        },
        names,
    )
    scene.update(visualState(state))
    renderedScene = JSON.stringify(visualState(state))
    scene.setMode(mode)
} catch {
    scene?.dispose()
    scene = null
    status.textContent = t.scene_unavailable
}
root.dataset.ready = 'true'
const poll = setInterval(() => {
        if (document.hidden) return
        if (
            Object.values(state.queues).some((items) => items.length) ||
            Date.now() - received >= 15000
        )
            refresh()
    }, 5000),
    clock = setInterval(updateCountdowns, 1000)
window.addEventListener('pagehide', () => {
    clearInterval(poll)
    clearInterval(clock)
    galaxy.dispose()
    client.dispose()
    scene?.dispose()
})
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh()
})
