// Deliberately independent example diameters/capacities, not planet-generation rules.
export const demoPlanets = Object.freeze([
    Object.freeze({
        id: 'small',
        name: 'Aster',
        diameter: 9000,
        renderRadius: 6,
        field_max: 16,
        visualLimit: 18,
        tint: 0xc8ad92,
    }),
    Object.freeze({
        id: 'medium',
        name: 'Kepler IX',
        diameter: 14000,
        renderRadius: 8.5,
        field_max: 32,
        visualLimit: 32,
        tint: 0xffffff,
    }),
    Object.freeze({
        id: 'large',
        name: 'Titan Prime',
        diameter: 22000,
        renderRadius: 12,
        field_max: 64,
        visualLimit: 48,
        tint: 0xb6c8dd,
    }),
])
export function initialBuildings(id) {
    const entries = [
        ['metal', 4],
        ['crystal', 3],
        ['deuterium', 2],
        ['solar', 5],
    ]
    if (id === 'small') entries.push(['shipyard', 1], ['rocket', 1])
    if (id === 'medium')
        entries.push(
            ['shipyard', 2],
            ['research', 2],
            ['robotics', 1],
            ['metalStorage', 1],
            ['laser', 1],
        )
    if (id === 'large')
        entries.push(
            ['shipyard', 3],
            ['research', 3],
            ['robotics', 2],
            ['metalStorage', 2],
            ['crystalStorage', 2],
            ['deuteriumStorage', 2],
            ['terraformer', 1],
            ['rocket', 1],
            ['laser', 1],
        )
    return entries
}
