import '../../css/prototype3d.css'
import { createDemoProvider, planBuild, checkUpgrade } from './data.js'
import { demoPlanets } from './planets.js'
import { buildingCatalog, buildingTypes } from './catalog.js'
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
}
let state = await provider.load()
let selected = 'metal',
    scene,
    busy = false,
    rotating = false,
    operation = 0,
    placing = false
let chosenType = 'terraformer'
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
function select(id) {
    if (busy) return
    if (root.dataset.mode === 'orbit') setView('colony')
    stopRotation()
    selected = id
    placing = false
    scene?.select(id)
    scene?.focus(id)
    renderUi()
}
function appendProgress(parent) {
    const construction = element('div', 'construction-status')
    construction.append(element('span', '', t.working))
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
        for (const profile of demoPlanets) {
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
    for (const category of ['economy', 'facilities', 'storage', 'defense']) {
        const group = element('optgroup')
        group.label = t[category]
        for (const type of available.filter(
            (item) => item.category === category,
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
    if (busy) appendProgress(builder)
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
    for (const building of state.buildings) {
        const type = building.type
        if (buildingTypes.includes(type)) {
            const card = element('div', `resource ${type}`)
            card.append(
                element('span', 'resource-name', `${icons[type]} ${t[type]}`),
                element('strong', '', number.format(building.value)),
                element('small', '', type === 'solar' ? t.energy : t.per_hour),
            )
            summary.append(card)
        }
        const button = element(
            'button',
            `building-item ${building.id === selected ? 'selected' : ''}`,
        )
        button.dataset.building = building.id
        button.disabled = busy
        button.setAttribute('aria-pressed', String(building.id === selected))
        const name = element('span', 'building-name')
        name.append(
            element('strong', '', t[type]),
            element('small', '', metric(building)),
        )
        button.append(
            element('span', `building-icon ${type}`, icons[type]),
            name,
            element('span', 'level-badge', `${t.level} ${building.level}`),
        )
        button.addEventListener('click', () => select(building.id))
        list.append(button)
    }
    document.querySelector('#structure-count').textContent = String(
        state.buildings.length,
    ).padStart(2, '0')
    const building = state.buildings.find((item) => item.id === selected)
    info.replaceChildren()
    info.hidden = placing || root.dataset.mode === 'orbit'
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
    if (busy && !placing) appendProgress(info)
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
            ? t.working
            : building.level >= 8
              ? t.maximum
              : `${t.upgrade} → ${building.level + 1}`,
    )
    upgrade.id = 'upgrade-building'
    upgrade.disabled = busy || !!blocked
    upgrade.addEventListener('click', () => perform('upgrade', selected))
    info.append(upgrade)
    renderBuilder()
}
renderUi()
try {
    scene = createPlanetScene(
        document.querySelector('#scene'),
        document.querySelector('#scene-labels'),
        select,
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
function setView(mode) {
    if (busy) {
        cancelUpgrade()
        status.textContent = t.cancelled
    }
    placing = false
    stopRotation()
    root.dataset.mode = mode
    scene?.setMode(mode)
    document
        .querySelector('#colony-view')
        .setAttribute('aria-pressed', String(mode === 'colony'))
    document
        .querySelector('#orbit-view')
        .setAttribute('aria-pressed', String(mode === 'orbit'))
    document.querySelector('#panel-title').textContent = t[mode]
    document.querySelector('#orbit-info').hidden = mode !== 'orbit'
    renderUi()
}
document.querySelector('#toggle-build').addEventListener('click', () => {
    if (busy) return
    if (root.dataset.mode === 'orbit') setView('colony')
    placing = !placing
    renderUi()
})
document
    .querySelector('#colony-view')
    .addEventListener('click', () => setView('colony'))
document
    .querySelector('#orbit-view')
    .addEventListener('click', () => setView('orbit'))
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
        setView('colony')
        status.textContent = t.ready
    })
document.querySelector('#reset-demo').addEventListener('click', async () => {
    cancelUpgrade()
    stopRotation()
    placing = false
    state = await provider.reset()
    selected = 'metal'
    chosenType = 'terraformer'
    scene?.select(selected)
    scene?.update(state)
    scene?.resetCamera()
    renderUi()
    status.textContent = t.ready
})
window.addEventListener('pagehide', (event) => {
    if (!event.persisted) scene?.dispose()
})
