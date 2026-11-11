import '../../css/prototype3d.css'
import {
    createDemoProvider,
    planBuild,
    checkUpgrade,
    checkShipBuild,
} from './data.js'
import { shipCatalog } from './shipCatalog.js'
import {
    fleetExamples,
    maxOrderQuantity,
    modelsPerFormation,
    pendingCount,
} from './fleet.js'
import { buildingCatalog, buildingTypes } from './catalog.js'
import { pages, pageFromHash } from './navigation.js'
import { buildingGroups, buildingGroup } from './buildingGroups.js'
import { createFleetManager } from './fleetManagerUi.js'
import { createPlanetScene } from './scene.js'

const t = JSON.parse(
    document.querySelector('#prototype-translations').textContent,
)
const provider = createDemoProvider()
const root = document.querySelector('#prototype'),
    status = document.querySelector('#render-status')
const list = document.querySelector('#building-list'),
    info = document.querySelector('#building-info')
const builder = document.querySelector('#builder')
const number = new Intl.NumberFormat('de-DE')
const icons = {
    metal: '▥',
    crystal: '◈',
    deuterium: '◉',
    solar: '☀',
    shipyard: '◇',
    research: '◎',
    robotics: '⚙',
    metalStorage: '▤',
    crystalStorage: '▤',
    deuteriumStorage: '▤',
    rocket: '⋮',
    laser: '⊕',
    terraformer: '◌',
    nanite: '⬡',
    fusion: '⦿',
}
const planets = await provider.listPlanets()
let state = await provider.load()
let selected = 'metal',
    scene,
    busy = false,
    rotating = false,
    operation = 0,
    placing = false
let chosenType = 'terraformer',
    chosenShip = 'lightFighter',
    chosenQuantity = '10000',
    activeOrder = null,
    selectedShip = 'ship-lightFighter'
let page = pageFromHash(location.hash),
    planetView = 'colony'
const previews = { buildings: false, ships: false, fleets: false }
const scenePanel = document.querySelector('.scene-panel')
const fleetManager = createFleetManager({
    host: document.querySelector('#fleet-management'),
    getState: () => state,
    provider,
    t,
    number,
    isBusy: () => busy,
    onChange(snapshot) {
        state = snapshot
        scene?.update(state)
        renderUi()
    },
})
function element(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
}
function metric(building) {
    if (building.type === 'terraformer')
        return `${number.format(building.value)} ${t.fields_unit}`
    const suffix = {
        production: t.per_hour,
        energy: t.energy,
        capacity: t.capacity_unit,
        facility: t.demo_points,
        defense: t.demo_points,
    }
    return `${number.format(building.value)} ${suffix[building.metric]}`
}
function select(id, fromScene = false) {
    if (busy) return
    if (state.formations.some((ship) => ship.id === id)) {
        showShip(id, fromScene)
        return
    }
    stopRotation()
    selected = id
    placing = false
    scene?.select(id)
    navigate('buildings', fromScene)
    scene?.focus(id)
    renderUi()
}
function appendProgress(parent, label = t.working) {
    const construction = element('div', 'construction-status')
    construction.append(element('span', '', label))
    const progress = element('progress')
    progress.id = 'build-progress'
    progress.max = 1
    progress.value = 0
    progress.setAttribute('aria-label', t.build_progress)
    construction.append(progress)
    parent.append(construction)
}
function message(error) {
    return t[`error_${error.code}`] || t.build_error
}
async function perform(action, id, type) {
    if (busy) return
    let plan
    try {
        plan =
            action === 'build'
                ? planBuild(state, type)
                : checkUpgrade(state, id)
    } catch (error) {
        status.textContent = message(error)
        renderUi()
        return
    }
    const planetId = state.planet.id,
        token = ++operation
    busy = true
    root.dataset.building = action === 'build' ? type : id
    status.textContent = t.working
    if (action === 'build') scene?.focus(plan.siteId)
    renderUi()
    try {
        const completed = scene
            ? await scene.animateUpgrade(
                  id,
                  action === 'build' ? plan.siteId : null,
              )
            : true
        if (!completed || token !== operation || state.planet.id !== planetId)
            return
        const snapshot =
            action === 'build'
                ? await provider.build(type)
                : await provider.upgrade(id)
        if (token !== operation) return
        state = snapshot
        if (action === 'build') {
            selected = state.buildings.find(
                (building) => building.siteId === plan.siteId,
            ).id
            placing = false
        }
        scene?.update(state)
        scene?.select(selected)
        if (action === 'build') scene?.focus(selected)
        status.textContent = action === 'build' ? t.built : t.upgraded
    } catch (error) {
        if (token === operation) status.textContent = message(error)
    } finally {
        if (token === operation) {
            busy = false
            delete root.dataset.building
            renderUi()
        }
    }
}
function renderPlanet() {
    const selector = document.querySelector('#planet-select')
    if (!selector.options.length) {
        for (const profile of planets) {
            const option = element(
                'option',
                '',
                `${profile.name} · ${t[`planet_${profile.id}`]}`,
            )
            option.value = profile.id
            selector.append(option)
        }
    }
    selector.value = state.planet.id
    document.querySelector('#context-name').textContent =
        `${state.name} · ${state.coordinates}`
    document.querySelector('#context-fields').textContent =
        `${state.capacity.field_current} / ${state.capacity.effective_max} ${t.fields_unit}`
    document.querySelector('#overview-fleet').textContent = number.format(
        state.managedFleets.length,
    )
    document.querySelector('#overview-pending').textContent = number.format(
        state.fleetSummary.pending,
    )
    document.querySelector('#cancel-operation').hidden = !busy
    document.querySelector('#planet-name').textContent = state.name
    document.querySelector('#planet-coordinates').textContent =
        state.coordinates
    document.querySelector('#planet-diameter').textContent =
        `${number.format(state.planet.diameter)} km`
    document.querySelector('#fields-used').textContent =
        `${state.capacity.field_current} / ${state.capacity.effective_max}`
    document.querySelector('#fields-free').textContent = String(
        state.capacity.remaining,
    )
    document.querySelector('#terraformer-effect').textContent =
        `${t.base_fields}: ${state.capacity.field_max} · ${t.terraformer}: ${t.level} ${state.capacity.terraformer} (+${state.capacity.terraformer_bonus})`
    const meter = document.querySelector('#capacity-meter')
    meter.max = state.capacity.effective_max
    meter.value = state.capacity.field_current
    document.querySelector('#plot-summary').textContent =
        `${state.buildings.length} ${t.visual_facilities}`
}
function renderBuilder() {
    builder.replaceChildren()
    builder.hidden = !placing || root.dataset.mode === 'orbit'
    document
        .querySelector('#toggle-build')
        .setAttribute('aria-expanded', String(placing))
    document.querySelector('#toggle-build').disabled = busy
    const available = Object.values(buildingCatalog).filter(
        (type) =>
            type.repeatable ||
            !state.buildings.some((building) => building.type === type.id),
    )
    if (!available.some((type) => type.id === chosenType))
        chosenType = available[0]?.id ?? ''
    builder.append(
        element('h3', '', t.build_menu),
        element('p', 'builder-note', t.build_note),
    )
    const typeLabel = element('label', '', t.choose_facility),
        typeSelect = element('select')
    typeSelect.id = 'build-type'
    typeSelect.disabled = busy || !available.length
    for (const category of buildingGroups) {
        const group = element('optgroup')
        group.label = t[`building_group_${category}`]
        for (const type of available.filter(
            (item) => buildingGroup(item.id) === category,
        )) {
            const option = element('option', '', t[type.id])
            option.value = type.id
            group.append(option)
        }
        if (group.children.length) typeSelect.append(group)
    }
    typeSelect.value = chosenType
    typeSelect.addEventListener('change', () => {
        chosenType = typeSelect.value
        renderBuilder()
    })
    typeLabel.append(typeSelect)
    builder.append(typeLabel)
    let reason = null
    try {
        planBuild(state, chosenType)
    } catch (error) {
        reason = message(error)
    }
    builder.append(element('p', 'builder-note', t.auto_layout))
    if (chosenType)
        builder.append(
            element(
                'p',
                'builder-note',
                buildingCatalog[chosenType].consumesField
                    ? t.field_cost
                    : t.field_free,
            ),
        )
    if (reason) {
        const warning = element('p', 'capacity-warning', reason)
        warning.id = 'build-limit'
        warning.setAttribute('role', 'status')
        builder.append(warning)
    }
    if (busy && placing) appendProgress(builder)
    const build = element('button', 'upgrade-button', t.build)
    build.id = 'build-facility'
    build.disabled = busy || !!reason || !chosenType
    build.addEventListener('click', () => perform('build', null, chosenType))
    builder.append(build)
}
function renderUi() {
    renderPlanet()
    list.replaceChildren()
    const summary = document.querySelector('#production-summary')
    summary.replaceChildren()
    for (const building of state.buildings.filter((item) =>
        buildingTypes.includes(item.type),
    )) {
        const card = element('div', `resource ${building.type}`)
        card.append(
            element(
                'span',
                'resource-name',
                `${icons[building.type]} ${t[building.type]}`,
            ),
            element('strong', '', number.format(building.value)),
            element(
                'small',
                '',
                building.type === 'solar' ? t.energy : t.per_hour,
            ),
        )
        summary.append(card)
    }
    const matches = state.buildings
    for (const kind of buildingGroups) {
        const entries = matches.filter(
            (item) => buildingGroup(item.type) === kind,
        )
        if (!entries.length) continue
        const section = element('section', 'building-category')
        section.dataset.category = kind
        section.append(
            element(
                'h2',
                'category-title',
                `${t[`building_group_${kind}`]} · ${entries.length}`,
            ),
        )
        for (const building of entries) {
            const button = element(
                'button',
                `building-item ${building.id === selected ? 'selected' : ''}`,
            )
            button.dataset.building = building.id
            button.disabled = busy
            button.setAttribute(
                'aria-pressed',
                String(building.id === selected),
            )
            const name = element('span', 'building-name')
            name.append(
                element('strong', '', t[building.type]),
                element('small', '', metric(building)),
            )
            button.append(
                element(
                    'span',
                    `building-icon ${building.type}`,
                    icons[building.type],
                ),
                name,
                element('span', 'level-badge', `${t.level} ${building.level}`),
            )
            button.addEventListener('click', () => select(building.id))
            section.append(button)
        }
        list.append(section)
    }
    if (!matches.length) {
        const empty = element('p', 'muted', t.no_building_results)
        empty.id = 'empty-buildings'
        list.append(empty)
    }
    document.querySelector('#structure-count').textContent = String(
        state.buildings.length,
    ).padStart(2, '0')
    const building = state.buildings.find((item) => item.id === selected)
    info.replaceChildren()
    info.hidden = false
    info.append(
        element('span', 'eyebrow', t.selected),
        element('h3', '', t[building.type]),
        element('p', '', t[`${building.type}_description`]),
    )
    const details = element('div', 'detail-stats')
    details.append(
        element('span', '', t.level),
        element('strong', 'detail-level', `${building.level} / 8`),
        element(
            'span',
            '',
            building.type === 'terraformer'
                ? t.terraformer_bonus
                : t[`metric_${building.metric}`],
        ),
        element('strong', '', metric(building)),
    )
    info.append(details)
    if (busy && !placing && !activeOrder)
        appendProgress(
            info,
            root.dataset.building?.startsWith('ship-')
                ? t.ship_working
                : t.working,
        )
    let blocked = null
    try {
        checkUpgrade(state, selected)
    } catch (error) {
        blocked = message(error)
    }
    if (blocked && building.level < 8)
        info.append(element('p', 'capacity-warning', blocked))
    const upgrade = element(
        'button',
        'upgrade-button',
        busy
            ? root.dataset.building?.startsWith('ship-')
                ? t.ship_working
                : t.working
            : building.level >= 8
              ? t.maximum
              : `${t.upgrade} → ${building.level + 1}`,
    )
    upgrade.id = 'upgrade-building'
    upgrade.disabled = busy || !!blocked
    upgrade.addEventListener('click', () => perform('upgrade', selected))
    info.append(upgrade)
    if (building.type === 'shipyard') {
        const link = element(
            'a',
            'secondary-link',
            t.to_ship_construction + ' →',
        )
        link.href = '#ships'
        info.append(link)
    }
    const shipBuilder = document.querySelector('#ship-builder')
    shipBuilder.replaceChildren()
    renderShipyard(shipBuilder)
    const yard = state.buildings.find((item) => item.type === 'shipyard')
    const yardSummary = document.querySelector('#shipyard-summary')
    yardSummary.replaceChildren()
    yardSummary.append(
        element('h2', '', t.shipyard),
        element(
            'span',
            '',
            yard ? `${t.level} ${yard.level}` : t.error_shipyard_required,
        ),
    )
    renderFleet()
    renderShipStock()
    renderOrders()
    renderBuilder()
}
function renderShipyard(parent) {
    const section = element('section', 'shipyard-controls')
    section.append(
        element('h4', '', t.ship_construction),
        element('p', 'builder-note', t.ship_demo),
    )
    const label = element('label', '', t.choose_ship),
        chooser = element('select')
    chooser.id = 'ship-type'
    chooser.disabled = busy
    for (const type of Object.keys(shipCatalog)) {
        const option = element('option', '', t[type])
        option.value = type
        chooser.append(option)
    }
    chooser.value = chosenShip
    chooser.addEventListener('change', () => {
        chosenShip = chooser.value
        renderShipStock()
    })
    label.append(chooser)
    section.append(label)
    const quantityLabel = element('label', '', t.ship_quantity)
    const quantity = element('input')
    quantity.id = 'ship-quantity'
    quantity.type = 'number'
    quantity.min = '1'
    quantity.max = String(maxOrderQuantity)
    quantity.step = '1'
    quantity.value = chosenQuantity
    quantity.disabled = busy
    quantityLabel.append(quantity)
    section.append(quantityLabel)
    const warning = element('p', 'capacity-warning')
    warning.id = 'quantity-error'
    warning.setAttribute('role', 'status')
    let reason
    try {
        checkShipBuild(state, chosenShip, Number(chosenQuantity))
    } catch (error) {
        reason = message(error)
    }
    const button = element('button', 'upgrade-button', t.build_ship)
    button.id = 'build-ship'
    button.disabled = busy || !!reason
    button.addEventListener('click', enqueueShip)
    section.append(button)
    warning.textContent = reason || ''
    warning.hidden = !reason
    section.append(warning)
    quantity.addEventListener('input', () => {
        chosenQuantity = quantity.value
        try {
            checkShipBuild(state, chosenShip, Number(chosenQuantity))
            reason = null
        } catch (error) {
            reason = message(error)
        }
        warning.textContent = reason || ''
        warning.hidden = !reason
        button.disabled = busy || !!reason
    })
    parent.append(section)
}
function showShip(id, fromScene = false) {
    if (busy) return
    selectedShip = id
    stopRotation()
    if (page === 'planet' && planetView === 'orbit') {
        scene?.focusShip(id)
        renderOrbitDetails()
        return
    }
    navigate('planet')
    setPlanetView('orbit')
    scene?.focusShip(id)
    renderOrbitDetails()
}
function renderOrbitDetails() {
    const panel = document.querySelector('#planet-orbit-info')
    panel.replaceChildren()
    panel.hidden = planetView !== 'orbit'
    panel.append(
        element('h2', '', t.orbit),
        element('p', 'muted', t.orbit_description),
    )
    if (!state.formations.some((item) => item.id === selectedShip))
        selectedShip = state.formations[0]?.id
    const item = state.formations.find((item) => item.id === selectedShip)
    if (item)
        panel.append(
            element('h3', '', t[item.type]),
            element(
                'strong',
                '',
                `${number.format(item.count)} ${t.ship_ready}`,
            ),
            element('p', 'muted', t.representative_note),
        )
}
function renderShipStock() {
    const host = document.querySelector('#ship-stock')
    host.replaceChildren()
    host.append(element('h2', '', t.ship_overview))
    const cards = element('div', 'ship-stock-grid')
    for (const item of state.shipInventory) {
        const card = element(
            'article',
            `ship-stock-card ${chosenShip === item.type ? 'selected' : ''}`,
        )
        card.id = `stock-${item.type}`
        const button = element('button', '', t[item.type])
        button.disabled = busy
        button.addEventListener('click', () => {
            chosenShip = item.type
            renderUi()
        })
        card.append(button)
        for (const [key, value] of [
            ['ready', item.ready],
            ['in_production', item.inProduction],
            ['available', item.available],
            ['on_mission', item.onMission],
        ]) {
            if (key === 'on_mission' && !value) continue
            const row = element('div', `stock-line stock-${key}`)
            row.append(
                element('strong', '', number.format(value)),
                element('span', '', t[key === 'ready' ? 'ship_ready' : key]),
            )
            card.append(row)
        }
        cards.append(card)
    }
    host.append(cards, element('p', 'muted', t.stock_note))
}
function renderOrders() {
    const panel = document.querySelector('#ship-orders')
    panel.replaceChildren()
    panel.hidden = false
    panel.append(
        element('h3', '', t.ship_orders),
        element('p', 'builder-note', t.order_note),
    )
    const total = element(
        'p',
        '',
        `${t.pending_total}: ${number.format(state.fleetSummary.pending)}`,
    )
    total.id = 'pending-total'
    panel.append(total)
    const queued = state.orders.filter((item) => item.status === 'queued')
    for (const order of queued) {
        const row = element('div', 'order-row')
        row.dataset.order = order.id
        row.append(
            element(
                'strong',
                '',
                `${number.format(order.quantity)} × ${t[order.type]}`,
            ),
            element(
                'small',
                '',
                order.id === activeOrder ? t.ship_working : t.order_queued,
            ),
        )
        if (order.id === activeOrder) {
            const progress = element('progress')
            progress.id = 'build-progress'
            progress.max = 1
            progress.value = 0
            progress.setAttribute('aria-label', t.build_progress)
            row.append(progress)
        }
        const cancel = element('button', 'text-button', t.cancel_order)
        cancel.disabled = busy
        cancel.addEventListener('click', async () => {
            state = await provider.cancelShipOrder(order.id)
            renderUi()
        })
        row.append(cancel)
        panel.append(row)
    }
    if (!queued.length) panel.append(element('p', 'builder-note', t.no_orders))
    const start = element('button', 'upgrade-button', t.start_order)
    start.id = 'start-ship-order'
    start.disabled = busy || !queued.length
    start.addEventListener('click', () => performShip(queued[0].id))
    panel.append(start)
    for (const order of state.orders
        .filter((item) => item.status !== 'queued')
        .slice(-5)) {
        panel.append(
            element(
                'p',
                'order-history',
                `${number.format(order.quantity)} × ${t[order.type]} · ${t[`order_${order.status}`]}`,
            ),
        )
    }
}
async function enqueueShip() {
    if (busy) return
    try {
        state = await provider.enqueueShip(chosenShip, Number(chosenQuantity))
        status.textContent = t.order_added
        renderUi()
    } catch (error) {
        status.textContent = message(error)
        renderUi()
    }
}
function renderFleet() {
    fleetManager.render()
    renderOrbitDetails()
    const panel = document.querySelector('#ship-examples')
    panel.replaceChildren()
    panel.append(element('h2', '', t.sample_inventory))
    const controls = element('div', 'preset-controls')
    const label = element('label', 'preset-label', t.fleet_example),
        selector = element('select')
    selector.id = 'fleet-preset'
    selector.disabled =
        busy || state.fleetSummary.pending > 0 || state.managedFleets.length > 0
    for (const key of Object.keys(fleetExamples)) {
        const option = element('option', '', t[`preset_${key}`])
        option.value = key
        selector.append(option)
    }
    selector.value = 'armada'
    label.append(selector)
    controls.append(label)
    const load = element('button', 'upgrade-button', t.load_fleet_example)
    load.id = 'load-fleet-preset'
    load.disabled = selector.disabled
    load.addEventListener('click', async () => {
        if (busy) return
        try {
            state = await provider.loadFleetExample(selector.value)
            scene?.update(state)
            scene?.resetCamera()
            renderUi()
            status.textContent = t.ready
        } catch (error) {
            status.textContent = message(error)
        }
    })
    controls.append(
        load,
        element('p', 'builder-note preset-note', t.preset_note),
    )
    panel.append(controls)
}
async function performShip(orderId) {
    if (busy) return
    const order = state.orders.find(
        (item) => item.id === orderId && item.status === 'queued',
    )
    if (!order) return
    const yard = state.buildings.find((item) => item.type === 'shipyard')
    navigate('ships')
    placing = false
    const token = ++operation,
        planetId = state.planet.id,
        type = order.type
    activeOrder = order.id
    busy = true
    root.dataset.building = `ship-${type}`
    status.textContent = t.ship_working
    stopRotation()
    scene?.focus(yard.id)
    renderUi()
    try {
        const complete = scene ? await scene.animateShip(type, yard.id) : true
        if (!complete || token !== operation || state.planet.id !== planetId)
            return
        const snapshot = await provider.completeShipOrder(orderId)
        if (token !== operation) return
        state = snapshot
        scene?.update(state)
        busy = false
        delete root.dataset.building
        status.textContent = t.ship_built
    } catch (error) {
        if (token === operation) status.textContent = message(error)
    } finally {
        if (token === operation) {
            busy = false
            activeOrder = null
            delete root.dataset.building
            renderUi()
        }
    }
}
renderUi()
try {
    scene = createPlanetScene(
        document.querySelector('#scene'),
        document.querySelector('#scene-labels'),
        (id) => select(id, true),
        t,
    )
    scene.update(state)
    status.textContent = t.ready
    root.dataset.ready = 'true'
} catch (error) {
    status.textContent = t.error
    status.classList.add('render-error')
    console.error(error)
}
function stopRotation() {
    rotating = false
    scene?.setRotation(false)
    document.querySelector('#rotate').setAttribute('aria-pressed', 'false')
}
function cancelUpgrade() {
    activeOrder = null
    ++operation
    scene?.cancelConstruction()
    busy = false
    delete root.dataset.building
}
document
    .querySelector('#scene')
    .addEventListener('construction-progress', (event) => {
        const progress = document.querySelector('#build-progress')
        if (progress) progress.value = event.detail
    })
document.querySelector('#scene').addEventListener('scene-error', () => {
    cancelUpgrade()
    renderUi()
    status.textContent = t.error
    status.classList.add('render-error')
})
function applyPage(focusHeading = false) {
    const previousPage = root.dataset.page
    root.dataset.page = page
    document
        .querySelector('#colony-view')
        .setAttribute('aria-pressed', String(planetView === 'colony'))
    document
        .querySelector('#orbit-view')
        .setAttribute('aria-pressed', String(planetView === 'orbit'))
    for (const name of pages)
        document.querySelector(`#page-${name}`).hidden = name !== page
    document.querySelectorAll('[data-page-link]').forEach((link) => {
        if (link.dataset.pageLink === page)
            link.setAttribute('aria-current', 'page')
        else link.removeAttribute('aria-current')
    })
    document.querySelector('#page-title').textContent = t[`nav_${page}`]
    document.querySelector('#page-description').textContent =
        t[`page_${page}_description`]
    const mode =
        page === 'planet' ? planetView : page === 'fleets' ? 'orbit' : 'colony'
    if (root.dataset.mode !== mode) {
        root.dataset.mode = mode
        stopRotation()
        scene?.setMode(mode)
    }
    const slot = document.querySelector(
        page === 'planet' ? '#planet-scene-slot' : `#${page}-preview`,
    )
    if (page !== 'planet') slot.hidden = !previews[page]
    if (scenePanel.parentElement !== slot) slot.append(scenePanel)
    if (previousPage !== page) {
        if (page === 'planet') {
            stopRotation()
            scene?.resetCamera()
        } else if (previews[page] && !busy) {
            if (page === 'fleets') scene?.focusShip(selectedShip)
            else
                scene?.focus(
                    page === 'ships'
                        ? state.buildings.find(
                              (item) => item.type === 'shipyard',
                          )?.id
                        : selected,
                )
        }
    }
    document.querySelectorAll('[data-preview]').forEach((button) => {
        const open = previews[button.dataset.preview]
        button.setAttribute('aria-expanded', String(open))
        button.textContent = t[open ? 'preview_hide' : 'preview_show']
    })
    if (focusHeading) {
        window.scrollTo(0, 0)
        document.querySelector('#page-title').focus({ preventScroll: true })
    }
}
function navigate(name, preview = false, focusHeading = false) {
    page = pages.includes(name) ? name : 'planet'
    if (preview && page !== 'planet') previews[page] = true
    if (location.hash !== `#${page}`) location.hash = page
    applyPage(focusHeading)
}
window.addEventListener('hashchange', () => {
    page = pageFromHash(location.hash)
    applyPage()
})
document.querySelectorAll('[data-page-link]').forEach((link) =>
    link.addEventListener('click', (event) => {
        event.preventDefault()
        navigate(link.dataset.pageLink, false, true)
    }),
)
document.querySelectorAll('[data-preview]').forEach((button) =>
    button.addEventListener('click', () => {
        const name = button.dataset.preview
        previews[name] = !previews[name]
        applyPage()
        if (previews[name]) {
            if (name === 'fleets') scene?.focusShip(selectedShip)
            else
                scene?.focus(
                    name === 'ships'
                        ? state.buildings.find(
                              (item) => item.type === 'shipyard',
                          )?.id
                        : selected,
                )
        }
    }),
)
document.querySelector('#cancel-operation').addEventListener('click', () => {
    cancelUpgrade()
    status.textContent = t.interrupted
    renderUi()
})
document
    .querySelector('#open-shipyard-building')
    .addEventListener('click', () =>
        select(
            state.buildings.find((item) => item.type === 'shipyard').id,
            true,
        ),
    )
document.querySelector('#toggle-build').addEventListener('click', () => {
    if (!busy) {
        placing = !placing
        renderUi()
    }
})
function setPlanetView(mode) {
    planetView = mode
    applyPage()
    renderOrbitDetails()
}
document
    .querySelector('#colony-view')
    .addEventListener('click', () => setPlanetView('colony'))
document
    .querySelector('#orbit-view')
    .addEventListener('click', () => setPlanetView('orbit'))
document
    .querySelector('#zoom-in')
    .addEventListener('click', () => scene?.zoom(-2))
document
    .querySelector('#zoom-out')
    .addEventListener('click', () => scene?.zoom(2))
document.querySelector('#reset-camera').addEventListener('click', () => {
    stopRotation()
    scene?.resetCamera()
})
document.querySelector('#rotate').addEventListener('click', (event) => {
    rotating = !rotating
    scene?.setRotation(rotating)
    event.currentTarget.setAttribute('aria-pressed', String(rotating))
})
document
    .querySelector('#planet-select')
    .addEventListener('change', async (event) => {
        cancelUpgrade()
        stopRotation()
        placing = false
        const token = ++operation
        const snapshot = await provider.selectPlanet(event.target.value)
        if (token !== operation) return
        state = snapshot
        selected = state.buildings[0].id
        chosenType = 'terraformer'
        scene?.update(state)
        scene?.select(selected)
        applyPage()
        renderUi()
        status.textContent = t.ready
    })
document.querySelector('#reset-demo').addEventListener('click', async () => {
    cancelUpgrade()
    stopRotation()
    placing = false
    fleetManager.reset()
    state = await provider.reset()
    selected = 'metal'
    chosenType = 'terraformer'
    scene?.select(selected)
    scene?.update(state)
    scene?.resetCamera()
    renderUi()
    status.textContent = t.ready
})
applyPage()
window.addEventListener('pagehide', (event) => {
    if (!event.persisted) scene?.dispose()
})
