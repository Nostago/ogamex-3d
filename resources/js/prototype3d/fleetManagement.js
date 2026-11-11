import { shipCatalog } from './shipCatalog.js'

// Reservations never change the built inventory. Mission reservations remain locked.
export const maxManagedFleets = 30 // Bounded demo storage, not an OGame fleet-slot rule.
export function shipInventory(inventory, orders, groups, excludeId = null) {
    return inventory.map((item) => {
        let assigned = 0,
            onMission = 0
        for (const group of groups) {
            if (group.id === excludeId) continue
            const count =
                group.ships.find((ship) => ship.type === item.type)?.count ?? 0
            assigned += count
            if (group.status === 'mission') onMission += count
        }
        const inProduction = orders
            .filter(
                (order) =>
                    order.status === 'queued' && order.type === item.type,
            )
            .reduce((sum, order) => sum + order.quantity, 0)
        return {
            type: item.type,
            completed: item.count,
            ready: item.count - onMission,
            assigned,
            onMission,
            available: item.count - assigned,
            inProduction,
        }
    })
}
export function validateFleet(state, name, counts, editId = null) {
    const error = (code) => {
        const e = new Error(code)
        e.code = code
        throw e
    }
    const existing = editId
        ? state.managedFleets.find((group) => group.id === editId)
        : null
    if (editId && !existing) error('unknown_fleet')
    if (existing?.status === 'mission') error('fleet_on_mission')
    if (!editId && state.managedFleets.length >= maxManagedFleets)
        error('fleet_slots')
    if (
        typeof name !== 'string' ||
        !name.trim() ||
        name.trim().length > 60 ||
        /[\u0000-\u001f\u007f]/.test(name)
    )
        error('fleet_name')
    if (
        !counts ||
        typeof counts !== 'object' ||
        Array.isArray(counts) ||
        Object.keys(counts).some((type) => !Object.hasOwn(shipCatalog, type))
    )
        error('fleet_quantities')
    const inventory = shipInventory(
        state.fleet,
        state.orders,
        state.managedFleets,
        editId,
    )
    const ships = []
    for (const item of inventory) {
        const count = counts[item.type] ?? 0
        if (!Number.isSafeInteger(count) || count < 0) error('fleet_quantities')
        if (count > item.available) error('fleet_unavailable')
        if (count) ships.push({ type: item.type, count })
    }
    if (!ships.length) error('fleet_empty')
    return { name: name.trim(), ships }
}
