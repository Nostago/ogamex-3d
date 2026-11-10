// Sample figures only: deliberately not OGame's production/cost formulas.
// A future HTTP adapter must implement load() and upgrade(id), returning this DTO.
export const buildingTypes = ['metal', 'crystal', 'deuterium', 'solar']
export function createDemoProvider() {
    let buildings
    const reset = () => {
        buildings = buildingTypes.map((id, index) => ({
            id,
            level: [4, 3, 2, 5][index],
        }))
    }
    const snapshot = () => ({
        name: 'Kepler IX',
        coordinates: '[1:42:8]',
        buildings: buildings.map((building) => ({
            ...building,
            production: Math.round(
                [120, 90, 60, 150][buildingTypes.indexOf(building.id)] *
                    building.level *
                    1.24 ** building.level,
            ),
        })),
    })
    reset()
    return {
        async load() {
            return snapshot()
        },
        async upgrade(id) {
            const building = buildings.find((item) => item.id === id)
            if (!building) throw new Error('Unknown building')
            building.level = Math.min(8, building.level + 1)
            return snapshot()
        },
        async reset() {
            reset()
            return snapshot()
        },
    }
}
