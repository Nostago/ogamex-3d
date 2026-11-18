export function createFormationPanel({ t, el, number }) {
    const section = document.querySelector('#fleet-formation'),
        host = document.querySelector('#fleet-formation-view'),
        legend = document.querySelector('#fleet-formation-legend'),
        status = document.querySelector('#fleet-formation-status'),
        toggle = document.querySelector('#fleet-formation-toggle')
    let viewer = null,
        visible = false,
        version = 0,
        ships = [],
        page = 0,
        signature = ''
    function hide() {
        visible = false
        ++version
        viewer?.dispose()
        viewer = null
        host.replaceChildren()
        delete host.dataset.formationModels
        delete host.dataset.formationRotation
        section.hidden = true
        toggle.setAttribute('aria-expanded', 'false')
        toggle.textContent = t.formation_open
    }
    async function render() {
        if (!visible) return
        const id = ++version,
            selected = ships.slice(page * 6, page * 6 + 6)
        legend.replaceChildren()
        document.querySelector('#fleet-formation-pages').textContent =
            `${t.formation_page}: ${ships.length ? page * 6 + 1 : 0}–${Math.min(ships.length, page * 6 + 6)} / ${ships.length}`
        document.querySelector('#fleet-formation-prev').disabled = page === 0
        document.querySelector('#fleet-formation-next').disabled =
            (page + 1) * 6 >= ships.length
        for (const ship of selected) {
            const item = el('div', 'formation-legend-item'),
                image = el('img')
            image.src = ship.image
            image.alt = ''
            item.append(
                image,
                el('span', '', ship.name),
                el('strong', '', number(ship.count)),
            )
            legend.append(item)
        }
        if (!selected.length) {
            viewer?.dispose()
            viewer = null
            host.replaceChildren()
            status.textContent = t.formation_empty
            return
        }
        status.textContent = t.formation_loading
        try {
            if (!viewer) {
                const { createFleetFormation } = await import(
                    './fleetFormation3d.js'
                )
                if (!visible || id !== version) return
                viewer = createFleetFormation(host)
            }
            await viewer.show(selected)
            if (id === version) status.textContent = ''
        } catch {
            if (id !== version) return
            viewer?.dispose()
            viewer = null
            status.textContent = t.formation_error
        }
    }
    toggle.onclick = () => {
        if (visible) {
            hide()
            return
        }
        visible = true
        section.hidden = false
        toggle.setAttribute('aria-expanded', 'true')
        toggle.textContent = t.formation_close
        render()
    }
    document.querySelector('#fleet-formation-reset').onclick = () =>
        viewer?.reset()
    document.querySelector('#fleet-formation-prev').onclick = () => {
        page = Math.max(0, page - 1)
        render()
    }
    document.querySelector('#fleet-formation-next').onclick = () => {
        if ((page + 1) * 6 < ships.length) {
            page++
            render()
        }
    }
    host.addEventListener('formation-unavailable', () => {
        ++version
        viewer?.dispose()
        viewer = null
        status.textContent = t.formation_error
    })
    return {
        update(next) {
            const nextSignature = JSON.stringify(next)
            if (nextSignature === signature) return
            signature = nextSignature
            ships = next
            page = Math.min(page, Math.max(0, Math.ceil(ships.length / 6) - 1))
            render()
        },
        hide,
        dispose: hide,
    }
}
