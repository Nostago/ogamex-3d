// Demo catalogue, not OGame balancing or prerequisites. Add types here and a model.
export const buildingTypes = Object.freeze([
    'metal',
    'crystal',
    'deuterium',
    'solar',
])
export const buildingCatalog = Object.freeze(
    Object.fromEntries(
        [
            ['metal', 'economy', 'production', 120],
            ['crystal', 'economy', 'production', 90],
            ['deuterium', 'economy', 'production', 60],
            ['solar', 'economy', 'energy', 150],
            ['shipyard', 'facilities', 'facility', 10],
            ['research', 'facilities', 'facility', 12],
            ['robotics', 'facilities', 'facility', 8],
            ['metalStorage', 'storage', 'capacity', 2500],
            ['crystalStorage', 'storage', 'capacity', 2000],
            ['deuteriumStorage', 'storage', 'capacity', 1500],
            ['rocket', 'defense', 'defense', 60],
            ['laser', 'defense', 'defense', 80],
            ['terraformer', 'facilities', 'capacity', 5],
            ['nanite', 'facilities', 'facility', 24],
            ['fusion', 'economy', 'energy', 230],
        ].map(([id, category, metric, base]) => [
            id,
            Object.freeze({
                id,
                category,
                metric,
                base,
                repeatable: category === 'defense',
                consumesField: category !== 'defense',
            }),
        ]),
    ),
)
