import { buildingCatalog, buildingTypes, colonyPlots } from './catalog.js'
export { buildingTypes } from './catalog.js'

// Mutable demo state belongs to this provider only. No storage or network access.
// Future adapters implement load(), build(type, plotId), upgrade(instanceId).
export function createDemoProvider() {
    let buildings
    const reset = () => {
        buildings = buildingTypes.map((type, index) => ({
            id: type,
            type,
            plotId: colonyPlots[index].id,
            level: [4, 3, 2, 5][index],
        }))
    }
    const snapshot = () => ({
        name: 'Kepler IX',
        coordinates: '[1:42:8]',
        plots: colonyPlots.map((plot) => ({
            ...plot,
            occupiedBy:
                buildings.find((item) => item.plotId === plot.id)?.id ?? null,
        })),
        buildings: buildings.map((building) => {
            const descriptor = buildingCatalog[building.type]
            const value = Math.round(
                descriptor.base *
                    building.level *
                    (buildingTypes.includes(building.type)
                        ? 1.24 ** building.level
                        : 1),
            )
            return {
                ...building,
                metric: descriptor.metric,
                value,
                production: buildingTypes.includes(building.type) ? value : 0,
            }
        }),
    })
    reset()
    return {
        async load() {
            return snapshot()
        },
        async build(type, plotId) {
            const descriptor = buildingCatalog[type]
            if (!Object.hasOwn(buildingCatalog, type))
                throw new Error('Unknown building type')
            if (!colonyPlots.some((plot) => plot.id === plotId))
                throw new Error('Unknown plot')
            if (buildings.some((item) => item.plotId === plotId))
                throw new Error('Occupied plot')
            if (
                !descriptor.repeatable &&
                buildings.some((item) => item.type === type)
            )
                throw new Error('Facility already built')
            buildings.push({ id: `${type}-${plotId}`, type, plotId, level: 1 })
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
