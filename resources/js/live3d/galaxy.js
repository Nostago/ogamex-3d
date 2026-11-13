// The original GalaxyController supplies visibility, debris and permitted missions.
export function createGalaxy({
    url,
    t,
    el,
    number,
    context,
    onError,
    openFleet,
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
                    el('span', '', planet ? row.playerName || '—' : '—'),
                )
                const actions = el('div', 'galaxy-actions')
                for (const mission of planet?.availableMissions || []) {
                    if (!mission.link) continue
                    const link = new URL(mission.link, location.origin)
                    // Never call instant spy / dispatch endpoints as navigation links.
                    if (
                        link.origin !== location.origin ||
                        link.pathname !== '/fleet'
                    )
                        continue
                    const button = el('button', '', mission.name)
                    button.addEventListener('click', () => openFleet(link.href))
                    actions.append(button)
                }
                if (!actions.childElementCount)
                    actions.append(el('span', 'muted', '—'))
                node.append(actions)
                host.append(node)
            }
            status.textContent = `[${currentGalaxy}:${currentSystem}] · ${t.galaxy_hint}`
        } catch (error) {
            if (error.name === 'AbortError') return
            status.textContent = t.error_request
            onError(error)
        }
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
        show(force = false) {
            const own = context()
            updateOriginalLink()
            if (force || selectedPlanet !== String(own.id)) {
                selectedPlanet = String(own.id)
                const [g, s] = own.coordinates.split(':').map(Number)
                load(g, s)
            }
        },
        dispose() {
            clearTimeout(debounce)
            controller?.abort()
        },
    }
}
