import { createLayout, chooseSite } from '../prototype3d/layout.js'
import { buildingCatalog } from '../prototype3d/catalog.js'
export const modelAliases = Object.freeze({
    metal_mine: 'metal',
    crystal_mine: 'crystal',
    deuterium_synthesizer: 'deuterium',
    solar_plant: 'solar',
    fusion_plant: 'fusion',
    metal_store: 'metalStorage',
    crystal_store: 'crystalStorage',
    deuterium_store: 'deuteriumStorage',
    robot_factory: 'robotics',
    shipyard: 'shipyard',
    research_lab: 'research',
    nano_factory: 'nanite',
    terraformer: 'terraformer',
    rocket_launcher: 'rocket',
    light_laser: 'laser',
})
const ships = {
    light_fighter: 'lightFighter',
    small_cargo: 'smallCargo',
    espionage_probe: 'probe',
}
export function visualState(snapshot) {
    const radius = Math.min(12, Math.max(6, snapshot.planet.diameter / 1700))
    // The live scene has at most 15 distinct building models. Twenty-four sites
    // also fit the smallest visual sphere (radius 6); 48 cannot and used to
    // abort the entire interface on small planets and moons.
    const layout = createLayout(radius, 24),
        buildings = []
    for (const item of snapshot.objects) {
        const type = modelAliases[item.key]
        if (!type || BigInt(item.amount) === 0n) continue
        const site = chooseSite(
            layout,
            buildings,
            buildingCatalog[type].category,
        )
        if (!site) continue
        buildings.push({
            id: String(item.id),
            type,
            siteId: site.id,
            level: Math.min(8, Number(item.amount)),
            displayLevel: item.amount,
        })
    }
    const formations = snapshot.objects
        .filter((item) => ships[item.key] && BigInt(item.amount) > 0n)
        .map((item) => ({
            id: `ship-${ships[item.key]}`,
            type: ships[item.key],
            count: Number(item.amount),
            modelCount: Number(
                BigInt(item.amount) > 4n ? 4n : BigInt(item.amount),
            ),
        }))
    return {
        planet: {
            id: String(snapshot.planet.id),
            renderRadius: radius,
            tint: snapshot.planet.type === 3 ? 0xb8b5b2 : 0xffffff,
        },
        fleetSummary: { total: snapshot.shipTotal ?? 0 },
        layout,
        buildings,
        formations,
    }
}
