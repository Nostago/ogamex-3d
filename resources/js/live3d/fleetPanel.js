import { formatDuration } from './duration.js'

export function createFleetPanel({
    config,
    t,
    el,
    number,
    state,
    refresh,
    onError,
}) {
    const root = document.querySelector('#live-page-fleets'),
        form = document.querySelector('#fleet-form'),
        status = document.querySelector('#fleet-status'),
        send = document.querySelector('#fleet-send')
    let data = null,
        planet = '',
        quote = null,
        pending = false,
        revision = 0,
        controller,
        timer,
        received = 0,
        view = 'plan',
        active = false,
        lastSignature = '',
        loadId = 0,
        showId = 0
    const field = (name) => form.elements.namedItem(name)
    const url = (path) => {
        const u = new URL(path, location.origin)
        u.searchParams.set('cp', state().planet.id)
        u.searchParams.set('ui', 'live3d')
        return u
    }
    function message(result) {
        return (
            result.message ||
            result.error ||
            result.errors
                ?.map?.((e) => (typeof e === 'string' ? e : e.message))
                .join(' · ') ||
            t.error_request
        )
    }
    async function api(path, body, method = 'POST', signal) {
        const response = await fetch(url(path), {
            method,
            credentials: 'same-origin',
            cache: 'no-store',
            signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': config.token,
            },
            ...(method !== 'GET'
                ? { body: JSON.stringify({ _token: config.token, ...body }) }
                : {}),
        })
        if (
            response.redirected ||
            response.status === 401 ||
            response.status === 419
        ) {
            onError({ code: 'session' })
            throw new Error(t.error_session)
        }
        const result = await response.json().catch(() => ({}))
        if (!response.ok || result.success === false || result.error)
            throw new Error(message(result))
        return result
    }
    function selection() {
        const out = {}
        for (const input of root.querySelectorAll('[data-fleet-ship]'))
            if (/^\d+$/.test(input.value) && BigInt(input.value) > 0n)
                out[`am${input.dataset.fleetShip}`] = input.value
        return out
    }
    function payload() {
        const out = Object.fromEntries(new FormData(form))
        out.holdingtime = [5, 15].includes(Number(out.mission))
            ? out.holdingtime
            : '0'
        out.retreatAfterDefenderRetreat = field(
            'retreatAfterDefenderRetreat',
        ).checked
        return { ...out, ...selection(), planet: state().planet.id }
    }
    function changed(force = false) {
        field('holdingtime').closest('label').hidden = ![5, 15].includes(
            Number(field('mission').value),
        )
        field('holdingtime').max =
            Number(field('mission').value) === 15
                ? data?.maxHolding || 1
                : 100000
        const signature = JSON.stringify(payload())
        if (force !== true && signature === lastSignature) return
        lastSignature = signature
        revision++
        quote = null
        send.disabled = true
        controller?.abort()
        clearTimeout(timer)
        timer = setTimeout(preview, 350)
    }
    async function preview() {
        if (
            pending ||
            !active ||
            !data ||
            !form.checkValidity() ||
            !Object.keys(selection()).length
        ) {
            document.querySelector('#fleet-preview').textContent =
                t.choose_ships
            return
        }
        const version = revision,
            source = String(state().planet.id)
        controller = new AbortController()
        try {
            const result = await api(
                config.fleetPreviewUrl,
                payload(),
                'POST',
                controller.signal,
            )
            if (version !== revision || source !== String(state().planet.id))
                return
            quote = result
            const host = document.querySelector('#fleet-preview')
            host.replaceChildren()
            for (const [label, value] of [
                [
                    t.op_target_name,
                    result.targetInhabited
                        ? result.targetPlanet?.name
                        : t.free_position,
                ],
                [t.op_duration, formatDuration(result.duration, t)],
                [t.op_fuel, number(result.consumption)],
                [t.op_capacity, number(result.capacity)],
                [t.op_fuel_capacity, number(result.fuelCapacity)],
            ]) {
                const row = el('p', 'fleet-stat')
                row.append(el('span', '', label), el('strong', '', value))
                host.append(row)
            }
            const allowed = Object.entries(result.orders || {})
                .filter(([, yes]) => yes)
                .map(([id]) => t[`mission_${id}`])
            host.append(
                el(
                    'p',
                    '',
                    `${t.op_available_missions}: ${allowed.join(' · ') || t.op_no_missions}`,
                ),
            )
            for (const error of result.errors || [])
                host.append(el('p', 'fleet-notice', error.message))
            send.disabled =
                !result.orders?.[field('mission').value] ||
                result.consumption > result.fuelCapacity ||
                result.consumption > state().resources.deuterium.amount ||
                pending
        } catch (error) {
            if (error.name !== 'AbortError' && version === revision)
                document.querySelector('#fleet-preview').textContent =
                    error.message
        }
    }
    function tab(name) {
        view = name
        document.querySelector('#fleet-plan').hidden = name !== 'plan'
        document.querySelector('#fleet-movement').hidden = name !== 'movement'
        root.querySelectorAll('[data-fleet-tab]').forEach((button) =>
            button.setAttribute(
                'aria-pressed',
                String(button.dataset.fleetTab === name),
            ),
        )
    }
    function renderShips(reset) {
        const host = document.querySelector('#fleet-ships')
        if (reset) host.replaceChildren()
        for (const ship of data.ships) {
            let input = host.querySelector(`[data-fleet-ship="${ship.id}"]`)
            if (!input) {
                const label = el('label', 'fleet-ship')
                const image = el('img')
                image.src = ship.image
                image.alt = ''
                input = el('input')
                input.type = 'number'
                input.min = '0'
                input.step = '1'
                input.value = '0'
                input.dataset.fleetShip = ship.id
                input.setAttribute(
                    'aria-label',
                    `${ship.name} · ${t.op_amount}`,
                )
                label.append(
                    image,
                    el('strong', '', ship.name),
                    el('small', 'fleet-available'),
                    input,
                )
                host.append(label)
            }
            input.max = ship.available
            input.disabled = ship.available === '0'
            input
                .closest('label')
                .querySelector('.fleet-available').textContent =
                `${number(ship.available)} ${t.ready}`
            if (BigInt(input.value || '0') > BigInt(ship.available))
                input.value = ship.available
        }
    }
    function renderTemplates() {
        const host = document.querySelector('#fleet-templates')
        host.replaceChildren()
        for (const template of data.templates || []) {
            const row = el('div', 'fleet-template')
            row.append(el('strong', '', template.name))
            const load = el('button', '', t.op_load)
            load.type = 'button'
            load.onclick = () => {
                for (const input of root.querySelectorAll(
                    '[data-fleet-ship]',
                )) {
                    const wanted = BigInt(
                        String(template.ships?.[input.dataset.fleetShip] || 0),
                    )
                    input.value = String(
                        wanted > BigInt(input.max) ? BigInt(input.max) : wanted,
                    )
                }
                document.querySelector('#fleet-template-name').value =
                    template.name
                changed()
            }
            const remove = el('button', '', t.op_delete)
            remove.type = 'button'
            remove.onclick = async () => {
                if (!confirm(t.op_delete_confirm)) return
                try {
                    await api(
                        `/ajax/fleet/templates/${template.id}`,
                        {},
                        'DELETE',
                    )
                    await loadState()
                } catch (error) {
                    status.textContent = error.message
                }
            }
            row.append(load, remove)
            host.append(row)
        }
    }
    function renderMovements() {
        const host = document.querySelector('#fleet-movements')
        host.replaceChildren()
        if (!data.movements.length) host.append(el('p', 'card', t.op_no_fleets))
        for (const movement of data.movements) {
            const card = el('article', 'card fleet-movement')
            card.dataset.fleetId = movement.id
            card.append(
                el(
                    'h2',
                    '',
                    `${t[`mission_${movement.mission}`] || movement.label} · ${movement.returning ? t.op_returning : movement.holding ? t.op_waiting : t.op_outbound}${movement.own ? '' : ` · ${t.op_incoming}`}`,
                ),
                el(
                    'p',
                    '',
                    `${movement.originName} [${movement.origin}] → ${movement.destinationName} [${movement.destination}]`,
                ),
            )
            const clock = el('p', 'fleet-clock')
            clock.dataset.fleetRemaining = movement.remaining
            card.append(clock)
            if (movement.returnRemaining !== null) {
                const returning = el('p', 'fleet-clock')
                returning.dataset.fleetRemaining = movement.returnRemaining
                returning.dataset.prefix = `${t.op_return}: `
                card.append(returning)
            }
            if (movement.ships.length) {
                const details = el('details')
                details.append(
                    el('summary', '', `${t.ships}: ${number(movement.count)}`),
                )
                for (const ship of movement.ships)
                    details.append(
                        el('p', '', `${ship.name}: ${number(ship.amount)}`),
                    )
                card.append(details)
            }
            if (movement.recallable) {
                const button = el('button', '', t.op_recall)
                button.type = 'button'
                button.dataset.fleetRecall = movement.id
                button.onclick = async () => {
                    if (pending || !confirm(t.op_recall_confirm)) return
                    pending = true
                    button.disabled = true
                    try {
                        await api(config.fleetRecallUrl, {
                            fleet_mission_id: movement.id,
                        })
                        status.textContent = t.op_recalled
                        await refresh()
                        await loadState()
                    } catch (error) {
                        status.textContent = error.message
                    } finally {
                        pending = false
                        button.disabled = false
                    }
                }
                card.append(button)
            }
            if (movement.canFederation) {
                const toggle = el('button', '', t.op_federation)
                toggle.type = 'button'
                const form = el('form', 'fleet-field-grid')
                form.hidden = true
                const label = el('label', '', t.op_union_name),
                    name = el('input')
                name.maxLength = 100
                name.value = movement.union ? `KV${movement.union}` : ''
                label.append(name)
                const usersLabel = el('label', '', t.op_union_users),
                    users = el('input')
                usersLabel.append(users)
                const save = el('button', '', t.op_save_union)
                save.type = 'submit'
                form.append(label, usersLabel, save)
                toggle.onclick = () => {
                    form.hidden = !form.hidden
                }
                form.onsubmit = async (event) => {
                    event.preventDefault()
                    if (pending || !confirm(t.op_union_confirm)) return
                    pending = true
                    save.disabled = true
                    try {
                        await api('/ajax/fleet/union/create', {
                            fleet_mission_id: movement.id,
                            name: name.value,
                            unionUsers: users.value,
                        })
                        status.textContent = t.accepted
                        await loadState()
                    } catch (error) {
                        status.textContent = error.message
                    } finally {
                        pending = false
                        save.disabled = false
                    }
                }
                card.append(toggle, form)
            }
            host.append(card)
        }
        tick()
    }
    function tick() {
        for (const clock of root.querySelectorAll('[data-fleet-remaining]'))
            clock.textContent =
                (clock.dataset.prefix || '') +
                formatDuration(
                    Number(clock.dataset.fleetRemaining) -
                        (Date.now() - received) / 1000,
                    t,
                )
    }
    async function loadState() {
        if (!active) return
        const requestId = ++loadId
        const source = String(state().planet.id),
            target = new URL(config.fleetUrl, location.origin)
        target.searchParams.set('planet', source)
        try {
            const next = await api(target, undefined, 'GET')
            if (
                requestId !== loadId ||
                source !== String(state().planet.id) ||
                !active
            )
                return
            const reset = planet !== source || !data
            planet = source
            data = next
            received = Date.now()
            document.querySelector('#fleet-slots').textContent =
                `${t.fleet_slots}: ${next.slots.used} / ${next.slots.max} · ${t.op_mission} ${t.mission_15}: ${next.expeditions.used} / ${next.expeditions.max}`
            const tactical = document.querySelector('#fleet-tactical-ratio')
            tactical.value = String(next.tacticalRetreat.ratio)
            tactical.querySelector('[value="3"]').disabled =
                !next.tacticalRetreat.admiral
            document.querySelector('#fleet-tactical-cost').textContent =
                `${t.op_tactical_cost}: ${number(next.tacticalRetreat.deuterium)} ${t.deuterium}`
            renderShips(reset)
            renderTemplates()
            renderMovements()
            field('galaxy').max = next.maxGalaxies
            if (reset) {
                const [g, s, p] = state().planet.coordinates.split(':')
                field('galaxy').value = g
                field('system').value = s
                field('position').value = p
                field('mission').value = '3'
                field('speed').replaceChildren()
                for (
                    let speed = 10;
                    speed >= (next.speedIncrement === 0.5 ? 0.5 : 1);
                    speed -= next.speedIncrement
                ) {
                    const option = el('option', '', `${speed * 10} %`)
                    option.value = String(speed)
                    field('speed').append(option)
                }
                const own = document.querySelector('#fleet-own-world')
                own.replaceChildren(el('option', '', t.op_choose_world))
                own.firstChild.value = ''
                for (const world of state().planets) {
                    const option = el(
                        'option',
                        '',
                        `${world.name} [${world.coordinates}]`,
                    )
                    option.value = world.id
                    own.append(option)
                }
            }
            const previous = field('union').value
            field('union').replaceChildren(el('option', '', t.op_no_union))
            field('union').firstChild.value = '0'
            for (const union of next.unions || []) {
                const option = el(
                    'option',
                    '',
                    `${union.name || `KV${union.id}`} [${union.galaxy}:${union.system}:${union.position}]`,
                )
                option.value = union.id
                field('union').append(option)
            }
            field('union').value = previous || '0'
            form.inert = false
            root.dataset.fleetReady = 'true'
            changed(true)
        } catch (error) {
            status.textContent = error.message
        }
    }
    root.querySelectorAll('[data-fleet-tab]').forEach(
        (button) => (button.onclick = () => tab(button.dataset.fleetTab)),
    )
    document.querySelector('#fleet-refresh').onclick = () => loadState()
    form.addEventListener('input', changed)
    form.addEventListener('change', changed)
    document.querySelector('#fleet-own-world').onchange = (event) => {
        const world = state().planets.find(
            (p) => String(p.id) === event.target.value,
        )
        if (world) {
            const [g, s, p] = world.coordinates.split(':')
            field('galaxy').value = g
            field('system').value = s
            field('position').value = p
            field('type').value = world.type
            changed()
        }
    }
    document.querySelector('#fleet-all').onclick = () => {
        for (const input of root.querySelectorAll('[data-fleet-ship]'))
            input.value = input.max
        changed()
    }
    document.querySelector('#fleet-clear').onclick = () => {
        for (const input of root.querySelectorAll('[data-fleet-ship]'))
            input.value = '0'
        changed()
    }
    form.onsubmit = async (event) => {
        event.preventDefault()
        if (pending || !quote || send.disabled || !confirm(t.op_confirm)) return
        const body = payload()
        pending = true
        send.disabled = true
        status.textContent = t.processing
        try {
            await api(config.fleetSendUrl, body)
            status.textContent = t.op_sent
            for (const input of root.querySelectorAll('[data-fleet-ship]'))
                input.value = '0'
            quote = null
            await refresh()
            await loadState()
            tab('movement')
        } catch (error) {
            status.textContent = error.message
        } finally {
            pending = false
            changed()
        }
    }
    document.querySelector('#fleet-tactical-form').onsubmit = async (event) => {
        event.preventDefault()
        if (pending) return
        pending = true
        try {
            await api('/ajax/fleet/tactical-retreat', {
                tacticalRetreatState: document.querySelector(
                    '#fleet-tactical-ratio',
                ).value,
            })
            status.textContent = t.accepted
            await loadState()
        } catch (error) {
            status.textContent = error.message
        } finally {
            pending = false
        }
    }
    document.querySelector('#fleet-template-form').onsubmit = async (event) => {
        event.preventDefault()
        const ships = {}
        for (const [key, value] of Object.entries(selection()))
            ships[key.slice(2)] = value
        try {
            await api('/ajax/fleet/templates', {
                template_name: document.querySelector('#fleet-template-name')
                    .value,
                ship: ships,
            })
            await loadState()
        } catch (error) {
            status.textContent = error.message
        }
    }
    const interval = setInterval(() => {
        if (active && !document.hidden) {
            tick()
            if (
                view === 'movement' &&
                !pending &&
                Date.now() - received > 15000
            )
                loadState()
        }
    }, 1000)
    return {
        async show(name = 'plan', target) {
            const version = ++showId
            active = true
            form.inert = true
            quote = null
            send.disabled = true
            revision++
            controller?.abort()
            clearTimeout(timer)
            tab(name)
            await loadState()
            if (!active || version !== showId) return
            if (target) {
                for (const key of [
                    'galaxy',
                    'system',
                    'position',
                    'type',
                    'mission',
                    'union',
                ])
                    if (target[key] !== undefined && target[key] !== null)
                        field(key).value = String(target[key])
                if (Number(target.mission) === 7) {
                    const colonyShip = root.querySelector(
                        '[data-fleet-ship="208"]',
                    )
                    if (
                        colonyShip &&
                        BigInt(colonyShip.max || '0') > 0n &&
                        BigInt(colonyShip.value || '0') === 0n
                    )
                        colonyShip.value = '1'
                }
                changed()
            }
        },
        hide() {
            active = false
            showId++
            loadId++
            form.inert = true
            quote = null
            send.disabled = true
            controller?.abort()
            clearTimeout(timer)
        },
        dispose() {
            clearInterval(interval)
            controller?.abort()
            clearTimeout(timer)
        },
    }
}
