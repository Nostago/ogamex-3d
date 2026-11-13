import { createSoftwareScene } from './softwareScene.js'

// Keep scene loading and recovery outside the command client: a failed chunk/GPU
// must never prevent the rest of the game from loading or submitting an order.
export function createSceneHost({ host, labels, names, select, t, onStatus }) {
    let renderer,
        snapshot,
        mode = 'orbit',
        rotation = false,
        generation = 0,
        disposed = false,
        startupTimer
    const panel = document.querySelector('#live-scene-recovery'),
        retry = document.querySelector('#live-scene-retry'),
        hint = document.querySelector('#live-scene-hint')
    function clear() {
        clearTimeout(startupTimer)
        try {
            renderer?.dispose()
        } catch {
            /* A lost GPU can reject cleanup too. */
        }
        renderer = null
        delete host.dataset.frames
        host.replaceChildren()
        labels.replaceChildren()
    }
    function apply() {
        if (snapshot) renderer.update(snapshot)
        renderer.setMode(mode)
        renderer.setRotation(rotation)
    }
    function diagnostics() {
        document.querySelector('#live-scene-diagnostics').textContent =
            JSON.stringify(
                {
                    renderer: host.dataset.renderer || 'loading',
                    reason: host.dataset.failure || null,
                    width: host.clientWidth,
                    height: host.clientHeight,
                    renderedFrames: Number(host.dataset.frames || 0),
                },
                null,
                2,
            )
    }
    panel.querySelector('details').addEventListener('toggle', diagnostics)
    function fallback(reason) {
        if (disposed) return
        generation++
        clear()
        host.dataset.failure = reason
        try {
            renderer = createSoftwareScene(host, labels, select, names)
            apply()
            panel.hidden = false
            hint.textContent = t.scene_compatibility
            diagnostics()
        } catch {
            panel.hidden = false
            hint.textContent = t.scene_unavailable
            onStatus(t.scene_unavailable)
        }
    }
    async function start() {
        const attempt = ++generation
        clear()
        host.dataset.renderer = 'loading'
        panel.hidden = false
        hint.textContent = t.scene_loading
        delete host.dataset.frames
        delete host.dataset.failure
        startupTimer = setTimeout(() => {
            if (attempt === generation) fallback('startup_timeout')
        }, 10000)
        try {
            const { createPlanetScene } = await import(
                '../prototype3d/scene.js'
            )
            if (disposed || attempt !== generation) return
            renderer = createPlanetScene(host, labels, select, names, {
                orbitalStyle: true,
            })
            apply()
            // Shader compilation and the first render happen asynchronously.
            // Hide the loading panel only after real draw calls were completed.
            let deadline = Date.now() + 8000
            clearTimeout(startupTimer)
            const verify = () => {
                if (attempt !== generation || disposed) return
                if (!host.offsetWidth) {
                    deadline = Date.now() + 8000
                    startupTimer = setTimeout(verify, 150)
                    return
                }
                if (Number(host.dataset.frames) > 0) {
                    panel.hidden = true
                    return
                }
                if (Date.now() > deadline) {
                    fallback('first_frame_timeout')
                    return
                }
                startupTimer = setTimeout(verify, 150)
            }
            verify()
        } catch {
            if (attempt === generation) fallback('webgl_or_module')
        }
    }
    function error() {
        fallback('context_or_render')
    }
    host.addEventListener('scene-error', error)
    retry.addEventListener('click', start)
    return {
        update(value) {
            snapshot = value
            try {
                renderer?.update(value)
            } catch {
                fallback('update')
            }
        },
        setMode(value) {
            mode = value
            renderer?.setMode(value)
        },
        setRotation(value) {
            rotation = value
            renderer?.setRotation(value)
        },
        zoom(delta) {
            renderer?.zoom(delta)
        },
        resetCamera() {
            renderer?.resetCamera()
        },
        start,
        dispose() {
            disposed = true
            generation++
            clear()
            host.removeEventListener('scene-error', error)
            retry.removeEventListener('click', start)
        },
    }
}
