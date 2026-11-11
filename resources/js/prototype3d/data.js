import {
    researchTypes,
    production,
    price,
    missingRequirements,
    duration,
    levelOf,
    integrate,
} from './economy.js'
import { readSave, saveKey } from './demoStorage.js'
import { resourceTypes, validateCargo } from './transport.js'
import { buildingCatalog, buildingTypes } from './catalog.js'
import { createLayout, chooseSite } from './layout.js'
import { demoPlanets, initialBuildings } from './planets.js'
import { shipInventory, validateFleet } from './fleetManagement.js'
import { createDemoInbox } from './messages.js'
import { demoFlightMs, maxActiveMissions, missionShips } from './missions.js'
import { maxManagedFleets } from './fleetManagement.js'
import { shipCatalog } from './shipCatalog.js'
import {
    createFormations,
    fleetTotal,
    pendingCount,
    exampleFleet,
    maxOrderQuantity,
    maxPendingOrders,
} from './fleet.js'
export { buildingTypes } from './catalog.js'

export class DemoError extends Error {
    constructor(code) {
        super(code)
        this.code = code
    }
}
// Verified read-only against PlanetService::getPlanetFieldMax, not a replacement for it.
export const terraformerBonus = (level) => level * 5 + Math.floor(level / 2)
export function getCapacity(planet, buildings) {
    const terraformer =
        buildings.find((item) => item.type === 'terraformer')?.level ?? 0
    const field_current = buildings.reduce(
        (sum, item) =>
            sum + (buildingCatalog[item.type].consumesField ? item.level : 0),
        0,
    )
    const bonus = terraformerBonus(terraformer),
        effective_max = planet.field_max + bonus
    return {
        field_current,
        field_max: planet.field_max,
        terraformer,
        terraformer_bonus: bonus,
        effective_max,
        remaining: effective_max - field_current,
    }
}
function requireType(type) {
    if (!Object.hasOwn(buildingCatalog, type))
        throw new DemoError('unknown_type')
    return buildingCatalog[type]
}
export function planBuild(state, type) {
    const descriptor = requireType(type)
    if (
        !descriptor.repeatable &&
        state.buildings.some((item) => item.type === type)
    )
        throw new DemoError('already_built')
    if (descriptor.consumesField && state.capacity.remaining <= 0)
        throw new DemoError('fields_full')
    const site = chooseSite(state.layout, state.buildings, descriptor.category)
    if (!site) throw new DemoError('visual_full')
    return { siteId: site.id }
}
export function checkUpgrade(state, id) {
    const item = state.buildings.find((building) => building.id === id)
    if (!item) throw new DemoError('unknown_building')
    if (item.level >= 8) throw new DemoError('max_level')
    if (
        buildingCatalog[item.type].consumesField &&
        state.capacity.remaining <= 0
    )
        throw new DemoError('fields_full')
    return item
}
export function checkShipBuild(state, type, quantity) {
    if (!Object.hasOwn(shipCatalog, type)) throw new DemoError('unknown_ship')
    if (!state.buildings.some((item) => item.type === 'shipyard'))
        throw new DemoError('shipyard_required')
    if (
        !Number.isSafeInteger(quantity) ||
        quantity < 1 ||
        quantity > maxOrderQuantity
    )
        throw new DemoError('invalid_quantity')
    if (
        state.orders.filter((item) => item.status === 'queued').length >=
        maxPendingOrders
    )
        throw new DemoError('queue_full')
    if (
        !Number.isSafeInteger(
            fleetTotal(state.fleet) +
                pendingCount(state.orders) +
                (state.incomingTotal ?? 0) +
                quantity,
        )
    )
        throw new DemoError('count_overflow')
}
// An authenticated adapter can supply the same DTO; the server remains authoritative.
export function createDemoProvider({
    now: realNow = () => Date.now(),
    economyMode = false,
    storage = null,
} = {}) {
    let offset = 0,
        lastSettled = realNow(),
        revision = 0,
        saveStatus = storage ? 'saved' : 'memory',
        saveRecovered = false,
        lastSaved = 0
    let research = Object.fromEntries(researchTypes.map((key) => [key, 0])),
        researchJob = null
    const now = () => realNow() + offset
    const inbox = createDemoInbox()
    let missions = [],
        nextMission = 1
    let selectedPlanet = 'medium'
    const states = new Map()
    function fresh(profile) {
        const layout = createLayout(profile.renderRadius, profile.visualLimit),
            buildings = []
        for (const [type, level] of initialBuildings(profile.id)) {
            const site = chooseSite(
                layout,
                buildings,
                buildingCatalog[type].category,
            )
            buildings.push({ id: type, type, siteId: site.id, level })
        }
        return {
            layout,
            buildings,
            resources: economyMode
                ? { metal: 5000, crystal: 5000, deuterium: 2000 }
                : { metal: 100000, crystal: 50000, deuterium: 25000 },
            buildingJob: null,
            shipJob: null,
            autoOrders: false,
            fleet: exampleFleet('patrol'),
            orders: [],
            nextOrder: 1,
            managedFleets: [],
            nextFleet: 1,
        }
    }
    for (const profile of demoPlanets) states.set(profile.id, fresh(profile))
    const profile = () =>
        demoPlanets.find((planet) => planet.id === selectedPlanet)
    const current = () => states.get(selectedPlanet)
    function snapshot() {
        const planet = profile(),
            { layout, buildings, fleet, orders, managedFleets } = current()
        return {
            planet: { ...planet },
            resources: { ...current().resources },
            ...(economyMode
                ? {
                      economy: production(
                          buildings,
                          selectedPlanet,
                          research,
                          current().resources,
                      ),
                      worldRevision: revision,
                      worldTime: lastSettled,
                      saveStatus,
                      research: { ...research },
                      researchJob: researchJob
                          ? { ...researchJob, cost: { ...researchJob.cost } }
                          : null,
                      buildingJob: current().buildingJob
                          ? { ...current().buildingJob }
                          : null,
                      shipJob: current().shipJob
                          ? { ...current().shipJob }
                          : null,
                      autoOrders: current().autoOrders,
                  }
                : {}),
            name: planet.name,
            coordinates: `[1:42:${demoPlanets.indexOf(planet) + 6}]`,
            capacity: getCapacity(planet, buildings),
            missions: missions.map((m) => ({
                ...m,
                ships: m.ships.map((s) => ({ ...s })),
                ...(m.cargo ? { cargo: { ...m.cargo } } : {}),
            })),
            messages: inbox.snapshot(),
            incomingTotal: missionShips(missions, selectedPlanet),
            fleet: fleet.map((item) => ({ ...item })),
            orders: orders.map((item) => ({ ...item })),
            fleetSummary: {
                total: fleetTotal(fleet),
                pending: pendingCount(orders),
            },
            managedFleets: managedFleets.map((group) => ({
                ...group,
                ships: group.ships.map((ship) => ({ ...ship })),
            })),
            shipInventory: shipInventory(fleet, orders, managedFleets),
            formations: createFormations(
                shipInventory(fleet, orders, managedFleets).map((item) => ({
                    type: item.type,
                    count: item.ready,
                })),
            ),
            layout: layout.map((site) => ({
                ...site,
                normal: [...site.normal],
            })),
            buildings: buildings.map((item) => {
                const descriptor = buildingCatalog[item.type]
                let value =
                    item.type === 'terraformer'
                        ? terraformerBonus(item.level)
                        : Math.round(
                              descriptor.base *
                                  item.level *
                                  (buildingTypes.includes(item.type)
                                      ? 1.24 ** item.level
                                      : 1),
                          )
                if (economyMode) {
                    const stats = production(
                        buildings,
                        selectedPlanet,
                        research,
                        current().resources,
                    )
                    if (['metal', 'crystal', 'deuterium'].includes(item.type))
                        value = Math.ceil(stats.mines[item.type] * stats.factor)
                    if (item.type === 'solar')
                        value = Math.floor(20 * item.level * 1.1 ** item.level)
                    if (item.type === 'fusion')
                        value =
                            stats.energyMade -
                            Math.floor(
                                20 *
                                    levelOf(buildings, 'solar') *
                                    1.1 ** levelOf(buildings, 'solar'),
                            )
                    for (const key of resourceTypes)
                        if (item.type === `${key}Storage`)
                            value = stats.limits[key]
                }
                return {
                    ...item,
                    metric: descriptor.metric,
                    value,
                    production: buildingTypes.includes(item.type) ? value : 0,
                }
            }),
        }
    }
    function requireGroup(id) {
        const group = current().managedFleets.find((item) => item.id === id)
        if (!group) throw new DemoError('unknown_fleet')
        return group
    }
    function processMissions(time) {
        let changed = false
        for (const mission of missions.filter(
            (m) => m.status === 'flying' && m.arrivesAt <= time,
        )) {
            const source = states.get(mission.originId),
                target = states.get(mission.targetId)
            const group = source.managedFleets.find(
                (g) => g.id === mission.fleetId && g.missionId === mission.id,
            )
            if (!group) continue
            if (mission.kind === 'transport') {
                if (!mission.delivered) {
                    for (const key of resourceTypes)
                        target.resources[key] += mission.cargo[key]
                    mission.delivered = true
                    inbox.transport(mission, mission.arrivesAt, false)
                    changed = true
                }
                if (mission.returnsAt <= time) {
                    group.status = 'docked'
                    delete group.missionId
                    mission.status = 'arrived'
                    inbox.transport(mission, mission.returnsAt, true)
                    changed = true
                }
                continue
            }
            for (const ship of mission.ships) {
                source.fleet.find((s) => s.type === ship.type).count -=
                    ship.count
                target.fleet.find((s) => s.type === ship.type).count +=
                    ship.count
            }
            source.managedFleets = source.managedFleets.filter(
                (g) => g !== group,
            )
            const destinationFleetId = `fleet-${target.nextFleet++}`
            target.managedFleets.push({
                id: destinationFleetId,
                name: group.name,
                status: 'docked',
                ships: group.ships.map((s) => ({ ...s })),
            })
            mission.status = 'arrived'
            mission.destinationFleetId = destinationFleetId
            inbox.arrival(mission, mission.arrivesAt)
            changed = true
        }
        return changed
    }
    const api = {
        async saveFleet(name, counts, id = null) {
            if (
                !id &&
                current().managedFleets.length +
                    missions.filter(
                        (m) =>
                            m.status === 'flying' &&
                            m.kind !== 'transport' &&
                            m.targetId === selectedPlanet,
                    ).length >=
                    maxManagedFleets
            )
                throw new DemoError('fleet_slots')
            const validated = validateFleet(snapshot(), name, counts, id)
            if (id) Object.assign(requireGroup(id), validated)
            else
                current().managedFleets.push({
                    id: `fleet-${current().nextFleet++}`,
                    ...validated,
                    status: 'docked',
                })
            return snapshot()
        },
        async disbandFleet(id) {
            const group = requireGroup(id)
            if (group.status === 'mission')
                throw new DemoError('fleet_on_mission')
            current().managedFleets = current().managedFleets.filter(
                (item) => item.id !== id,
            )
            return snapshot()
        },
        async startMission(id, targetId, kind = 'deployment', cargo = null) {
            if (!['deployment', 'transport'].includes(kind))
                throw new DemoError('mission_kind')
            const group = requireGroup(id)
            if (group.status !== 'docked')
                throw new DemoError('fleet_on_mission')
            if (!states.has(targetId) || targetId === selectedPlanet)
                throw new DemoError('mission_target')
            if (
                missions.filter((m) => m.status === 'flying').length >=
                maxActiveMissions
            )
                throw new DemoError('mission_limit')
            const target = states.get(targetId)
            if (kind === 'transport') {
                const reason = validateCargo(
                    current().resources,
                    group.ships,
                    cargo,
                )
                if (reason) throw new DemoError(reason)
                for (const key of resourceTypes) {
                    const incoming = missions
                        .filter(
                            (m) =>
                                m.kind === 'transport' &&
                                m.status === 'flying' &&
                                !m.delivered &&
                                (m.targetId === targetId ||
                                    m.originId === targetId),
                        )
                        .reduce((sum, m) => sum + m.cargo[key], 0)
                    if (
                        target.resources[key] + incoming + cargo[key] >
                        Number.MAX_SAFE_INTEGER
                    )
                        throw new DemoError('count_overflow')
                }
            }
            if (
                kind === 'deployment' &&
                target.managedFleets.length +
                    missions.filter(
                        (m) =>
                            m.status === 'flying' &&
                            m.kind !== 'transport' &&
                            m.targetId === targetId,
                    ).length >=
                    maxManagedFleets
            )
                throw new DemoError('target_full')
            const quantity = group.ships.reduce((sum, s) => sum + s.count, 0)
            if (
                kind === 'deployment' &&
                !Number.isSafeInteger(
                    fleetTotal(target.fleet) +
                        pendingCount(target.orders) +
                        missionShips(missions, targetId) +
                        quantity,
                )
            )
                throw new DemoError('count_overflow')
            const startedAt = now()
            if (
                !Number.isSafeInteger(startedAt) ||
                !Number.isSafeInteger(startedAt + demoFlightMs * 2)
            )
                throw new DemoError('mission_clock')
            const mission = {
                id: `mission-${nextMission++}`,
                kind,
                ...(kind === 'transport'
                    ? {
                          cargo: { ...cargo },
                          delivered: false,
                          returnsAt: startedAt + demoFlightMs * 2,
                      }
                    : {}),
                fleetId: id,
                originId: selectedPlanet,
                targetId,
                originName: profile().name,
                targetName: demoPlanets.find((p) => p.id === targetId).name,
                name: group.name,
                ships: group.ships.map((s) => ({ ...s })),
                status: 'flying',
                startedAt,
                arrivesAt: startedAt + demoFlightMs,
            }
            if (kind === 'transport')
                for (const key of resourceTypes)
                    current().resources[key] -= cargo[key]
            group.status = 'mission'
            group.missionId = mission.id
            missions = missions
                .filter((m) => m.status === 'flying')
                .concat(
                    missions.filter((m) => m.status === 'arrived').slice(-20),
                )
            missions.push(mission)
            return snapshot()
        },
        async advanceMissions() {
            if (economyMode) {
                settle()
                persist(false)
                return snapshot()
            }
            return processMissions(now()) ? snapshot() : null
        },
        async readMessages(tab, subtab, page = 1) {
            return {
                ...snapshot(),
                messagePage: inbox.page(tab, subtab, page),
                messages: inbox.snapshot(),
            }
        },
        async deleteMessage(id) {
            inbox.delete(id)
            return snapshot()
        },
        async listPlanets() {
            return demoPlanets.map((planet) => ({ ...planet }))
        },
        async enqueueShip(type, quantity) {
            checkShipBuild(snapshot(), type, quantity)
            const data = current()
            if (economyMode) pay(type, 1, quantity)
            data.orders = data.orders
                .filter((item) => item.status === 'queued')
                .concat(
                    data.orders
                        .filter((item) => item.status !== 'queued')
                        .slice(-5),
                )
            data.orders.push({
                id: `order-${data.nextOrder++}`,
                type,
                quantity,
                status: 'queued',
            })
            return snapshot()
        },
        async completeShipOrder(id) {
            if (economyMode) throw new DemoError('timed_order')
            const order = current().orders.find((item) => item.id === id)
            if (!order || order.status !== 'queued')
                throw new DemoError('unknown_order')
            const item = current().fleet.find(
                (item) => item.type === order.type,
            )
            if (
                !Number.isSafeInteger(
                    fleetTotal(current().fleet) +
                        missionShips(missions, selectedPlanet) +
                        order.quantity,
                )
            )
                throw new DemoError('count_overflow')
            item.count += order.quantity
            order.status = 'completed'
            return snapshot()
        },
        async cancelShipOrder(id) {
            const order = current().orders.find((item) => item.id === id)
            if (!order || order.status !== 'queued')
                throw new DemoError('unknown_order')
            if (economyMode) {
                if (current().shipJob?.orderId === id) {
                    if (current().shipJob.paused == null)
                        throw new DemoError('economy_busy')
                    current().shipJob = null
                    current().autoOrders = false
                }
                const refund = price(order.type, 1, order.quantity)
                for (const key of resourceTypes)
                    current().resources[key] += refund[key]
            }
            order.status = 'cancelled'
            return snapshot()
        },
        async loadFleetExample(name) {
            const fleet = exampleFleet(name)
            if (!fleet) throw new DemoError('unknown_preset')
            if (current().orders.some((item) => item.status === 'queued'))
                throw new DemoError('orders_pending')
            if (
                missions.some(
                    (m) =>
                        m.status === 'flying' && m.targetId === selectedPlanet,
                )
            )
                throw new DemoError('missions_pending')
            if (current().managedFleets.length)
                throw new DemoError('fleets_exist')
            current().fleet = fleet
            current().orders = []
            return snapshot()
        },
        async load() {
            return snapshot()
        },
        async selectPlanet(id) {
            if (!states.has(id)) throw new DemoError('unknown_planet')
            selectedPlanet = id
            return snapshot()
        },
        async build(type) {
            if (economyMode) return api.startBuilding(type)
            const { siteId } = planBuild(snapshot(), type)
            current().buildings.push({
                id: `${type}-${siteId}`,
                type,
                siteId,
                level: 1,
            })
            return snapshot()
        },
        async upgrade(id) {
            if (economyMode) return api.startBuilding(null, id)
            const existing = current().buildings.find((item) => item.id === id)
            if (existing?.level === 8) return snapshot()
            checkUpgrade(snapshot(), id)
            existing.level++
            return snapshot()
        },
        async reset() {
            if (researchJob?.planetId === selectedPlanet) researchJob = null
            for (const mission of missions.filter(
                (m) =>
                    m.status === 'flying' &&
                    (m.originId === selectedPlanet ||
                        m.targetId === selectedPlanet),
            )) {
                const group = states
                    .get(mission.originId)
                    .managedFleets.find((g) => g.missionId === mission.id)
                if (
                    mission.kind === 'transport' &&
                    !mission.delivered &&
                    mission.originId !== selectedPlanet
                ) {
                    const source = states.get(mission.originId)
                    for (const key of resourceTypes)
                        source.resources[key] += mission.cargo[key]
                }
                if (group) {
                    group.status = 'docked'
                    delete group.missionId
                }
            }
            missions = missions.filter(
                (m) =>
                    m.originId !== selectedPlanet &&
                    m.targetId !== selectedPlanet,
            )
            states.set(selectedPlanet, fresh(profile()))
            return snapshot()
        },
    }
    function requirements(type) {
        if (missingRequirements(type, current().buildings, research).length)
            throw new DemoError('requirements')
    }
    function pay(type, level = 1, quantity = 1) {
        requirements(type)
        const cost = price(type, level, quantity)
        if (
            resourceTypes.some(
                (key) =>
                    !Number.isSafeInteger(cost[key]) ||
                    current().resources[key] < cost[key],
            )
        )
            throw new DemoError('resources_short')
        if (
            cost.energy >
            production(
                current().buildings,
                selectedPlanet,
                research,
                current().resources,
            ).energyMade
        )
            throw new DemoError('energy_short')
        for (const key of resourceTypes) current().resources[key] -= cost[key]
        return cost
    }
    function beginShip(data, orderId, time) {
        const order = data.orders.find(
            (o) => o.id === orderId && o.status === 'queued',
        )
        if (!order) throw new DemoError('unknown_order')
        if (data.shipJob) {
            if (data.shipJob.orderId !== orderId || data.shipJob.paused == null)
                throw new DemoError('economy_busy')
            const shift = time - data.shipJob.paused
            data.shipJob.startedAt += shift
            data.shipJob.endsAt += shift
            data.shipJob.paused = null
        } else {
            const unitMs = duration(
                order.type,
                price(order.type),
                data.buildings,
            )
            data.shipJob = {
                orderId,
                startedAt: time,
                endsAt: time + unitMs * order.quantity,
                unitMs,
                total: order.quantity,
                delivered: 0,
                paused: null,
            }
        }
    }
    function settle() {
        if (!economyMode) return
        const until = Math.max(lastSettled, now())
        while (lastSettled < until) {
            let end = until
            for (const data of states.values()) {
                if (data.buildingJob)
                    end = Math.min(end, data.buildingJob.endsAt)
                if (data.shipJob && data.shipJob.paused == null)
                    end = Math.min(end, data.shipJob.endsAt)
            }
            for (const [planetId, data] of states) {
                const stats = production(
                    data.buildings,
                    planetId,
                    research,
                    data.resources,
                )
                if (stats.rates.deuterium < 0 && data.resources.deuterium > 0)
                    end = Math.min(
                        end,
                        lastSettled +
                            Math.max(
                                1,
                                Math.ceil(
                                    (data.resources.deuterium /
                                        -stats.rates.deuterium) *
                                        3600000,
                                ),
                            ),
                    )
            }
            if (researchJob) end = Math.min(end, researchJob.endsAt)
            for (const mission of missions.filter((m) => m.status === 'flying'))
                end = Math.min(
                    end,
                    mission.delivered ? mission.returnsAt : mission.arrivesAt,
                )
            end = Math.max(lastSettled, end)
            for (const [planetId, data] of states) {
                const stats = production(
                    data.buildings,
                    planetId,
                    research,
                    data.resources,
                )
                data.resources = integrate(
                    data.resources,
                    stats,
                    end - lastSettled,
                )
                const job = data.shipJob
                if (job && job.paused == null) {
                    const delivered = Math.min(
                        job.total,
                        Math.floor((end - job.startedAt) / job.unitMs),
                    )
                    const count = delivered - job.delivered
                    if (count > 0) {
                        const order = data.orders.find(
                            (o) => o.id === job.orderId,
                        )
                        data.fleet.find((s) => s.type === order.type).count +=
                            count
                        order.quantity -= count
                        job.delivered = delivered
                        revision++
                        if (job.delivered === job.total) {
                            order.quantity = job.total
                            order.status = 'completed'
                            data.shipJob = null
                            if (data.autoOrders) {
                                const next = data.orders.find(
                                    (o) => o.status === 'queued',
                                )
                                if (next) beginShip(data, next.id, end)
                                else data.autoOrders = false
                            }
                        }
                    }
                }
                if (data.buildingJob?.endsAt <= end) {
                    const job = data.buildingJob
                    if (job.id)
                        data.buildings.find((b) => b.id === job.id).level++
                    else
                        data.buildings.push({
                            id: `${job.type}-${job.siteId}`,
                            type: job.type,
                            siteId: job.siteId,
                            level: 1,
                        })
                    data.buildingJob = null
                    revision++
                }
            }
            if (researchJob?.endsAt <= end) {
                research[researchJob.type]++
                researchJob = null
                revision++
            }
            if (processMissions(end)) revision++
            lastSettled = end
        }
    }
    function persist(force = true) {
        if (!economyMode || !storage) return
        if (!force && realNow() - lastSaved < 1000) return
        try {
            storage.setItem(
                saveKey,
                JSON.stringify({
                    schema: 1,
                    offset,
                    lastSettled,
                    selectedPlanet,
                    states: [...states],
                    research,
                    researchJob,
                    missions,
                    nextMission,
                    messages: inbox.snapshot(),
                }),
            )
            saveStatus = saveRecovered ? 'invalid' : 'saved'
            lastSaved = realNow()
        } catch {
            saveStatus = 'memory'
        }
    }
    if (economyMode && storage) {
        try {
            const saved = readSave(storage)
            if (saved) {
                if (
                    !states.has(saved.selectedPlanet) ||
                    !Array.isArray(saved.missions) ||
                    saved.missions.length > 80 ||
                    !researchTypes.every(
                        (key) =>
                            Number.isInteger(saved.research[key]) &&
                            saved.research[key] >= 0 &&
                            saved.research[key] <= 12,
                    )
                )
                    throw new Error('save_state')
                const restored = new Map(saved.states)
                if (![...states.keys()].every((key) => restored.has(key)))
                    throw new Error('save_planets')
                for (const [key, data] of restored) {
                    if (
                        !states.has(key) ||
                        !data ||
                        !Array.isArray(data.buildings) ||
                        data.buildings.length > 64 ||
                        !Array.isArray(data.orders) ||
                        data.orders.length > 25 ||
                        !Array.isArray(data.managedFleets) ||
                        data.managedFleets.length > 30 ||
                        !resourceTypes.every((r) => data.resources[r] >= 0) ||
                        !data.buildings.every(
                            (b) =>
                                Object.hasOwn(buildingCatalog, b.type) &&
                                Number.isInteger(b.level) &&
                                b.level >= 1 &&
                                b.level <= 8,
                        ) ||
                        !Array.isArray(data.fleet) ||
                        data.fleet.length !== 3 ||
                        !data.fleet.every(
                            (s) =>
                                Object.hasOwn(shipCatalog, s.type) &&
                                Number.isSafeInteger(s.count) &&
                                s.count >= 0,
                        )
                    )
                        throw new Error('save_planet')
                    data.layout = states.get(key).layout
                }
                // Validate timeline references before accepting any restored state.
                for (const data of restored.values()) {
                    for (const job of [data.buildingJob, data.shipJob])
                        if (
                            job &&
                            (!Number.isFinite(job.endsAt) ||
                                (job.paused == null &&
                                    job.endsAt < saved.lastSettled) ||
                                !Number.isFinite(job.startedAt))
                        )
                            throw new Error('save_job')
                    if (
                        data.shipJob &&
                        (!Number.isSafeInteger(data.shipJob.total) ||
                            data.shipJob.total < 1 ||
                            data.shipJob.unitMs < 1000 ||
                            !data.orders.some(
                                (o) => o.id === data.shipJob.orderId,
                            ))
                    )
                        throw new Error('save_shipjob')
                    if (
                        data.buildingJob &&
                        !Object.hasOwn(buildingCatalog, data.buildingJob.type)
                    )
                        throw new Error('save_buildjob')
                }
                if (
                    saved.researchJob &&
                    (!researchTypes.includes(saved.researchJob.type) ||
                        !restored.has(saved.researchJob.planetId) ||
                        saved.researchJob.endsAt < saved.lastSettled)
                )
                    throw new Error('save_research')
                for (const mission of saved.missions)
                    if (
                        !restored.has(mission.originId) ||
                        !restored.has(mission.targetId) ||
                        !['flying', 'arrived'].includes(mission.status) ||
                        !Number.isFinite(mission.arrivesAt) ||
                        (mission.kind === 'transport' &&
                            (!mission.cargo ||
                                !Number.isFinite(mission.returnsAt))) ||
                        (mission.status === 'flying' &&
                            !restored
                                .get(mission.originId)
                                .managedFleets.some(
                                    (g) => g.missionId === mission.id,
                                ))
                    )
                        throw new Error('save_mission')
                inbox.restore(saved.messages)
                states.clear()
                for (const [key, data] of restored) states.set(key, data)
                offset = saved.offset
                lastSettled = saved.lastSettled
                selectedPlanet = saved.selectedPlanet
                research = saved.research
                researchJob = saved.researchJob
                missions = saved.missions
                nextMission = saved.nextMission
            }
        } catch {
            saveStatus = 'invalid'
            saveRecovered = true
        }
    }
    Object.assign(api, {
        async startBuilding(type, id = null) {
            if (current().buildingJob) throw new DemoError('economy_busy')
            let siteId,
                nextLevel = 1
            if (id) {
                const existing = checkUpgrade(snapshot(), id)
                type = existing.type
                nextLevel = existing.level + 1
            } else siteId = planBuild(snapshot(), type).siteId
            if (type === 'research' && researchJob?.planetId === selectedPlanet)
                throw new DemoError('economy_busy')
            const cost = pay(
                type,
                ['rocket', 'laser'].includes(type) ? 1 : nextLevel,
            )
            const startedAt = lastSettled
            current().buildingJob = {
                type,
                id,
                siteId,
                nextLevel,
                cost,
                startedAt,
                endsAt:
                    startedAt +
                    duration(type, cost, current().buildings, nextLevel),
            }
            return snapshot()
        },
        async startResearch(type) {
            if (!researchTypes.includes(type))
                throw new DemoError('research_type')
            if (researchJob || current().buildingJob?.type === 'research')
                throw new DemoError('economy_busy')
            if (research[type] >= 12) throw new DemoError('max_level')
            const cost = pay(type, research[type] + 1),
                startedAt = lastSettled
            researchJob = {
                type,
                cost,
                planetId: selectedPlanet,
                startedAt,
                endsAt: startedAt + duration(type, cost, current().buildings),
            }
            return snapshot()
        },
        async startShipOrder(id) {
            beginShip(current(), id, lastSettled)
            current().autoOrders = false
            return snapshot()
        },
        async startAllShipOrders() {
            const order = current().shipJob
                ? current().orders.find(
                      (o) => o.id === current().shipJob.orderId,
                  )
                : current().orders.find((o) => o.status === 'queued')
            if (!order) throw new DemoError('unknown_order')
            beginShip(current(), order.id, lastSettled)
            current().autoOrders = true
            return snapshot()
        },
        async stopShipOrders() {
            if (current().shipJob && current().shipJob.paused == null)
                current().shipJob.paused = lastSettled
            current().autoOrders = false
            return snapshot()
        },
        async advanceTime(seconds) {
            if (![60, 3600].includes(seconds)) throw new DemoError('demo_time')
            offset += seconds * 1000
            settle()
            return snapshot()
        },
        async resetAll() {
            saveRecovered = false
            missions = []
            nextMission = 1
            researchJob = null
            research = Object.fromEntries(researchTypes.map((key) => [key, 0]))
            offset = 0
            lastSettled = realNow()
            selectedPlanet = 'medium'
            for (const planet of demoPlanets)
                states.set(planet.id, fresh(planet))
            inbox.reset()
            return snapshot()
        },
    })
    if (economyMode)
        for (const [key, fn] of Object.entries(api)) {
            if (key === 'advanceMissions') continue
            api[key] = async (...args) => {
                settle()
                const result = await fn(...args)
                if (!['load', 'listPlanets'].includes(key)) revision++
                persist()
                return result?.messagePage
                    ? { ...snapshot(), messagePage: result.messagePage }
                    : key === 'listPlanets'
                      ? result
                      : snapshot()
            }
        }
    return api
}
