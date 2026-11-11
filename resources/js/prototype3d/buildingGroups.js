import { buildingCatalog } from './catalog.js'
export const buildingGroups = Object.freeze(['resources', 'ships', 'defense'])
export function buildingGroup(type) {
    const category = buildingCatalog[type].category
    if (category === 'defense') return 'defense'
    if (
        category === 'economy' ||
        category === 'storage' ||
        type === 'terraformer'
    )
        return 'resources'
    return 'ships'
}
