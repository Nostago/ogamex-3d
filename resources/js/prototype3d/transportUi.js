import { resourceTypes, cargoCapacity, validateCargo } from './transport.js'

export function createTransportUi({
    host,
    t,
    number,
    getState,
    provider,
    onChange,
    isBusy,
    planets,
}) {
    let planetId,
        fleetId = '',
        targetId = '',
        amounts = { metal: '', crystal: '', deuterium: '' },
        notice = ''
    const el = (tag, cls, text) => {
        const node = document.createElement(tag)
        if (cls) node.className = cls
        if (text !== undefined) node.textContent = text
        return node
    }
    function render() {
        const state = getState()
        if (planetId !== state.planet.id) {
            planetId = state.planet.id
            fleetId = ''
            targetId = ''
            amounts = { metal: '', crystal: '', deuterium: '' }
            notice = ''
        }
        host.replaceChildren(
            el('h2', '', t.plan_transport),
            el('p', 'muted', t.transport_note),
        )
        const form = el('form', 'transport-form')
        const groups = state.managedFleets.filter((g) => g.status === 'docked')
        if (!groups.some((g) => g.id === fleetId)) fleetId = groups[0]?.id ?? ''
        if (!targetId || targetId === planetId)
            targetId = planets.find((p) => p.id !== planetId).id
        for (const [key, options, value] of [
            ['transport-fleet', groups, fleetId],
            [
                'transport-target',
                planets.filter((p) => p.id !== planetId),
                targetId,
            ],
        ]) {
            const label = el(
                    'label',
                    '',
                    t[
                        key === 'transport-fleet'
                            ? 'transport_fleet'
                            : 'mission_target'
                    ],
                ),
                select = el('select')
            select.id = key
            for (const option of options) {
                const node = el('option', '', option.name)
                node.value = option.id
                select.append(node)
            }
            select.value = value
            select.disabled = isBusy() || !options.length
            select.addEventListener('change', () => {
                if (key === 'transport-fleet') fleetId = select.value
                else targetId = select.value
                notice = ''
                render()
            })
            label.append(select)
            form.append(label)
        }
        const capacity = el('p', 'muted')
        capacity.id = 'transport-capacity'
        const warning = el('p', 'fleet-error', notice)
        warning.id = 'transport-error'
        warning.setAttribute('role', 'status')
        const launch = el('button', '', t.launch_transport)
        launch.id = 'launch-transport'
        launch.type = 'submit'
        const cargo = () =>
            Object.fromEntries(
                resourceTypes.map((key) => [
                    key,
                    amounts[key].trim() === '' ? 0 : Number(amounts[key]),
                ]),
            )
        const validate = () => {
            const group = groups.find((g) => g.id === fleetId)
            const value = cargo(),
                total = resourceTypes.reduce((sum, key) => sum + value[key], 0)
            const reason = group
                ? validateCargo(state.resources, group.ships, value)
                : 'transport_no_fleet'
            capacity.textContent = `${t.cargo_used}: ${number.format(total)} / ${number.format(group ? cargoCapacity(group.ships) : 0)}`
            warning.textContent = notice || (reason ? t[`error_${reason}`] : '')
            launch.disabled = isBusy() || !!reason
        }
        for (const key of resourceTypes) {
            const label = el(
                    'label',
                    '',
                    `${t[`resource_${key}`]} · ${t.cargo_available}: ${number.format(state.resources[key])}`,
                ),
                input = el('input')
            input.id = `cargo-${key}`
            input.type = 'number'
            input.min = 0
            input.max = state.resources[key]
            input.step = 1
            input.value = amounts[key]
            input.disabled = isBusy()
            input.addEventListener('input', () => {
                amounts[key] = input.value
                notice = ''
                validate()
            })
            label.append(input)
            form.append(label)
        }
        form.addEventListener('submit', async (event) => {
            event.preventDefault()
            if (launch.disabled || isBusy()) return
            try {
                const source = planetId
                const snapshot = await provider.startMission(
                    fleetId,
                    targetId,
                    'transport',
                    cargo(),
                )
                if (getState().planet.id !== source) return
                amounts = { metal: '', crystal: '', deuterium: '' }
                notice = ''
                onChange(snapshot)
            } catch (error) {
                notice = t[`error_${error.code}`] || t.build_error
                render()
            }
        })
        form.append(capacity, warning, launch)
        host.append(form)
        validate()
    }
    return {
        render,
        chooseTarget(id) {
            render()
            targetId = id
            notice = ''
            render()
        },
    }
}
