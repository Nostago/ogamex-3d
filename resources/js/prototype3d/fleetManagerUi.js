import { shipInventory, validateFleet } from './fleetManagement.js'

export function createFleetManager({
    host,
    getState,
    provider,
    onChange,
    t,
    number,
    isBusy,
    planets,
}) {
    let planetId,
        editingId = null,
        opened = false,
        name = '',
        counts = {},
        notice = ''
    const missionTargets = new Map()
    const el = (tag, cls, text) => {
        const node = document.createElement(tag)
        if (cls) node.className = cls
        if (text !== undefined) node.textContent = text
        return node
    }
    const message = (error) => t[`error_${error.code}`] || t.build_error
    function reset() {
        missionTargets.clear()
        editingId = null
        opened = false
        name = ''
        counts = {}
        notice = ''
    }
    async function action(fn, after) {
        if (isBusy()) return
        const current = getState().planet.id
        try {
            const snapshot = await fn()
            if (getState().planet.id !== current) return
            after?.()
            notice = ''
            onChange(snapshot)
        } catch (error) {
            if (getState().planet.id === current) {
                notice = message(error)
                render()
            }
        }
    }
    function edit(group = null) {
        editingId = group?.id ?? null
        opened = true
        name =
            group?.name ??
            `${t.fleet_label} ${getState().managedFleets.length + 1}`
        counts = Object.fromEntries(
            getState().fleet.map((item) => [
                item.type,
                String(
                    group?.ships.find((ship) => ship.type === item.type)
                        ?.count ?? 0,
                ),
            ]),
        )
        notice = ''
        render()
    }
    function render() {
        const state = getState()
        if (planetId !== state.planet.id) {
            reset()
            planetId = state.planet.id
        }
        if (
            editingId &&
            !state.managedFleets.some((group) => group.id === editingId)
        )
            reset()
        for (const id of missionTargets.keys())
            if (!state.managedFleets.some((group) => group.id === id))
                missionTargets.delete(id)
        host.replaceChildren()
        const layout = el('div', 'split-layout'),
            list = el('section', 'card managed-fleet-list'),
            editor = el('aside', 'card fleet-editor')
        const header = el('div', 'section-heading'),
            create = el('button', '', `+ ${t.new_fleet}`)
        create.id = 'new-fleet'
        create.disabled = isBusy()
        create.addEventListener('click', () => edit())
        header.append(el('h2', '', t.existing_fleets), create)
        list.append(header)
        const summary = el(
            'p',
            'muted',
            `${state.managedFleets.length} ${t.nav_fleets} · ${number.format(state.shipInventory.reduce((sum, item) => sum + item.available, 0))} ${t.ships_available}`,
        )
        summary.id = 'managed-fleet-count'
        list.append(summary)
        if (notice) {
            const warning = el('p', 'capacity-warning', notice)
            warning.setAttribute('role', 'alert')
            list.append(warning)
        }
        if (!state.managedFleets.length)
            list.append(el('p', 'empty-state', t.no_managed_fleets))
        for (const group of state.managedFleets) {
            const card = el('article', 'managed-fleet-card')
            card.dataset.fleet = group.id
            const top = el('div', 'section-heading')
            top.append(
                el('h3', '', group.name),
                el(
                    'span',
                    `fleet-status ${group.status}`,
                    t[`fleet_${group.status}`],
                ),
            )
            card.append(top)
            const composition = el('ul', 'fleet-composition')
            for (const ship of group.ships)
                composition.append(
                    el(
                        'li',
                        '',
                        `${number.format(ship.count)} × ${t[ship.type]}`,
                    ),
                )
            card.append(composition)
            const buttons = el('div', 'fleet-actions')
            const update = el('button', '', t.edit_fleet)
            update.dataset.action = 'edit'
            update.disabled = isBusy() || group.status === 'mission'
            update.addEventListener('click', () => edit(group))
            const disband = el('button', '', t.disband_fleet)
            disband.dataset.action = 'disband'
            disband.disabled = update.disabled
            disband.addEventListener('click', () =>
                action(
                    () => provider.disbandFleet(group.id),
                    () => {
                        if (editingId === group.id) reset()
                    },
                ),
            )
            buttons.append(update, disband)
            card.append(buttons)
            if (group.status === 'mission')
                card.append(el('p', 'muted', t.mission_locked))
            else {
                const label = el('label', 'mission-target', t.mission_target),
                    target = el('select')
                target.dataset.target = group.id
                for (const planet of planets.filter(
                    (p) => p.id !== state.planet.id,
                )) {
                    const option = el('option', '', planet.name)
                    option.value = planet.id
                    target.append(option)
                }
                const previousTarget = missionTargets.get(group.id)
                if (previousTarget) target.value = previousTarget
                target.addEventListener('change', () =>
                    missionTargets.set(group.id, target.value),
                )
                target.disabled = isBusy()
                label.append(target)
                const confirmation = el('p', 'muted', t.mission_confirmation)
                const launch = el('button', '', t.launch_deployment)
                launch.dataset.action = 'mission'
                launch.disabled = isBusy()
                launch.addEventListener('click', () =>
                    action(() => provider.startMission(group.id, target.value)),
                )
                card.append(label, confirmation, launch)
            }
            list.append(card)
        }
        editor.append(
            el(
                'h2',
                '',
                opened
                    ? t[editingId ? 'edit_fleet' : 'new_fleet']
                    : t.fleet_organize,
            ),
            el('p', 'muted', t.fleet_reservation_note),
        )
        if (!opened) editor.append(el('p', 'muted', t.fleet_editor_empty))
        else {
            const existing = state.managedFleets.find(
                (group) => group.id === editingId,
            )
            const locked = existing?.status === 'mission'
            const form = el('form'),
                label = el('label', '', t.fleet_name),
                input = el('input')
            input.id = 'fleet-name'
            input.maxLength = 60
            input.value = name
            input.required = true
            input.disabled = isBusy() || locked
            label.append(input)
            form.append(label)
            const available = shipInventory(
                state.fleet,
                state.orders,
                state.managedFleets,
                editingId,
            )
            for (const item of available) {
                const row = el('label', 'fleet-pick', t[item.type]),
                    field = el('input')
                field.id = `fleet-quantity-${item.type}`
                field.type = 'number'
                field.min = '0'
                field.max = String(item.available)
                field.step = '1'
                field.value = counts[item.type] ?? '0'
                field.disabled = input.disabled
                row.append(
                    el(
                        'small',
                        '',
                        `${t[editingId ? 'fleet_available_edit' : 'available']}: ${number.format(item.available)}`,
                    ),
                    field,
                )
                field.addEventListener('input', () => {
                    counts[item.type] = field.value
                    validate()
                })
                form.append(row)
            }
            const warning = el('p', 'capacity-warning')
            warning.id = 'fleet-editor-error'
            warning.setAttribute('role', 'status')
            const save = el('button', 'upgrade-button', t.save_fleet)
            save.id = 'save-fleet'
            save.type = 'submit'
            const cancel = el('button', 'text-button', t.cancel_edit)
            cancel.type = 'button'
            cancel.addEventListener('click', () => {
                reset()
                render()
            })
            const values = () =>
                Object.fromEntries(
                    Object.entries(counts).map(([type, count]) => [
                        type,
                        Number(count),
                    ]),
                )
            function validate() {
                let reason
                try {
                    validateFleet(getState(), name, values(), editingId)
                } catch (error) {
                    reason = message(error)
                }
                warning.textContent = reason || ''
                warning.hidden = !reason
                save.disabled = isBusy() || locked || !!reason
            }
            input.addEventListener('input', () => {
                name = input.value
                validate()
            })
            form.addEventListener('submit', (event) => {
                event.preventDefault()
                if (!save.disabled)
                    action(
                        () => provider.saveFleet(name, values(), editingId),
                        reset,
                    )
            })
            form.append(warning, save, cancel)
            editor.append(form)
            validate()
        }
        layout.append(list, editor)
        host.append(layout)
    }
    return { render, reset }
}
