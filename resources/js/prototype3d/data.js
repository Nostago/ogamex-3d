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
export function createDemoProvider({ now = () => Date.now() } = {}) {
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
            resources: { metal: 100000, crystal: 50000, deuterium: 25000 },
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
                const value =
                    item.type === 'terraformer'
                        ? terraformerBonus(item.level)
                        : Math.round(
                              descriptor.base *
                                  item.level *
                                  (buildingTypes.includes(item.type)
                                      ? 1.24 ** item.level
                                      : 1),
                          )
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
    return {
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
                        !Number.isSafeInteger(
                            target.resources[key] + incoming + cargo[key],
                        )
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
            const time = now()
            let changed = false
            for (const mission of missions.filter(
                (m) => m.status === 'flying' && m.arrivesAt <= time,
            )) {
                const source = states.get(mission.originId),
                    target = states.get(mission.targetId)
                const group = source.managedFleets.find(
                    (g) =>
                        g.id === mission.fleetId && g.missionId === mission.id,
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
            return changed ? snapshot() : null
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
            const existing = current().buildings.find((item) => item.id === id)
            if (existing?.level === 8) return snapshot()
            checkUpgrade(snapshot(), id)
            existing.level++
            return snapshot()
        },
        async reset() {
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
}
