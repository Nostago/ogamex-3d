import { systemRows, validSystem, galaxyBounds } from './galaxy.js'

export function createGalaxyUi({ host, t, getState, onOpen, onTransport }) {
    let galaxy = 1,
        system = 42,
        selected = 7,
        notice = ''
    const el = (tag, cls, text) => {
        const node = document.createElement(tag)
        if (cls) node.className = cls
        if (text !== undefined) node.textContent = text
        return node
    }
    function render() {
        host.replaceChildren()
        const controls = el('form', 'card galaxy-controls')
        for (const [key, value, max] of [
            ['galaxy', galaxy, galaxyBounds.galaxies],
            ['system', system, galaxyBounds.systems],
        ]) {
            const label = el('label', '', t[key]),
                input = el('input')
            input.id = `galaxy-${key}`
            input.type = 'number'
            input.min = 1
            input.max = max
            input.step = 1
            input.value = value
            label.append(input)
            controls.append(label)
        }
        const go = el('button', '', t.show_system)
        go.type = 'submit'
        controls.append(go)
        controls.addEventListener('submit', (event) => {
            event.preventDefault()
            const g = Number(controls.querySelector('#galaxy-galaxy').value),
                s = Number(controls.querySelector('#galaxy-system').value)
            if (!validSystem(g, s)) {
                notice = t.error_invalid_system
                render()
                return
            }
            galaxy = g
            system = s
            selected = 1
            notice = ''
            render()
        })
        for (const [direction, label] of [
            [-1, 'previous_system'],
            [1, 'next_system'],
        ]) {
            const button = el('button', '', t[label])
            button.type = 'button'
            button.id = label
            button.disabled = !validSystem(galaxy, system + direction)
            button.addEventListener('click', () => {
                system += direction
                selected = 1
                notice = ''
                render()
            })
            controls.append(button)
        }
        const home = el('button', '', t.own_system)
        home.type = 'button'
        home.id = 'own-system'
        home.addEventListener('click', () => {
            galaxy = 1
            system = 42
            selected = 7
            notice = ''
            render()
        })
        controls.append(home)
        const note = el('p', 'muted', notice || t.galaxy_demo_note)
        note.setAttribute('role', 'status')
        host.append(controls, note)
        const layout = el('div', 'split-layout'),
            list = el('section', 'card galaxy-list'),
            detail = el('aside', 'card galaxy-detail')
        list.append(el('h2', '', `${t.system} ${galaxy}:${system}`))
        const rows = systemRows(galaxy, system)
        for (const row of rows) {
            const button = el('button', 'galaxy-row')
            button.dataset.position = row.position
            button.setAttribute(
                'aria-pressed',
                String(selected === row.position),
            )
            const sphere = el('span', `galaxy-sphere ${row.kind}`)
            sphere.setAttribute('aria-hidden', 'true')
            button.append(
                el('span', 'galaxy-coordinate', row.coordinates),
                sphere,
                el('strong', '', row.name || t[`galaxy_${row.kind}`]),
                el('small', '', t[`galaxy_${row.kind}`]),
            )
            button.addEventListener('click', () => {
                selected = row.position
                render()
            })
            list.append(button)
        }
        const row = rows[selected - 1]
        detail.append(
            el('h2', '', row.name || t[`galaxy_${row.kind}`]),
            el('p', '', row.coordinates),
            el('p', 'muted', t[`galaxy_detail_${row.kind}`]),
        )
        if (row.kind === 'own') {
            const open = el('button', '', t.open_colony)
            open.id = 'galaxy-open-colony'
            open.addEventListener('click', () => onOpen(row.planetId))
            detail.append(open)
            if (row.planetId !== getState().planet.id) {
                const transport = el('button', '', t.plan_transport)
                transport.id = 'galaxy-plan-transport'
                transport.addEventListener('click', () =>
                    onTransport(row.planetId),
                )
                detail.append(transport)
            }
        }
        layout.append(list, detail)
        host.append(layout)
    }
    return { render }
}
