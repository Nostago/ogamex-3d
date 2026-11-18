export function grantRequestId() {
    if (crypto.randomUUID) return crypto.randomUUID()
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 15) | 64
    bytes[8] = (bytes[8] & 63) | 128
    const hex = [...bytes]
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
export function createAdminShipGrants({ config, onTarget }) {
    const root = document.querySelector('#live-admin-ship-grants'),
        t = config.shipGrantT
    const $ = (id) => root.querySelector('#ship-grant-' + id)
    const form = $('form'),
        world = $('world'),
        ship = $('ship'),
        amount = $('amount'),
        reason = $('reason'),
        status = $('status'),
        submit = $('submit')
    const storageKey = `ogamex-ship-grant-${config.adminUserId}`
    const el = (tag, text, cls) => {
        const node = document.createElement(tag)
        if (text !== undefined) node.textContent = text
        if (cls) node.className = cls
        return node
    }
    const number = (value) =>
        new Intl.NumberFormat('de-DE').format(BigInt(value))
    const format = (key, values) =>
        t[key].replace(/:([a-z_]+)/g, (_, name) => values[name] ?? '')
    let owner = null,
        worlds = [],
        pending = null,
        sending = false,
        completed = false,
        searchVersion = 0,
        selectionVersion = 0,
        searchController,
        selectionController
    try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey))
        if (saved?.body?.request_id && saved.summary) pending = saved
    } catch {}
    function remember() {
        try {
            if (pending && !completed)
                sessionStorage.setItem(storageKey, JSON.stringify(pending))
            else sessionStorage.removeItem(storageKey)
        } catch {}
    }
    const selectedWorld = () =>
        worlds.find((item) => String(item.id) === world.value)
    const selectedShip = () =>
        selectedWorld()?.ships.find((item) => String(item.id) === ship.value)
    function label() {
        if (pending) return pending.summary.target
        const target = selectedWorld()
        return target && owner
            ? `${owner.name} · ${target.name} [${target.coordinates}]`
            : owner
              ? `${owner.name} · ${t.choose_world}`
              : t.choose_player
    }
    function lock() {
        $('fields').disabled = Boolean(pending) || sending || !owner
        $('query').disabled = Boolean(pending) || sending
        $('search').querySelector('button').disabled =
            Boolean(pending) || sending
        $('results')
            .querySelectorAll('button')
            .forEach(
                (button) => (button.disabled = Boolean(pending) || sending),
            )
        submit.disabled =
            sending ||
            completed ||
            (!pending &&
                (!owner ||
                    !selectedWorld() ||
                    !selectedShip() ||
                    !form.checkValidity()))
        submit.textContent =
            pending && !completed && !sending ? t.retry : t.submit
        $('new').hidden = !completed
    }
    function preview() {
        const host = $('preview')
        host.replaceChildren(el('h3', t.preview))
        if (pending) {
            host.append(
                el('strong', pending.summary.target),
                el('p', pending.summary.description),
            )
        } else {
            const target = selectedWorld(),
                unit = selectedShip()
            if (!owner || !target || !unit) host.append(el('p', t.select_hint))
            else {
                host.append(
                    el('strong', `${owner.name} (#${owner.id})`),
                    el(
                        'p',
                        `${target.type === 3 ? t.moon : t.planet}: ${target.name} [${target.coordinates}] (#${target.id})`,
                    ),
                )
                const image = el('img')
                image.src = unit.image
                image.alt = ''
                host.append(image, el('strong', unit.name))
                host.append(
                    el('p', `${t.available}: ${number(unit.available)}`),
                )
                if (/^\d+$/.test(amount.value)) {
                    const after = BigInt(unit.available) + BigInt(amount.value)
                    host.append(el('p', `${t.after}: ${number(after)}`))
                    if (after > 2147483647n)
                        host.append(el('p', t.limit, 'ship-grant-error'))
                }
            }
        }
        lock()
        if (
            !pending &&
            selectedShip() &&
            /^\d+$/.test(amount.value) &&
            BigInt(selectedShip().available) + BigInt(amount.value) >
                2147483647n
        )
            submit.disabled = true
        onTarget(label())
    }
    function shipOptions() {
        const previous = ship.value
        ship.replaceChildren(el('option', t.ship))
        ship.firstChild.value = ''
        for (const item of selectedWorld()?.ships || []) {
            const option = el('option', item.name)
            option.value = item.id
            ship.append(option)
        }
        if ([...ship.options].some((option) => option.value === previous))
            ship.value = previous
        preview()
    }
    function receiptText(grant) {
        return format('saved', {
            ...grant,
            amount: number(grant.amount),
            before: number(grant.before),
            after: number(grant.after),
        })
    }
    function history(items) {
        const host = $('history')
        host.replaceChildren()
        for (const item of items) {
            const article = el('article')
            article.dataset.grantId = item.id
            article.append(el('p', receiptText(item)))
            if (item.reason) article.append(el('p', item.reason))
            host.append(article)
        }
        if (!items.length) host.append(el('p', t.no_history))
    }
    async function json(url, options = {}) {
        const response = await fetch(url, {
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { Accept: 'application/json' },
            ...options,
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || response.redirected)
            throw Object.assign(new Error(data.message || t.error), {
                status: response.status,
            })
        return data
    }
    async function loadWorlds(id, keep = false) {
        selectionController?.abort()
        selectionController = new AbortController()
        const version = ++selectionVersion,
            previous = world.value
        if (!keep) {
            owner = null
            worlds = []
            world.replaceChildren()
            ship.replaceChildren()
            $('history').replaceChildren()
            preview()
        }
        try {
            const result = await json(`${config.shipGrantSearchUrl}/${id}`, {
                signal: selectionController.signal,
            })
            if (version !== selectionVersion) return
            owner = result.player
            worlds = result.worlds
            $('recipient').textContent = `${owner.name} (#${owner.id})`
            world.replaceChildren(el('option', t.choose_world))
            world.firstChild.value = ''
            for (const item of worlds) {
                const option = el(
                    'option',
                    `${item.type === 3 ? t.moon : t.planet} · ${item.name} [${item.coordinates}]`,
                )
                option.value = item.id
                world.append(option)
            }
            if (keep && worlds.some((item) => String(item.id) === previous))
                world.value = previous
            history(result.history)
            shipOptions()
            if (!worlds.length) $('search-status').textContent = t.no_worlds
        } catch (error) {
            if (error.name !== 'AbortError' && version === selectionVersion)
                $('search-status').textContent = error.message
        }
    }
    $('search').onsubmit = async (event) => {
        event.preventDefault()
        if (pending || sending) return
        searchController?.abort()
        selectionController?.abort()
        selectionVersion++
        searchController = new AbortController()
        const version = ++searchVersion
        owner = null
        worlds = []
        world.replaceChildren()
        ship.replaceChildren()
        $('results').replaceChildren()
        $('history').replaceChildren()
        preview()
        $('search-status').textContent = t.searching
        try {
            const url = new URL(config.shipGrantSearchUrl, location.origin)
            url.searchParams.set('q', $('query').value)
            const result = await json(url, { signal: searchController.signal })
            if (version !== searchVersion) return
            $('search-status').textContent = result.truncated
                ? t.truncated
                : result.players.length
                  ? ''
                  : t.empty
            for (const player of result.players) {
                const button = el(
                    'button',
                    `${player.username} (#${player.id})`,
                )
                button.type = 'button'
                button.dataset.grantPlayer = player.id
                button.onclick = () => loadWorlds(player.id)
                $('results').append(button)
            }
        } catch (error) {
            if (error.name !== 'AbortError' && version === searchVersion)
                $('search-status').textContent = error.message
        }
    }
    world.onchange = shipOptions
    ship.onchange = amount.oninput = reason.oninput = preview
    form.onsubmit = async (event) => {
        event.preventDefault()
        if (sending || completed) return
        if (!pending) {
            if (!form.reportValidity() || !selectedWorld() || !selectedShip())
                return
            const target = selectedWorld(),
                unit = selectedShip()
            pending = {
                body: {
                    request_id: grantRequestId(),
                    user_id: owner.id,
                    planet_id: target.id,
                    technologyId: unit.id,
                    amount: amount.value,
                    reason: reason.value,
                },
                summary: {
                    target: label(),
                    description: `${number(amount.value)} × ${unit.name}`,
                },
            }
            remember()
        }
        sending = true
        preview()
        status.textContent = t.processing
        try {
            const token = document.querySelector(
                'meta[name="csrf-token"]',
            ).content
            const result = await json(config.shipGrantStoreUrl, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token,
                },
                body: JSON.stringify({ ...pending.body, _token: token }),
            })
            if (result.status !== 'success' || !result.grant)
                throw new Error(t.error)
            completed = true
            remember()
            status.textContent = receiptText(result.grant)
            status.dataset.tone = 'success'
            // Keep the receipt and frozen target visible; a new action requires the explicit New button.
            if (owner) await loadWorlds(owner.id, true)
        } catch (error) {
            status.dataset.tone = 'error'
            if ([400, 401, 403, 404, 409, 419, 422].includes(error.status)) {
                pending = null
                remember()
                status.textContent = error.message
                if (error.status === 409) {
                    owner = null
                    worlds = []
                    world.replaceChildren()
                    ship.replaceChildren()
                }
            } else status.textContent = `${error.message} ${t.pending}`
        } finally {
            sending = false
            preview()
        }
    }
    $('new').onclick = () => {
        if (sending) return
        pending = null
        completed = false
        remember()
        amount.value = '1'
        reason.value = ''
        status.textContent = ''
        preview()
    }
    preview()
    if (pending) status.textContent = t.pending
    return {
        show() {
            preview()
        },
        targetLabel: label,
        dispose() {
            searchController?.abort()
            selectionController?.abort()
            searchVersion++
            selectionVersion++
        },
    }
}
