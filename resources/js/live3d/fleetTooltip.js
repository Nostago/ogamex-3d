import { formatDuration } from './duration.js'
export function appendComposition(host, fleet, t, el, number) {
    host.append(el('h3', '', t.quick_composition))
    if (!Array.isArray(fleet.ships)) {
        host.append(el('p', '', t.quick_unknown_composition))
        return
    }
    for (const ship of fleet.ships) {
        const row = el('div', 'radar-ship-row')
        row.append(
            el('span', '', ship.name),
            el('strong', '', number(ship.amount)),
        )
        host.append(row)
    }
}
export function createFleetTooltip({ t, el, number, now }) {
    const layer = el('section', 'fleet-radar-tooltip')
    layer.id = 'fleet-radar-tooltip'
    layer.setAttribute('role', 'tooltip')
    layer.hidden = true
    document.body.append(layer)
    let origin, fleet, timer
    function hide() {
        clearTimeout(timer)
        layer.hidden = true
        origin?.removeAttribute('aria-describedby')
        origin = null
        fleet = null
    }
    function tick() {
        const clock = layer.querySelector('.radar-hover-clock')
        if (clock && fleet)
            clock.textContent = formatDuration(
                Math.max(0, fleet.arrival - now()),
                t,
            )
    }
    function show(element, value, event) {
        clearTimeout(timer)
        hide()
        origin = element
        fleet = value
        layer.replaceChildren(
            el('h2', '', value.label),
            el('p', '', `${value.origin} → ${value.destination}`),
            el('p', 'radar-hover-clock'),
        )
        appendComposition(layer, value, t, el, number)
        layer.hidden = false
        element.setAttribute('aria-describedby', layer.id)
        tick()
        const anchor = element.getBoundingClientRect(),
            x = event?.clientX || anchor.right,
            y = event?.clientY || anchor.bottom,
            bounds = layer.getBoundingClientRect()
        layer.style.left = `${Math.max(10, Math.min(innerWidth - bounds.width - 10, x + 18))}px`
        layer.style.top = `${Math.max(10, Math.min(innerHeight - bounds.height - 10, y + 18))}px`
    }
    function leave() {
        timer = setTimeout(() => {
            if (!layer.matches(':hover') && document.activeElement !== origin)
                hide()
        }, 180)
    }
    layer.addEventListener('pointerenter', () => clearTimeout(timer))
    layer.addEventListener('pointerleave', leave)
    const escape = (event) => {
        if (event.key === 'Escape') hide()
    }
    document.addEventListener('keydown', escape)
    return {
        bind(element, value) {
            element.addEventListener('pointerenter', (event) =>
                show(element, value, event),
            )
            element.addEventListener('pointerleave', leave)
            element.addEventListener('focus', () => show(element, value))
            element.addEventListener('blur', leave)
        },
        tick,
        hide,
        dispose() {
            hide()
            layer.remove()
            document.removeEventListener('keydown', escape)
        },
    }
}
