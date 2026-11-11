export const resourceTypes = Object.freeze(['metal', 'crystal', 'deuterium'])
// Base capacities, without research/class bonuses; probes cannot carry trade cargo.
export const cargoCapacity = (ships) =>
    ships.reduce(
        (sum, ship) =>
            sum +
            ship.count *
                ({ lightFighter: 50, smallCargo: 5000, probe: 0 }[ship.type] ??
                    0),
        0,
    )
export function validateCargo(resources, ships, cargo) {
    if (
        !cargo ||
        Object.keys(cargo).some((key) => !resourceTypes.includes(key))
    )
        return 'invalid_cargo'
    let total = 0
    for (const key of resourceTypes) {
        const amount = cargo[key]
        if (!Number.isSafeInteger(amount) || amount < 0) return 'invalid_cargo'
        if (amount > resources[key]) return 'cargo_stock'
        total += amount
    }
    if (!Number.isSafeInteger(total) || total === 0) return 'invalid_cargo'
    return total > cargoCapacity(ships) ? 'cargo_capacity' : null
}
