import {
    advanceReplay,
    replayFrame,
    replayCount,
    sideTypes,
} from './battleTimeline.js'
const el = (tag, cls, text) => {
    const n = document.createElement(tag)
    if (cls) n.className = cls
    if (text !== undefined) n.textContent = text
    return n
}
const number = (value) =>
    value === null || value === undefined
        ? null
        : new Intl.NumberFormat('de-DE').format(BigInt(value))
export function createBattleReplay(root, t) {
    const openButton = root.querySelector('[data-battle-replay-url]')
    let panel,
        stage,
        notice,
        controls,
        label,
        slider,
        play,
        effects,
        scene,
        data,
        controller,
        disposed = false,
        generation = 0,
        position = 0,
        playing = false,
        animation,
        lastTime = 0,
        speed = 1,
        pages = { attacker: 0, defender: 0 },
        sides = {}
    const value = (n) => number(n) ?? t.unknown
    const button = (text, action, cls = '') => {
        const b = el('button', cls, text)
        b.type = 'button'
        b.onclick = action
        return b
    }
    function pause() {
        playing = false
        cancelAnimationFrame(animation)
        if (play) play.textContent = t.play
        draw()
    }
    function disposeScene() {
        generation++
        scene?.dispose()
        scene = null
    }
    function close() {
        pause()
        controller?.abort()
        disposeScene()
        panel?.remove()
        panel = null
        openButton.hidden = false
        openButton.focus({ preventScroll: true })
    }
    function selectedTypes(side) {
        return sideTypes(data, side).slice(pages[side] * 4, pages[side] * 4 + 4)
    }
    function draw() {
        if (!data || !panel) return
        const { index, phase } = replayFrame(position, data.frames.length - 1)
        scene?.draw(data.frames[index], phase, playing && effects.checked)
        panel.dataset.replayFrame = String(index)
        panel.dataset.replayPlaying = String(playing)
    }
    function snapshot() {
        if (!data || !panel) return
        const { index } = replayFrame(position, data.frames.length - 1),
            frame = data.frames[index]
        label.textContent = index
            ? `${t.round} ${index} / ${data.frames.length - 1}`
            : t.initial
        slider.value = String(index)
        controls.querySelector('[data-replay-prev]').disabled = index === 0
        controls.querySelector('[data-replay-next]').disabled =
            index === data.frames.length - 1
        for (const side of ['attacker', 'defender']) {
            const block = sides[side],
                current = frame[side],
                shown = new Set(selectedTypes(side).map((unit) => unit.key))
            for (const [key, cell] of block.cells) {
                cell.remaining.textContent = value(
                    replayCount(current.units, key),
                )
                cell.lost.textContent = value(replayCount(current.losses, key))
                cell.row.dataset.lost = String(
                    BigInt(replayCount(current.losses, key) || '0') > 0n,
                )
                cell.row.dataset.represented = String(shown.has(key))
            }
            for (const key of ['shots', 'power', 'absorbed'])
                block.stats[key].textContent = value(current[key])
        }
        draw()
    }
    function step(index) {
        pause()
        position = Math.min(data.frames.length - 1, Math.max(0, index))
        snapshot()
    }
    function tick(time) {
        if (!playing || disposed || !panel) return
        const old = replayFrame(position, data.frames.length - 1).index
        position = advanceReplay(
            position,
            time - lastTime,
            speed,
            data.frames.length - 1,
        )
        lastTime = time
        if (old !== replayFrame(position, data.frames.length - 1).index)
            snapshot()
        if (position >= data.frames.length - 1) {
            pause()
            snapshot()
            return
        }
        draw()
        animation = requestAnimationFrame(tick)
    }
    function togglePlay() {
        if (playing) {
            pause()
            return
        }
        if (position >= data.frames.length - 1) position = 0
        playing = true
        play.textContent = t.pause
        draw()
        lastTime = performance.now()
        animation = requestAnimationFrame(tick)
    }
    async function showScene() {
        if (!panel || disposed) return
        disposeScene()
        const version = generation
        stage.replaceChildren()
        notice.textContent = t.loading
        try {
            const { createBattleScene } = await import('./battleReplay3d.js')
            if (disposed || !panel || version !== generation) return
            scene = createBattleScene(stage)
            await scene.load({
                attacker: selectedTypes('attacker'),
                defender: selectedTypes('defender'),
            })
            if (disposed || !panel || version !== generation) return
            notice.textContent = ''
            snapshot()
        } catch {
            if (version !== generation || disposed || !panel) return
            disposeScene()
            notice.textContent = t.fallback
            stage.replaceChildren()
            stage.hidden = true
        }
    }
    function renderSides() {
        for (const side of ['attacker', 'defender']) {
            const section = sides[side].section,
                types = sideTypes(data, side),
                selected = new Set(selectedTypes(side).map((unit) => unit.key))
            section.replaceChildren(
                el('h3', '', `${t[side]} · ${data.names[side]}`),
            )
            sides[side].cells = new Map()
            sides[side].stats = {}
            const paging = el('div', 'replay-type-controls')
            const prev = button(t.previous_types, () => {
                    pages[side]--
                    renderSides()
                    stage.hidden = false
                    showScene()
                }),
                next = button(t.next_types, () => {
                    pages[side]++
                    renderSides()
                    stage.hidden = false
                    showScene()
                })
            prev.disabled = pages[side] === 0
            next.disabled = (pages[side] + 1) * 4 >= types.length
            paging.append(
                prev,
                el(
                    'span',
                    '',
                    `${t.types}: ${types.length ? pages[side] * 4 + 1 : 0}–${Math.min(types.length, (pages[side] + 1) * 4)} / ${types.length}`,
                ),
                next,
            )
            if (types.length > 4) section.append(paging)
            const table = el('table', 'replay-units'),
                head = el('thead'),
                hrow = el('tr')
            for (const text of [t.units, t.remaining, t.lost]) {
                const th = el('th', '', text)
                th.scope = 'col'
                hrow.append(th)
            }
            head.append(hrow)
            const body = el('tbody')
            for (const unit of types) {
                const row = el('tr'),
                    name = el('th'),
                    image = el('img')
                name.scope = 'row'
                image.src = unit.image
                image.alt = ''
                name.append(image, el('span', '', unit.name))
                const remaining = el('td'),
                    lost = el('td')
                row.append(name, remaining, lost)
                row.dataset.unit = unit.key
                row.dataset.represented = String(selected.has(unit.key))
                body.append(row)
                sides[side].cells.set(unit.key, { row, remaining, lost })
            }
            table.append(head, body)
            if (types.length) section.append(table)
            else section.append(el('p', '', t.empty))
            for (const key of ['shots', 'power', 'absorbed']) {
                const row = el('p', 'replay-stat'),
                    amount = el('strong')
                row.append(el('span', '', t[key]), amount)
                section.append(row)
                sides[side].stats[key] = amount
            }
        }
        snapshot()
    }
    function build() {
        panel = el('section', 'battle-replay-panel')
        panel.setAttribute('aria-label', t.title)
        panel.append(
            el('h2', '', `${t.title} · [${data.coordinates}]`),
            el('p', 'muted', t.illustrative),
            el('p', 'muted', t.representative),
        )
        controls = el('div', 'replay-controls')
        const prev = button(t.previous, () =>
                step(replayFrame(position, data.frames.length - 1).index - 1),
            ),
            next = button(t.next, () =>
                step(replayFrame(position, data.frames.length - 1).index + 1),
            )
        prev.dataset.replayPrev = ''
        next.dataset.replayNext = ''
        play = button(t.play, togglePlay, 'replay-play')
        play.dataset.replayPlay = ''
        const tempo = el('label', '', t.speed),
            select = el('select')
        for (const n of [0.5, 1, 2, 4]) {
            const o = el('option', '', `${n}×`)
            o.value = n
            select.append(o)
        }
        select.value = '1'
        select.onchange = () => (speed = Number(select.value))
        tempo.append(select)
        controls.append(
            button(t.restart, () => step(0)),
            prev,
            play,
            next,
            tempo,
            button(t.close, close),
        )
        panel.append(controls)
        label = el('h3', 'replay-round')
        label.setAttribute('aria-live', 'polite')
        slider = el('input', 'replay-slider')
        slider.type = 'range'
        slider.min = '0'
        slider.max = data.frames.length - 1
        slider.step = '1'
        slider.setAttribute('aria-label', t.round)
        slider.oninput = () => step(Number(slider.value))
        panel.append(label, slider)
        const effectLabel = el('label', 'replay-effects', t.effects)
        effects = el('input')
        effects.type = 'checkbox'
        effects.checked = !matchMedia('(prefers-reduced-motion: reduce)')
            .matches
        try {
            const saved = localStorage.getItem('ogamex-replay-effects')
            if (saved) effects.checked = saved === 'on'
        } catch {}
        effects.onchange = () => {
            try {
                localStorage.setItem(
                    'ogamex-replay-effects',
                    effects.checked ? 'on' : 'off',
                )
            } catch {}
            draw()
        }
        effectLabel.prepend(effects)
        panel.append(effectLabel)
        stage = el('div', 'battle-replay-stage')
        stage.setAttribute('aria-label', t.title)
        stage.addEventListener('replay-unavailable', () => {
            disposeScene()
            stage.hidden = true
            notice.textContent = t.fallback
        })
        notice = el('p', 'replay-notice')
        notice.setAttribute('role', 'status')
        panel.append(notice, stage)
        const sideGrid = el('div', 'replay-sides')
        for (const side of ['attacker', 'defender']) {
            const section = el('section')
            section.dataset.replaySide = side
            sides[side] = { section, cells: new Map(), stats: {} }
            sideGrid.append(section)
        }
        panel.append(sideGrid)
        const result = el('section', 'replay-result')
        result.append(
            el('h3', '', t.summary),
            el('strong', '', t['winner_' + data.result.winner]),
        )
        for (const side of ['attacker', 'defender'])
            result.append(
                el(
                    'p',
                    '',
                    `${t.resource_losses} · ${t[side]}: ${value(data.result.losses[side])}`,
                ),
            )
        for (const key of ['loot', 'debris']) {
            const group = el('div')
            group.append(el('h4', '', t[key]))
            for (const resource of ['metal', 'crystal', 'deuterium'])
                group.append(
                    el(
                        'p',
                        '',
                        `${t[resource]}: ${value(data.result[key][resource])}`,
                    ),
                )
            result.append(group)
        }
        const repairs = Object.entries(
            data.result.repairedDefenses || {},
        ).filter(([, count]) => BigInt(count) > 0n)
        if (repairs.length) {
            result.append(el('h4', '', t.repaired))
            for (const [key, count] of repairs)
                result.append(
                    el(
                        'p',
                        '',
                        `${data.catalog.find((unit) => unit.key === key)?.name || key}: ${value(count)}`,
                    ),
                )
        }
        if (data.result.hamill) result.append(el('p', '', t.hamill))
        if (!data.roundsRecorded || data.frames.length === 1) {
            panel.append(
                el(
                    'p',
                    'replay-notice',
                    data.roundsRecorded ? t.no_rounds : t.missing_rounds,
                ),
            )
            play.disabled = true
            slider.disabled = true
        }
        panel.append(result)
        root.append(panel)
        openButton.hidden = true
        renderSides()
        stage.hidden = false
        showScene()
        panel.scrollIntoView({ block: 'start', behavior: 'instant' })
    }
    async function open() {
        if (panel || disposed) return
        openButton.disabled = true
        controller = new AbortController()
        const version = ++generation
        try {
            const url = new URL(
                openButton.dataset.battleReplayUrl,
                location.origin,
            )
            if (
                url.origin !== location.origin ||
                !/^\/play-3d\/messages\/\d+\/battle-replay$/.test(url.pathname)
            )
                throw new Error('url')
            const response = await fetch(url, {
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            })
            if (!response.ok || response.redirected) throw new Error('request')
            const result = await response.json()
            if (disposed || version !== generation) return
            data = result
            position = 0
            pages = { attacker: 0, defender: 0 }
            build()
        } catch (e) {
            if (e.name !== 'AbortError' && !disposed) {
                root.querySelector('.replay-error')?.remove()
                root.append(el('p', 'replay-error', t.error))
            }
        } finally {
            openButton.disabled = false
        }
    }
    const visibility = () => {
        if (document.hidden) pause()
    }
    document.addEventListener('visibilitychange', visibility)
    openButton.onclick = open
    return {
        dispose() {
            disposed = true
            playing = false
            cancelAnimationFrame(animation)
            controller?.abort()
            disposeScene()
            document.removeEventListener('visibilitychange', visibility)
            panel?.remove()
        },
    }
}
