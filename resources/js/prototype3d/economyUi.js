import {
    price,
    duration,
    missingRequirements,
    researchTypes,
} from './economy.js'
export function economicQuote(state, t, type, level = 1, quantity = 1) {
    const cost = price(type, level, quantity)
    const missing = missingRequirements(type, state.buildings, state.research)
    let reason = missing.length
        ? `${t.requirements}: ${missing.map(([key, value]) => `${t[key] || key} ${value}`).join(', ')}`
        : null
    if (
        !reason &&
        ['metal', 'crystal', 'deuterium'].some(
            (key) =>
                !Number.isSafeInteger(cost[key]) ||
                cost[key] > state.resources[key],
        )
    )
        reason = t.error_resources_short
    if (!reason && cost.energy > state.economy.energyMade)
        reason = t.error_energy_short
    return {
        cost,
        reason,
        milliseconds:
            duration(type, price(type, level), state.buildings, level) *
            quantity,
    }
}
export function createEconomyUi({ t, getState, onAction }) {
    const number = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 })
    const node = (tag, text) => {
        const n = document.createElement(tag)
        if (text !== undefined) n.textContent = text
        return n
    }
    const seconds = (ms) => `${Math.max(0, Math.ceil(ms / 1000))} s`
    function quoteText(quote) {
        return (
            ['metal', 'crystal', 'deuterium']
                .map(
                    (key) =>
                        `${t[`resource_${key}`]} ${number.format(quote.cost[key])}`,
                )
                .concat(
                    quote.cost.energy
                        ? [`${t.energy} ${number.format(quote.cost.energy)}`]
                        : [],
                )
                .join(' · ') +
            ` · ${t.duration}: ${seconds(quote.milliseconds)}`
        )
    }
    function update() {
        const state = getState()
        if (!state.economy) return
        for (const key of ['metal', 'crystal', 'deuterium']) {
            const target = document.querySelector(`#balance-${key}`)
            if (target)
                target.textContent = `${number.format(Math.floor(state.resources[key]))} / ${number.format(state.economy.limits[key])}`
        }
        document.querySelector('#save-status').textContent =
            t[`save_${state.saveStatus}`]
        for (const row of document.querySelectorAll('[data-job-end]'))
            row.textContent = seconds(
                Number(row.dataset.jobEnd) - state.worldTime,
            )
        const job = state.shipJob,
            bar = document.querySelector('#build-progress')
        if (bar && job)
            bar.value = Math.max(
                0,
                Math.min(
                    1,
                    ((job.paused ?? state.worldTime) - job.startedAt) /
                        (job.endsAt - job.startedAt),
                ),
            )
    }
    function render() {
        const state = getState()
        if (!state.economy) return
        const summary = document.querySelector('#production-summary')
        summary.replaceChildren(node('p', t.economy_settings))
        for (const key of ['metal', 'crystal', 'deuterium']) {
            const p = node(
                'p',
                `${t[`resource_${key}`]}: ${number.format(state.economy.rates[key])} / h`,
            )
            p.id = `rate-${key}`
            summary.append(p)
        }
        summary.append(
            node(
                'p',
                `${t.energy}: ${state.economy.energyMade} / ${state.economy.energyUsed} · ${t.production_factor}: ${number.format(state.economy.factor * 100)} %`,
            ),
            node(
                'p',
                `${t.temperature}: ${state.economy.temperature} °C · ${t.position_bonus}: +${number.format((state.economy.positionBonus - 1) * 100)} %`,
            ),
        )
        const jobs = document.querySelector('#economy-jobs')
        jobs.replaceChildren()
        for (const [job, label] of [
            [state.buildingJob, t.build_job],
            [state.researchJob, t.research_job],
            [state.shipJob, t.ship_job],
        ]) {
            if (!job) continue
            const p = node(
                    'p',
                    `${label}: ${job.type ? t[job.type] : t.nav_ships} · `,
                ),
                remaining = node('span')
            if (job.paused != null) remaining.textContent = t.job_paused
            else {
                remaining.dataset.jobEnd = job.endsAt
                remaining.textContent = seconds(job.endsAt - state.worldTime)
            }
            p.append(remaining)
            jobs.append(p)
        }
        if (state.shipJob) {
            const stop = node('button', t.pause_queue)
            stop.id = 'pause-ship-orders'
            stop.disabled = state.shipJob.paused != null
            stop.addEventListener('click', () => onAction('stopShipOrders'))
            jobs.append(stop)
        }
        const host = document.querySelector('#research-center')
        host.replaceChildren(node('p', t.research_note))
        const grid = node('div')
        grid.className = 'research-grid'
        for (const type of researchTypes) {
            const quote = economicQuote(
                state,
                t,
                type,
                state.research[type] + 1,
            )
            const card = node('section')
            card.className = 'card'
            card.dataset.research = type
            card.append(
                node('h2', t[type]),
                node('p', `${t.level}: ${state.research[type]}`),
                node('p', quoteText(quote)),
                node('p', quote.reason || t.requirements_met),
            )
            const button = node(
                'button',
                `${t.start_research} → ${state.research[type] + 1}`,
            )
            button.dataset.startResearch = type
            button.disabled =
                !!quote.reason ||
                !!state.researchJob ||
                state.buildingJob?.type === 'research' ||
                state.research[type] >= 12
            button.addEventListener('click', () =>
                onAction('startResearch', type),
            )
            card.append(button)
            grid.append(card)
        }
        host.append(grid)
        update()
    }
    return { render, update, quoteText }
}
