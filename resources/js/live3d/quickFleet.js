import { formatDuration } from './duration.js'

// A small presentation of the existing preview/send endpoints, not another dispatch engine.
export function createQuickFleet({
    config,
    t,
    el,
    number,
    state,
    refresh,
    onSent,
    onError,
}) {
    const dialog = document.querySelector('#quick-fleet-dialog'),
        form = document.querySelector('#quick-fleet-form'),
        fields = document.querySelector('#quick-fleet-fields'),
        status = document.querySelector('#quick-fleet-status'),
        send = document.querySelector('#quick-fleet-send'),
        close = document.querySelector('#quick-fleet-close'),
        advanced = document.querySelector('#quick-fleet-advanced')
    let revision = 0,
        controller,
        source,
        target,
        data,
        sending = false,
        advancedAction
    const csrf = () => document.querySelector('meta[name="csrf-token"]').content
    function message(result) {
        return (
            result.message ||
            result.error ||
            result.errors
                ?.map?.((item) =>
                    typeof item === 'string' ? item : item.message,
                )
                .join(' · ') ||
            t.error_request
        )
    }
    async function api(path, body, method = 'POST', signal) {
        const url = new URL(path, location.origin)
        url.searchParams.set('cp', source.id)
        url.searchParams.set('ui', 'live3d')
        if (method === 'GET') url.searchParams.set('planet', source.id)
        const response = await fetch(url, {
            method,
            signal,
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrf(),
            },
            ...(method === 'GET'
                ? {}
                : { body: JSON.stringify({ ...body, _token: csrf() }) }),
        })
        if (response.redirected || [401, 419].includes(response.status)) {
            onError({ code: 'session' })
            throw new Error(t.error_session)
        }
        const result = await response.json().catch(() => ({}))
        if (!response.ok || result.error || result.success === false)
            throw Object.assign(new Error(message(result)), {
                definitive: response.status < 500,
            })
        return result
    }
    function valid() {
        const primary = { 6: 210, 7: 208, 8: 209, 9: 214 }[
            Number(target?.mission)
        ]
        if (
            primary &&
            ![...fields.querySelectorAll('[data-quick-ship]')].some(
                (input) =>
                    Number(input.dataset.quickShip) === primary &&
                    /^\d+$/.test(input.value) &&
                    BigInt(input.value) > 0n,
            )
        )
            return false
        return (
            data &&
            !sending &&
            form.checkValidity() &&
            [...fields.querySelectorAll('[data-quick-ship]')].some(
                (input) =>
                    /^\d+$/.test(input.value) && BigInt(input.value) > 0n,
            )
        )
    }
    function availability() {
        send.disabled = !valid()
        if (data && !sending)
            status.textContent = fields.querySelector('[data-quick-ship]')
                ? ''
                : t.quick_no_ships
    }
    function input(ship, selected = '0') {
        const row = el('label', 'quick-fleet-ship'),
            amount = el('input')
        amount.type = 'number'
        amount.min = '0'
        amount.max = ship.available
        amount.step = '1'
        amount.value = selected
        amount.dataset.quickShip = ship.id
        amount.setAttribute('aria-label', `${ship.name} · ${t.op_amount}`)
        row.append(
            el('span', '', ship.name),
            el('small', '', `${number(ship.available)} ${t.ready}`),
            amount,
        )
        return row
    }
    function render() {
        fields.replaceChildren()
        const mission = Number(target.mission),
            available = data.ships.filter(
                (ship) => BigInt(ship.available) > 0n,
            ),
            primary = { 6: 210, 7: 208, 8: 209, 9: 214 }[mission]
        for (const ship of available.filter(
            (ship) => !primary || ship.id === primary,
        ))
            fields.append(input(ship, primary ? '1' : '0'))
        if (primary && mission !== 6) {
            const escorts = available.filter((ship) => ship.id !== primary)
            if (escorts.length) {
                const extra = el('details', 'quick-escorts')
                extra.append(el('summary', '', t.quick_escorts))
                for (const ship of escorts) extra.append(input(ship))
                fields.append(extra)
            }
        }
        if ([3, 4, 5].includes(mission)) {
            const cargo = el('details', 'quick-cargo')
            cargo.append(el('summary', '', t.op_cargo))
            for (const key of ['metal', 'crystal', 'deuterium']) {
                const label = el('label', '', t[key]),
                    value = el('input')
                value.name = key
                value.type = 'number'
                value.min = '0'
                value.step = '1'
                value.value = '0'
                value.required = true
                label.append(value)
                cargo.append(label)
            }
            fields.append(cargo)
        }
        if ([5, 15].includes(mission)) {
            const label = el('label', '', t.op_holding),
                holding = el('input')
            holding.name = 'holdingtime'
            holding.type = 'number'
            holding.min = '1'
            holding.max = mission === 15 ? data.maxHolding : 100000
            holding.value = '1'
            holding.required = true
            label.append(holding)
            fields.append(label)
        }
        document.querySelector('#quick-fleet-availability').textContent =
            `${t.fleet_slots}: ${data.slots.used} / ${data.slots.max}`
        send.textContent = mission === 6 ? t.quick_probe_start : t.quick_start
        availability()
        fields.querySelector('input')?.focus()
    }
    function hide() {
        if (sending) return
        revision++
        controller?.abort()
        data = null
        if (dialog.open) dialog.close()
    }
    close.onclick = hide
    dialog.addEventListener('cancel', (event) => {
        if (sending) event.preventDefault()
        else hide()
    })
    form.addEventListener('input', availability)
    advanced.onclick = () => {
        if (sending) return
        const action = advancedAction
        hide()
        action?.()
    }
    form.onsubmit = async (event) => {
        event.preventDefault()
        if (!valid() || String(state().planet.id) !== String(source.id)) return
        const version = revision,
            quantities = {}
        for (const amount of fields.querySelectorAll('[data-quick-ship]'))
            if (/^\d+$/.test(amount.value) && BigInt(amount.value) > 0n)
                quantities[`am${amount.dataset.quickShip}`] = amount.value
        const values = Object.fromEntries(new FormData(form)),
            body = {
                planet: source.id,
                galaxy: target.galaxy,
                system: target.system,
                position: target.position,
                type: target.type || 1,
                mission: target.mission,
                speed: 10,
                holdingtime: values.holdingtime || 0,
                union: target.union || 0,
                metal: values.metal || 0,
                crystal: values.crystal || 0,
                deuterium: values.deuterium || 0,
                retreatAfterDefenderRetreat: false,
                ...quantities,
            }
        sending = true
        fields.inert = true
        close.disabled = true
        send.disabled = true
        advanced.disabled = true
        status.textContent = t.quick_checking
        let dispatched = false,
            writeAttempted = false
        try {
            const quote = await api(config.fleetPreviewUrl, body)
            if (
                version !== revision ||
                String(state().planet.id) !== String(source.id)
            )
                throw new Error(t.error_request)
            if (
                !quote.orders?.[body.mission] ||
                quote.missionPossible === false ||
                quote.consumption > quote.fuelCapacity ||
                quote.consumption > state().resources.deuterium.amount
            )
                throw new Error(
                    quote.reason ||
                        quote.errors?.map((item) => item.message).join(' · ') ||
                        t.quick_unavailable,
                )
            status.textContent = `${t.quick_sending} · ${formatDuration(quote.duration, t)} · ${number(quote.consumption)} ${t.deuterium}`
            // A write is deliberately never retried, even if the network fails after acceptance.
            writeAttempted = true
            const result = await api(config.fleetSendUrl, body)
            if (result.success !== true) throw new Error(t.quick_uncertain)
            dispatched = true
            data = null
            fields.replaceChildren(el('p', 'quick-fleet-success', t.op_sent))
            status.textContent = t.op_sent
            await refresh()
            onSent()
        } catch (error) {
            if (writeAttempted && !error.definitive) {
                data = null
                status.textContent = t.quick_uncertain
                const movements = el('a', '', t.quick_movements)
                movements.href = '#movement'
                movements.onclick = hide
                fields.append(movements)
            } else status.textContent = error.message
        } finally {
            sending = false
            fields.inert = false
            close.disabled = false
            advanced.disabled = false
            send.disabled = dispatched || !valid()
        }
    }
    return {
        async open(value, options = {}) {
            if (sending) return
            hide()
            source = { ...state().planet }
            target = Object.fromEntries(
                new URL(value, location.origin).searchParams,
            )
            advancedAction = options.advanced
            const version = ++revision
            controller = new AbortController()
            fields.replaceChildren()
            status.textContent = t.loading
            send.disabled = true
            document.querySelector('#quick-fleet-availability').textContent = ''
            document.querySelector('#quick-fleet-title').textContent =
                t[`mission_${target.mission}`] || t.op_plan
            document.querySelector('#quick-fleet-target').textContent =
                `${source.name} [${source.coordinates}] → [${target.galaxy}:${target.system}:${target.position}] · ${Number(target.type) === 3 ? t.moon : Number(target.type) === 2 ? t.debris : t.planet}`
            send.textContent =
                Number(target.mission) === 6
                    ? t.quick_probe_start
                    : t.quick_start
            dialog.showModal()
            try {
                const result = await api(
                    config.fleetUrl,
                    undefined,
                    'GET',
                    controller.signal,
                )
                if (
                    version !== revision ||
                    !dialog.open ||
                    String(state().planet.id) !== String(source.id)
                )
                    return
                data = result
                render()
            } catch (error) {
                if (error.name !== 'AbortError' && version === revision)
                    status.textContent = error.message
            }
        },
        hide,
        dispose() {
            controller?.abort()
            if (!sending && dialog.open) dialog.close()
        },
    }
}
