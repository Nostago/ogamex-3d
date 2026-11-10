import '../../css/prototype3d.css'
import { createDemoProvider } from './data.js'
import { createPlanetScene } from './scene.js'

const t = JSON.parse(
    document.querySelector('#prototype-translations').textContent,
)
const provider = createDemoProvider()
const root = document.querySelector('#prototype')
const status = document.querySelector('#render-status')
const list = document.querySelector('#building-list')
const info = document.querySelector('#building-info')
const number = new Intl.NumberFormat('de-DE')
const icons = { metal: '▥', crystal: '◈', deuterium: '◉', solar: '☀' }
let state = await provider.load()
let selected = 'metal',
    scene,
    busy = false,
    rotating = false

// Use DOM text nodes for provider content so a future HTTP adapter cannot inject HTML.
function element(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
}
function select(id) {
    selected = id
    scene?.select(id)
    renderUi()
}
function renderUi() {
    list.replaceChildren()
    const summary = document.querySelector('#production-summary')
    summary.replaceChildren()
    for (const building of state.buildings) {
        const card = element('div', `resource ${building.id}`)
        card.append(
            element(
                'span',
                'resource-name',
                `${icons[building.id]} ${t[building.id]}`,
            ),
            element('strong', '', number.format(building.production)),
            element(
                'small',
                '',
                building.id === 'solar' ? t.energy : t.per_hour,
            ),
        )
        summary.append(card)
        const button = element(
            'button',
            `building-item ${building.id === selected ? 'selected' : ''}`,
        )
        button.dataset.building = building.id
        button.setAttribute('aria-pressed', String(building.id === selected))
        const text = element('span', 'building-name')
        text.append(
            element('strong', '', t[building.id]),
            element(
                'small',
                '',
                `${number.format(building.production)} ${building.id === 'solar' ? t.energy : t.per_hour}`,
            ),
        )
        button.append(
            element('span', `building-icon ${building.id}`, icons[building.id]),
            text,
            element('span', 'level-badge', `${t.level} ${building.level}`),
        )
        button.addEventListener('click', () => select(building.id))
        list.append(button)
    }
    const building = state.buildings.find((item) => item.id === selected)
    info.replaceChildren()
    info.append(
        element('span', 'eyebrow', t.selected),
        element('h3', '', t[building.id]),
        element('p', '', t[`${building.id}_description`]),
    )
    const details = element('div', 'detail-stats')
    details.append(
        element('span', '', t.level),
        element('strong', 'detail-level', `${building.level} / 8`),
        element('span', '', t.demo_stats),
        element(
            'strong',
            '',
            `${number.format(building.production)} ${building.id === 'solar' ? t.energy : t.per_hour}`,
        ),
    )
    info.append(details)
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
    upgrade.addEventListener('click', async () => {
        busy = true
        renderUi()
        try {
            state = await provider.upgrade(selected)
            scene?.update(state)
            status.textContent = t.upgraded
        } finally {
            busy = false
            renderUi()
        }
    })
    info.append(upgrade)
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
document.querySelector('#scene').addEventListener('scene-error', () => {
    status.textContent = t.error
    status.classList.add('render-error')
})
function setView(mode) {
    root.dataset.mode = mode
    scene?.setMode(mode)
    document
        .querySelector('#colony-view')
        .setAttribute('aria-pressed', String(mode === 'colony'))
    document
        .querySelector('#orbit-view')
        .setAttribute('aria-pressed', String(mode === 'orbit'))
    document.querySelector('#panel-title').textContent = t[mode]
    info.hidden = mode === 'orbit'
    document.querySelector('#orbit-info').hidden = mode !== 'orbit'
}
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
document
    .querySelector('#reset-camera')
    .addEventListener('click', () => scene?.resetCamera())
document.querySelector('#rotate').addEventListener('click', (event) => {
    rotating = !rotating
    scene?.setRotation(rotating)
    event.currentTarget.setAttribute('aria-pressed', String(rotating))
})
document.querySelector('#reset-demo').addEventListener('click', async () => {
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
