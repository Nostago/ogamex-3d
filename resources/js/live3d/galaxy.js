import { formatDuration } from './duration.js'
// The original GalaxyController supplies visibility, debris and permitted missions.
function plain(value) {
    const doc = new DOMParser().parseFromString(String(value), 'text/html')
    return doc.body.textContent || ''
}
export function createGalaxy({
    url,
    t,
    el,
    number,
    context,
    onError,
    openFleet,
    openArea,
    config,
    refresh,
}) {
    const galaxyInput = document.querySelector('#live-galaxy-number'),
        systemInput = document.querySelector('#live-system-number'),
        host = document.querySelector('#live-galaxy-rows'),
        status = document.querySelector('#live-galaxy-status')
    let debounce,
        controller,
        selectedPlanet = '',
        currentGalaxy = 1,
        currentSystem = 1,
        maxGalaxies = 1,
        maxSystems = 499
    async function load(galaxy = currentGalaxy, system = currentSystem) {
        // A blur/change event can queue the old coordinates just before a navigation click.
        clearTimeout(debounce)
        controller?.abort()
        controller = new AbortController()
        const request = controller,
            own = context()
        host.inert = true
        status.textContent = t.loading
        const target = new URL(url, location.origin)
        target.search = new URLSearchParams({ planet: own.id, galaxy, system })
        try {
            const response = await fetch(target, {
                signal: request.signal,
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { Accept: 'application/json' },
            })
            if (
                response.status === 401 ||
                response.status === 419 ||
                response.redirected
            )
                throw { code: 'session' }
            if (!response.ok) throw { code: 'request' }
            const data = await response.json()
            if (
                request.signal.aborted ||
                request !== controller ||
                String(context().id) !== String(own.id)
            )
                return
            currentGalaxy = data.galaxy
            currentSystem = data.system
            maxGalaxies = data.maxGalaxies
            maxSystems = data.maxSystems
            galaxyInput.value = currentGalaxy
            galaxyInput.max = maxGalaxies
            systemInput.value = currentSystem
            systemInput.max = maxSystems
            document.querySelector('#live-system-prev').disabled =
                currentSystem <= 1
            document.querySelector('#live-system-next').disabled =
                currentSystem >= maxSystems
            updateOriginalLink()
            host.inert = false
            host.replaceChildren()
            const header = el('div', 'galaxy-row galaxy-header')
            for (const key of ['position', 'planet', 'owner', 'fleets'])
                header.append(el('strong', '', t[key]))
            host.append(header)
            for (const row of data.rows) {
                const planets = Array.isArray(row.planets)
                    ? row.planets
                    : row.planets
                      ? [row.planets]
                      : []
                const planet = planets.find((p) => p.planetType === 1),
                    moon = planets.find((p) => p.planetType === 3),
                    debris = planets.find((p) => p.planetType === 2)
                const node = el('article', 'galaxy-row')
                node.dataset.position = row.position
                node.append(el('span', 'galaxy-position', `${row.position}`))
                const name = el('div', 'galaxy-planet')
                if (planet) {
                    const image = el('img')
                    image.src = `/img/planets/small/${encodeURIComponent(planet.imageInformation)}.png`
                    image.alt = ''
                    name.append(image, el('strong', '', planet.planetName))
                } else name.append(el('span', 'muted', t.free_position))
                if (moon)
                    name.append(
                        el('small', '', `◉ ${t.moon}: ${moon.planetName}`),
                    )
                if (debris)
                    name.append(
                        el(
                            'small',
                            'debris-label',
                            `${t.debris}: ${Object.entries(
                                debris.resources || {},
                            )
                                .map(
                                    ([key, item]) =>
                                        `${t[key] || key} ${number(item.amount)}`,
                                )
                                .join(' · ')}`,
                        ),
                    )
                node.append(
                    name,
                    el(
                        'span',
                        'galaxy-owner',
                        planet ? plain(row.playerName || '—') : '—',
                    ),
                )
                const actions = el('div', 'galaxy-actions')
                const bodies = planets.filter((p) =>
                    [1, 2, 3].includes(p.planetType),
                )
                if (!planet)
                    bodies.unshift({
                        planetType: 1,
                        availableMissions: row.availableMissions || [],
                    })
                for (const body of bodies) missionButtons(actions, row, body)
                const more = el('button', '', t.more_actions)
                more.setAttribute('aria-expanded', 'false')
                const details = el('section', 'galaxy-detail')
                details.dataset.galaxyDetails = row.position
                details.hidden = true
                more.onclick = () => {
                    details.hidden = !details.hidden
                    more.setAttribute('aria-expanded', String(!details.hidden))
                    if (!details.hidden && !details.childElementCount)
                        renderDetails(details, row, bodies, data)
                }
                actions.append(more)
                if (!actions.childElementCount)
                    actions.append(el('span', 'muted', '—'))
                node.append(actions)
                host.append(node, details)
            }
            status.textContent = `[${currentGalaxy}:${currentSystem}] · ${t.galaxy_hint}`
        } catch (error) {
            if (error.name === 'AbortError') return
            status.textContent = t.error_request
            onError(error)
        }
    }
    function fleetUrl(row, body, mission, metadata) {
        const target = new URL('/fleet', location.origin)
        target.search = new URLSearchParams({
            galaxy: metadata.galaxy,
            system: metadata.system,
            position: row.position,
            type: body.planetType,
            mission,
        })
        return target.href
    }
    function missionButtons(
        host,
        row,
        body,
        details = false,
        metadata = { galaxy: currentGalaxy, system: currentSystem },
        plan = openFleet,
    ) {
        for (const mission of body.availableMissions || []) {
            if (!mission.missionType) continue
            const caption =
                details && mission.missionType === 7
                    ? t.colony_create
                    : t[`mission_${mission.missionType}`] || plain(mission.name)
            const button = el(
                'button',
                '',
                `${body.planetType === 3 ? t.moon + ' · ' : body.planetType === 2 ? t.debris + ' · ' : ''}${caption}`,
            )
            button.dataset.mission = String(mission.missionType)
            if (
                mission.link === '#' ||
                (body.planetType === 2 && body.recyclePossible === false)
            ) {
                button.disabled = true
                button.title = plain(mission.description || t.unavailable)
            } else
                button.onclick = () =>
                    plan(fleetUrl(row, body, mission.missionType, metadata))
            host.append(button)
            if (details && mission.missionType === 7) {
                const hint = el(
                    'p',
                    button.disabled ? 'colony-unavailable' : 'muted',
                    button.disabled
                        ? plain(mission.description || t.colony_unavailable)
                        : t.colony_hint,
                )
                host.append(hint)
            }
        }
    }
    async function actionApi(path, body, method = 'POST') {
        if (body.planet && String(body.planet) !== String(context().id))
            throw new Error(t.error_request)
        const token = document.querySelector('meta[name="csrf-token"]').content
        const url = new URL(path, location.origin)
        url.searchParams.set('cp', context().id)
        url.searchParams.set('ui', 'live3d')
        if (method === 'GET')
            for (const [key, value] of Object.entries(body))
                url.searchParams.set(key, value)
        const response = await fetch(url, {
            method,
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': token,
            },
            ...(method === 'GET'
                ? {}
                : { body: JSON.stringify({ _token: token, ...body }) }),
        })
        if (response.redirected || [401, 419].includes(response.status)) {
            onError({ code: 'session' })
            throw new Error(t.error_session)
        }
        const result = await response.json()
        if (
            !response.ok ||
            result.success === false ||
            result.is_error ||
            result.error
        )
            throw new Error(
                result.message ||
                    result.error_message ||
                    result.error ||
                    t.error_request,
            )
        return result
    }
    function renderDetails(host, row, bodies, metadata, options = {}) {
        const coords = {
            planet: context().id,
            galaxy: metadata.galaxy,
            system: metadata.system,
            position: row.position,
            type: 1,
        }
        host.append(
            el(
                'h2',
                '',
                `${t.op_details} [${metadata.galaxy}:${metadata.system}:${row.position}]`,
            ),
        )
        const output = el('div', 'galaxy-action-result')
        output.setAttribute('role', 'status')
        const flags = row.actions || {},
            playerFlags = row.player?.actions || {}
        function button(label, callback) {
            const control = el('button', '', label)
            control.type = 'button'
            control.onclick = async () => {
                if (
                    control.disabled ||
                    String(coords.planet) !== String(context().id)
                )
                    return
                control.disabled = true
                try {
                    await callback()
                } catch (error) {
                    output.textContent = plain(error.message)
                } finally {
                    control.disabled = false
                }
            }
            host.append(control)
            return control
        }
        for (const body of bodies) {
            const group = el('div', 'galaxy-detail-body')
            group.append(
                el(
                    'h3',
                    '',
                    body.planetType === 3
                        ? t.moon
                        : body.planetType === 2
                          ? t.debris
                          : t.planet,
                ),
            )
            missionButtons(
                group,
                row,
                body,
                true,
                metadata,
                options.openFleet || openFleet,
            )
            if (body.requiredShips !== undefined)
                group.append(
                    el(
                        'p',
                        '',
                        `${t.op_recycler_count}: ${number(body.requiredShips)}`,
                    ),
                )
            host.append(group)
        }
        if (flags.canPhalanx) {
            const scan = button(
                `${t.op_scan} · ${number(metadata.scanCost)} ${t.deuterium}`,
                async () => {
                    if (!confirm(t.op_scan_confirm)) return
                    const result = await actionApi(config.galaxyActionUrl, {
                        ...coords,
                        action: 'scan',
                    })
                    output.replaceChildren(el('h3', '', t.op_scan_result))
                    for (const movement of result.movements || []) {
                        const card = el('article', 'card')
                        card.append(
                            el(
                                'strong',
                                '',
                                t[`mission_${movement.mission_type}`] ||
                                    movement.mission_type_name,
                            ),
                            el(
                                'p',
                                '',
                                `${movement.origin.planet_name || ''} [${movement.origin.galaxy}:${movement.origin.system}:${movement.origin.position}] → ${movement.destination.planet_name || ''} [${movement.destination.galaxy}:${movement.destination.system}:${movement.destination.position}]`,
                            ),
                            el(
                                'p',
                                '',
                                formatDuration(
                                    movement.display_time - result.server_time,
                                    t,
                                ),
                            ),
                            el(
                                'p',
                                '',
                                `${t.ships}: ${number(movement.ship_count)}`,
                            ),
                        )
                        for (const [key, amount] of Object.entries(
                            movement.ships || {},
                        ))
                            card.append(
                                el(
                                    'p',
                                    '',
                                    `${config.shipNames?.[key] || key}: ${number(amount)}`,
                                ),
                            )
                        output.append(card)
                    }
                    if (!result.movements?.length)
                        output.append(el('p', '', t.op_no_fleets))
                    await refresh()
                },
            )
            scan.disabled = !flags.phalanxActive
            if (scan.disabled)
                scan.title = plain(
                    flags.phalanxInactiveReason || t.op_special_unavailable,
                )
        }
        if (flags.canMissileAttack)
            button(t.op_missiles, async () => {
                const info = await actionApi(
                    config.galaxyMissilesUrl,
                    coords,
                    'GET',
                )
                if (info.error) throw new Error(info.error)
                const form = el('form', 'galaxy-action-form'),
                    label = el(
                        'label',
                        '',
                        `${t.op_missile_count} · ${t.ready}: ${number(info.available_missiles)}`,
                    ),
                    count = el('input')
                count.type = 'number'
                count.min = '1'
                count.max = info.available_missiles
                count.value = '1'
                count.required = true
                label.append(count)
                const priority = el('select'),
                    pLabel = el('label', '', t.op_primary)
                priority.append(el('option', '', t.op_priority_all))
                priority.firstChild.value = '0'
                for (const defense of info.defenses) {
                    const option = el('option', '', defense.name)
                    option.value = defense.priority
                    priority.append(option)
                }
                pLabel.append(priority)
                const submit = el('button', '', t.op_missiles)
                submit.type = 'submit'
                submit.disabled = !info.available_missiles
                form.append(
                    label,
                    pLabel,
                    el(
                        'p',
                        '',
                        `${t.op_duration}: ${formatDuration(info.flight_duration, t)}`,
                    ),
                    submit,
                )
                let sending = false
                form.onsubmit = async (event) => {
                    event.preventDefault()
                    if (
                        sending ||
                        !form.reportValidity() ||
                        !confirm(t.op_missile_confirm)
                    )
                        return
                    sending = true
                    submit.disabled = true
                    try {
                        await actionApi(config.galaxyActionUrl, {
                            ...coords,
                            action: 'missiles',
                            missile_count: count.value,
                            target_priority: priority.value,
                        })
                        output.textContent = t.accepted
                        await refresh()
                    } catch (error) {
                        output.append(el('p', '', plain(error.message)))
                    } finally {
                        sending = false
                        submit.disabled = false
                    }
                }
                output.replaceChildren(form)
            })
        if (playerFlags.message?.available)
            button(t.op_message, () =>
                openArea(`/chat?playerId=${row.playerId}`, 'messages'),
            )
        if (flags.canBuddyRequests || playerFlags.buddies?.available)
            button(t.op_buddy, () => {
                const form = el('form', 'galaxy-action-form'),
                    label = el('label', '', t.op_buddy_message),
                    text = el('textarea'),
                    submit = el('button', '', t.op_buddy_send)
                text.maxLength = 5000
                label.append(text)
                submit.type = 'submit'
                form.append(label, submit)
                let sending = false
                form.onsubmit = async (event) => {
                    event.preventDefault()
                    if (sending) return
                    sending = true
                    submit.disabled = true
                    try {
                        await actionApi('/buddies/send-request', {
                            receiver_id: row.playerId,
                            message: text.value,
                        })
                        output.textContent = t.accepted
                    } catch (error) {
                        output.append(el('p', '', plain(error.message)))
                    } finally {
                        sending = false
                        submit.disabled = false
                    }
                }
                output.replaceChildren(form)
            })
        if (playerFlags.alliance?.available && playerFlags.alliance.link)
            button(t.alliance, () =>
                openArea(playerFlags.alliance.link, 'alliance'),
            )
        if (playerFlags.highscore?.available)
            button(t.highscore, () =>
                openArea(
                    playerFlags.highscore.link || '/highscore',
                    'highscore',
                ),
            )
        if (
            !bodies.some((body) => body.planetType === 1 && body.planetId) &&
            context().type !== 3
        )
            button(
                `${t.op_relocate} · ${number(metadata.relocationCost)} ${t.dark_matter}`,
                async () => {
                    if (
                        !confirm(
                            `${t.op_relocate}? ${number(metadata.relocationCost)} ${t.dark_matter}`,
                        )
                    )
                        return
                    await actionApi(config.galaxyActionUrl, {
                        ...coords,
                        action: 'relocate',
                    })
                    output.textContent = t.accepted
                    await refresh()
                },
            )
        button(t.op_close, () => {
            if (options.close) {
                options.close()
                return
            }
            host.hidden = true
            host.previousElementSibling
                ?.querySelector('[aria-expanded]')
                ?.setAttribute('aria-expanded', 'false')
        })
        host.append(output)
    }
    function changed(delay = 350) {
        clearTimeout(debounce)
        controller?.abort()
        const galaxy = Number(galaxyInput.value),
            system = Number(systemInput.value)
        if (
            !galaxyInput.checkValidity() ||
            !systemInput.checkValidity() ||
            !Number.isInteger(galaxy) ||
            !Number.isInteger(system)
        ) {
            host.inert = false
            status.textContent = t.coordinate_hint
            return
        }
        debounce = setTimeout(() => load(galaxy, system), delay)
    }
    for (const input of [galaxyInput, systemInput]) {
        input.addEventListener('input', () => changed())
        input.addEventListener('change', () => changed(0))
    }
    document
        .querySelector('#live-galaxy-form')
        .addEventListener('submit', (event) => {
            event.preventDefault()
            changed(0)
        })
    document
        .querySelector('#live-system-prev')
        .addEventListener('click', () =>
            load(currentGalaxy, Math.max(1, currentSystem - 1)),
        )
    document
        .querySelector('#live-system-next')
        .addEventListener('click', () =>
            load(currentGalaxy, Math.min(maxSystems, currentSystem + 1)),
        )
    document
        .querySelector('#live-system-home')
        .addEventListener('click', () => {
            const [g, s] = context().coordinates.split(':').map(Number)
            load(g, s)
        })
    function updateOriginalLink() {
        const anchor = document.querySelector('#live-galaxy-original')
        const link = new URL(anchor.href, location.origin)
        link.searchParams.set('galaxy', currentGalaxy)
        link.searchParams.set('system', currentSystem)
        link.searchParams.set('cp', context().id)
        anchor.href = link.href
    }
    return {
        renderActions(host, row, metadata, options) {
            const bodies = Array.isArray(row.planets)
                ? [...row.planets]
                : row.planets
                  ? [row.planets]
                  : []
            if (!bodies.some((body) => body.planetType === 1))
                bodies.unshift({
                    planetType: 1,
                    availableMissions: row.availableMissions || [],
                })
            renderDetails(host, row, bodies, metadata, options)
        },
        show(force = false) {
            const own = context()
            updateOriginalLink()
            if (force || selectedPlanet !== String(own.id)) {
                selectedPlanet = String(own.id)
                const [g, s] = own.coordinates.split(':').map(Number)
                load(g, s)
            }
        },
        goTo(galaxy, system) {
            selectedPlanet = String(context().id)
            load(Number(galaxy), Number(system))
        },
        dispose() {
            clearTimeout(debounce)
            controller?.abort()
        },
    }
}
