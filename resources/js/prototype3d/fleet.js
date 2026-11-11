import { shipCatalog } from './shipCatalog.js'

// All counts are data. Rendering work is bounded by types × models per formation.
export const modelsPerFormation = 4
export const maxOrderQuantity = 1_000_000_000 // Demo input guard, not a game limit.
export const maxPendingOrders = 20
export const fleetExamples = Object.freeze({
    patrol: Object.freeze({ lightFighter: 1, smallCargo: 1, probe: 1 }),
    armada: Object.freeze({
        lightFighter: 750_000,
        smallCargo: 250_000,
        probe: 100_000,
    }),
})
export function createFormations(fleet) {
    return fleet
        .filter((item) => item.count > 0)
        .map((item) => ({
            id: `ship-${item.type}`,
            type: item.type,
            count: item.count,
            modelCount: Math.min(item.count, modelsPerFormation),
        }))
}
export function fleetTotal(fleet) {
    return fleet.reduce((sum, item) => sum + item.count, 0)
}
export function pendingCount(orders, type) {
    return orders
        .filter(
            (item) => item.status === 'queued' && (!type || item.type === type),
        )
        .reduce((sum, item) => sum + item.quantity, 0)
}
export function exampleFleet(name) {
    const example = fleetExamples[name]
    if (!Object.hasOwn(fleetExamples, name)) return null
    return Object.keys(shipCatalog).map((type) => ({
        type,
        count: example[type],
    }))
}
