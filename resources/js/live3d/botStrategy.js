export const defaultBotStrategy = {
    fleet: 2,
    economy: 1,
    research: 1,
    raid_every: 2,
    strength: 3,
}

export function strategyShares(strategy) {
    const values = ['fleet', 'economy', 'research'].map((key) =>
        Number(strategy[key]),
    )
    if (values.some((value) => !Number.isFinite(value) || value < 0))
        return null
    const sum = values.reduce((total, value) => total + value, 0)
    return sum > 0
        ? Object.fromEntries(
              ['fleet', 'economy', 'research'].map((key, i) => [
                  key,
                  (values[i] * 100) / sum,
              ]),
          )
        : null
}

export function readBotStrategy(form) {
    const custom = form.querySelector('[name=strategy_custom]')
    if (custom && !custom.checked) return null
    return Object.fromEntries(
        [...form.querySelectorAll('[data-strategy-key]')].map((input) => [
            input.dataset.strategyKey,
            Number(input.value),
        ]),
    )
}

export function createBotStrategyFields(
    host,
    { t, el, strategy = null, effective = defaultBotStrategy, bulk = false },
) {
    const root = el('div', 'bot-strategy'),
        fields = el('fieldset'),
        legend = el('legend', '', t.bots_strategy_title)
    let custom
    fields.dataset.strategyFields = ''
    fields.append(legend)
    if (!bulk) {
        const label = el('label', 'fleet-check', t.bots_strategy_custom)
        custom = el('input')
        custom.type = 'checkbox'
        custom.name = 'strategy_custom'
        custom.checked = strategy !== null
        label.prepend(custom)
        root.append(label)
    }
    const grid = el('div', 'fleet-field-grid'),
        values = strategy || effective
    for (const [key, min, max, step] of [
        ['fleet', 0, 100, 1],
        ['economy', 0, 100, 1],
        ['research', 0, 100, 1],
        ['raid_every', 1, 12, 1],
        ['strength', 1, 10, 0.1],
    ]) {
        const label = el('label', '', t['bots_strategy_' + key]),
            input = el('input')
        input.type = 'number'
        input.name = 'strategy_' + key
        input.dataset.strategyKey = key
        input.min = min
        input.max = max
        input.step = step
        input.value = values[key]
        input.required = true
        label.append(input)
        grid.append(label)
    }
    fields.append(grid)
    const summary = el('p', 'bot-strategy-summary'),
        hint = el('p', 'muted', t.bots_strategy_hint)
    summary.dataset.strategySummary = ''
    summary.setAttribute('role', 'status')
    summary.setAttribute('aria-live', 'polite')
    root.append(fields, summary, hint)
    host.append(root)
    function update() {
        fields.disabled = custom && !custom.checked
        const configured = Object.fromEntries(
            [...fields.querySelectorAll('input')].map((input) => [
                input.dataset.strategyKey,
                input.value,
            ]),
        )
        const shares = strategyShares(configured),
            first = fields.querySelector('input')
        first.setCustomValidity(shares ? '' : t.bots_strategy_zero)
        const formatter = new Intl.NumberFormat('de-DE', {
            maximumFractionDigits: 1,
        })
        summary.textContent = fields.disabled
            ? t.bots_strategy_profile
            : shares
              ? t.bots_strategy_shares.replace(
                    /:(fleet|economy|research)/g,
                    (_, key) => formatter.format(shares[key]),
                )
              : t.bots_strategy_zero
    }
    root.addEventListener('input', update)
    custom?.addEventListener('change', update)
    update()
    return {
        setValues(values) {
            for (const input of fields.querySelectorAll('[data-strategy-key]'))
                input.value = values[input.dataset.strategyKey]
            update()
        },
    }
}
