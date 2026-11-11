import { buildingCatalog, buildingTypes } from './catalog.js'
import { createLayout, chooseSite } from './layout.js'
import { demoPlanets, initialBuildings } from './planets.js'
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
            fleetTotal(state.fleet) + pendingCount(state.orders) + quantity,
        )
    )
        throw new DemoError('count_overflow')
}
// An authenticated adapter can supply the same DTO; the server remains authoritative.
export function createDemoProvider() {
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
            fleet: exampleFleet('patrol'),
            orders: [],
            nextOrder: 1,
        }
    }
    for (const profile of demoPlanets) states.set(profile.id, fresh(profile))
    const profile = () =>
        demoPlanets.find((planet) => planet.id === selectedPlanet)
    const current = () => states.get(selectedPlanet)
    function snapshot() {
        const planet = profile(),
            { layout, buildings, fleet, orders } = current()
        return {
            planet: { ...planet },
            name: planet.name,
            coordinates: `[1:42:${demoPlanets.indexOf(planet) + 6}]`,
            capacity: getCapacity(planet, buildings),
            fleet: fleet.map((item) => ({ ...item })),
            orders: orders.map((item) => ({ ...item })),
            fleetSummary: {
                total: fleetTotal(fleet),
                pending: pendingCount(orders),
            },
            formations: createFormations(fleet),
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
    return {
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
                    fleetTotal(current().fleet) + order.quantity,
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
            states.set(selectedPlanet, fresh(profile()))
            return snapshot()
        },
    }
}
