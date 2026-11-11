import '../../css/prototype3d.css'
import { createDemoProvider } from './data.js'
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
}
let state = await provider.load()
let selected = 'metal',
    scene,
    busy = false,
    rotating = false,
    operation = 0,
    placing = false
let chosenType = 'shipyard',
    chosenPlot = ''
function element(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
}
function metric(building) {
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
    if (state.plots.some((plot) => plot.id === id && !plot.occupiedBy)) {
        chosenPlot = id
        placing = true
    } else {
        selected = id
        placing = false
    }
    scene?.setPlacementMode(placing)
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
async function perform(action, id, type) {
    if (busy) return
    const token = ++operation
    busy = true
    root.dataset.building = id
    status.textContent = t.working
    renderUi()
    try {
        const completed = scene ? await scene.animateUpgrade(id) : true
        if (!completed || token !== operation) return
        const snapshot =
            action === 'build'
                ? await provider.build(type, id)
                : await provider.upgrade(id)
        if (token !== operation) return
        state = snapshot
        if (action === 'build') {
            selected = state.buildings.find(
                (building) => building.plotId === id,
            ).id
            placing = false
            scene?.setPlacementMode(false)
        }
        scene?.update(state)
        scene?.select(selected)
        if (action === 'build') scene?.focus(selected)
        status.textContent = action === 'build' ? t.built : t.upgraded
    } catch (error) {
        if (token === operation) status.textContent = t.build_error
        console.error(error)
    } finally {
        if (token === operation) {
            busy = false
            delete root.dataset.building
            renderUi()
        }
    }
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
    const free = state.plots.filter((plot) => !plot.occupiedBy)
    if (!available.some((type) => type.id === chosenType))
        chosenType = available[0]?.id ?? ''
    if (!free.some((plot) => plot.id === chosenPlot))
        chosenPlot = free[0]?.id ?? ''
    builder.append(
        element('h3', '', t.build_menu),
        element('p', 'builder-note', t.build_note),
    )
    const typeLabel = element('label', '', t.choose_facility),
        typeSelect = element('select')
    typeSelect.id = 'build-type'
    typeSelect.disabled = busy || !free.length
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
    })
    typeLabel.append(typeSelect)
    builder.append(typeLabel)
    const plotLabel = element('label', '', t.choose_plot),
        plotSelect = element('select')
    plotSelect.id = 'build-plot'
    plotSelect.disabled = busy || !free.length
    for (const plot of free) {
        const option = element('option', '', `${t.plot} ${plot.id.slice(-2)}`)
        option.value = plot.id
        plotSelect.append(option)
    }
    plotSelect.value = chosenPlot
    plotSelect.addEventListener('change', () => {
        chosenPlot = plotSelect.value
        scene?.select(chosenPlot)
        scene?.focus(chosenPlot)
    })
    plotLabel.append(plotSelect)
    builder.append(plotLabel)
    const preview = element('button', 'text-button', t.show_plot)
    preview.id = 'preview-plot'
    preview.disabled = busy || !free.length
    preview.addEventListener('click', () => {
        scene?.select(chosenPlot)
        scene?.focus(chosenPlot)
    })
    builder.append(preview)
    if (busy) appendProgress(builder)
    const build = element(
        'button',
        'upgrade-button',
        free.length ? t.build : t.no_plots,
    )
    build.id = 'build-facility'
    build.disabled = busy || !free.length || !chosenType
    build.addEventListener('click', () => {
        scene?.select(chosenPlot)
        scene?.focus(chosenPlot)
        perform('build', chosenPlot, chosenType)
    })
    builder.append(build)
    document.querySelector('#plot-summary').textContent =
        `${state.buildings.length} / ${state.plots.length} ${t.occupied}`
}
function renderUi() {
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
        element('span', '', t[`metric_${building.metric}`]),
        element('strong', '', metric(building)),
    )
    info.append(details)
    if (busy && !placing) appendProgress(info)
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
    upgrade.disabled = busy || building.level >= 8
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
    scene?.setPlacementMode(placing)
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
document.querySelector('#reset-demo').addEventListener('click', async () => {
    cancelUpgrade()
    stopRotation()
    placing = false
    scene?.setPlacementMode(false)
    state = await provider.reset()
    selected = 'metal'
    scene?.select(selected)
    scene?.update(state)
    scene?.resetCamera()
    renderUi()
    status.textContent = t.ready
})
window.addEventListener('pagehide', (event) => {
    if (!event.persisted) scene?.dispose()
})
