import { modelAliases, shipModelAliases } from './visualState.js'

const namespace = 'http://www.w3.org/2000/svg'
// Resolution-independent technical artwork for types without a dedicated 3D model.
export function blueprint(item) {
    const svg = document.createElementNS(namespace, 'svg')
    svg.setAttribute('viewBox', '0 0 400 220')
    svg.setAttribute('aria-hidden', 'true')
    svg.classList.add('object-blueprint')
    function path(d, stroke = '#63cde3', width = 1) {
        const node = document.createElementNS(namespace, 'path')
        node.setAttribute('d', d)
        node.setAttribute('fill', 'none')
        node.setAttribute('stroke', stroke)
        node.setAttribute('stroke-width', width)
        svg.append(node)
    }
    for (let x = 20; x < 400; x += 20) path(`M${x} 0v220`, '#163546')
    for (let y = 10; y < 220; y += 20) path(`M0 ${y}h400`, '#163546')
    if (item.type === 'research')
        path(
            'M178 45h44m-34 0v40l-48 85q0 18 60 18t60-18l-48-85V45m-48 95h72m-58 20h44',
            '#8fe3f4',
            3,
        )
    else if (item.type === 'defense')
        path(
            'm200 40 68 23v51c0 40-36 65-68 78-32-13-68-38-68-78V63l68-23Zm0 23v104m-41-58h82',
            '#8fe3f4',
            3,
        )
    else
        path(
            'm95 135 105-65 105 65-105 50-105-50Zm105-65v115m-70-54 70 35 70-35m-70-36 70 35m-105 16v28m70-62v29',
            '#8fe3f4',
            3,
        )
    path('M28 38V22h24m296 0h24v16M28 182v16h24m296 0h24v-16', '#5591a8', 2)
    return svg
}
export function createObjectArtwork(t) {
    const element = document.createElement('div')
    element.className = 'object-artwork'
    element.tabIndex = 0
    let current,
        engine,
        loading,
        generation = 0,
        currentKey = '',
        disposed = false
    function set(item, job = null) {
        const key = `${item.key}:${item.type === 'ship' ? 'ship' : Math.min(8, Number(item.amount))}:${job?.id || "idle"}`
        if (key === currentKey) { engine?.setJob(job); return element }
        engine?.setJob(null)
        element.dataset.building = 'false'
        delete element.dataset.progress
        current = item
        currentKey = key
        const version = ++generation
        element.dataset.previewObject = item.key
        element.dataset.artwork = 'vector'
        element.dataset.caption = t.object_diagram
        element.replaceChildren(blueprint(item))
        element.setAttribute('aria-label', `${item.name} · ${t.object_diagram}`)
        const supported = modelAliases[item.key] || shipModelAliases[item.key]
        if (!supported) return element
        loading ||= import('./objectPreview3d.js')
        loading
            .then(({ createObjectPreview }) => {
                if (disposed || version !== generation) return
                try {
                    engine ||= createObjectPreview(element)
                    if (engine.show(item, job)) {
                        element.replaceChildren(engine.canvas)
                        element.dataset.artwork = '3d'
                        element.dataset.caption = t.object_preview
                        element.setAttribute(
                            'aria-label',
                            `${item.name} · ${t.object_preview}`,
                        )
                    }
                } catch {
                    /* Crisp vector view remains available if WebGL is unavailable. */
                }
            })
            .catch(() => {})
        return element
    }
    const lost = () => {
        if (!current) return
        engine?.dispose()
        engine = null
        element.replaceChildren(blueprint(current))
        element.dataset.artwork = 'vector'
        element.dataset.caption = t.object_diagram
        element.setAttribute(
            'aria-label',
            `${current.name} · ${t.object_diagram}`,
        )
        currentKey = ''
    }
    element.addEventListener('object-preview-error', lost)
    return {
        set,
        dispose() {
            disposed = true
            generation++
            element.removeEventListener('object-preview-error', lost)
            engine?.dispose()
        },
    }
}
