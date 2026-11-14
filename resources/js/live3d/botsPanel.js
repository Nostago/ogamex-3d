export function createBotsPanel({ config, t, el, number }) {
    const status = document.querySelector('#bots-status'),
        create = document.querySelector('#bots-create')
    let pending = false
    function fields(
        host,
        data = {
            enabled: false,
            profile: 'balanced',
            interval_seconds: 120,
            max_level: 20,
            ship_limit: 100,
            batch_size: 10,
        },
    ) {
        const grid = el('div', 'fleet-field-grid')
        const profile = el('select')
        profile.name = 'profile'
        for (const key of ['balanced', 'economy', 'explorer']) {
            const option = el('option', '', t[`bots_${key}`])
            option.value = key
            profile.append(option)
        }
        profile.value = data.profile
        const pLabel = el('label', '', t.bots_profile)
        pLabel.append(profile)
        grid.append(pLabel)
        for (const [name, key, min, max] of [
            ['interval_seconds', 'interval', 60, 3600],
            ['max_level', 'level', 1, 30],
            ['ship_limit', 'ships', 0, 10000],
            ['batch_size', 'batch', 1, 100],
        ]) {
            const label = el('label', '', t[`bots_${key}`]),
                input = el('input')
            input.name = name
            input.type = 'number'
            input.min = min
            input.max = max
            input.value = data[name]
            input.required = true
            label.append(input)
            grid.append(label)
        }
        const label = el('label', 'fleet-check', t.bots_enabled),
            enabled = el('input')
        enabled.type = 'checkbox'
        enabled.name = 'enabled'
        enabled.checked = data.enabled
        label.prepend(enabled)
        grid.append(label)
        host.append(grid)
    }
    fields(document.querySelector('#bots-create-fields'))
    async function api(body) {
        const token = document.querySelector('meta[name="csrf-token"]').content
        const response = await fetch(config.botsUrl, {
            method: body ? 'POST' : 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': token,
            },
            ...(body
                ? { body: JSON.stringify({ _token: token, ...body }) }
                : {}),
        })
        const data = await response.json().catch(() => ({}))
        if (response.redirected || !response.ok || data.success === false)
            throw new Error(data.message || t.error_request)
        return data
    }
    function payload(form) {
        const body = Object.fromEntries(new FormData(form))
        body.enabled = form.elements.namedItem('enabled').checked
        return body
    }
    async function mutate(body, notice) {
        if (pending) return
        pending = true
        updateControls()
        try {
            await api(body)
            status.textContent = notice
            await load()
        } catch (error) {
            status.textContent = error.message
        } finally {
            pending = false
            updateControls()
        }
    }
    function updateControls() {
        document
            .querySelectorAll('#live-admin-bots button')
            .forEach((button) => {
                button.disabled =
                    pending || button.dataset.botEnabled === 'false'
            })
    }
    async function load() {
        try {
            const data = await api()
            document.querySelector('#bots-heartbeat').textContent =
                data.schedulerActive
                    ? t.bots_scheduler_active
                    : t.bots_scheduler_missing
            const host = document.querySelector('#bots-list')
            host.replaceChildren()
            if (!data.bots.length) host.append(el('p', 'card', t.bots_empty))
            for (const bot of data.bots) {
                const card = el('section', 'card bot-card')
                card.dataset.botId = bot.id
                card.append(
                    el(
                        'h2',
                        '',
                        `${bot.name} · ${bot.enabled ? t.bots_running : t.bots_paused}`,
                    ),
                    el(
                        'p',
                        '',
                        `${t.bots_last}: ${t[`bots_action_${bot.last_action}`] || bot.last_action}${bot.objectName ? ` · ${bot.objectName}` : ''}${bot.last_amount ? ` · ${number(bot.last_amount)}` : ''}`,
                    ),
                    el('p', '', `${t.bots_cycles}: ${number(bot.cycles)}`),
                )
                if (bot.next_tick_at && bot.enabled)
                    card.append(
                        el(
                            'p',
                            '',
                            `${t.bots_next}: ${new Date(bot.next_tick_at).toLocaleString('de-DE')}`,
                        ),
                    )
                const form = el('form')
                fields(form, bot)
                const save = el('button', '', t.bots_save)
                save.type = 'submit'
                form.append(save)
                form.onsubmit = (e) => {
                    e.preventDefault()
                    mutate(
                        { action: 'save', id: bot.id, ...payload(form) },
                        t.bots_saved,
                    )
                }
                const tick = el('button', '', t.bots_tick)
                tick.type = 'button'
                tick.dataset.botEnabled = String(bot.enabled)
                tick.disabled = pending || !bot.enabled
                tick.onclick = () => {
                    if (confirm(t.bots_tick_confirm))
                        mutate({ action: 'tick', id: bot.id }, t.bots_tick_done)
                }
                card.append(form, tick)
                host.append(card)
            }
            updateControls()
        } catch (error) {
            status.textContent = error.message
        }
    }
    create.onsubmit = (event) => {
        event.preventDefault()
        mutate({ action: 'create', ...payload(create) }, t.bots_created)
    }
    document.querySelector('#bots-refresh').onclick = load
    return { show: load }
}
