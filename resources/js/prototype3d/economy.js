import { economyRules } from './economyRules.js'
import { resourceTypes } from './transport.js'
export { economyRules }
export const researchTypes = Object.freeze([
    'energyTech',
    'laserTech',
    'combustion',
    'impulse',
    'espionage',
    'computer',
])
export const universe = Object.freeze({ economySpeed: 1, researchSpeed: 1 })
export const levelOf = (buildings, type) =>
    buildings.find((b) => b.type === type)?.level ?? 0
export const storageLimit = (level) =>
    5000 * Math.floor(2.5 * Math.exp((20 * level) / 33))
export function production(buildings, planetId, research = {}, resources = {}) {
    const lv = (type) => levelOf(buildings, type)
    const raw = (type, base) => base * lv(type) * 1.1 ** lv(type)
    const positionBonus = { small: 1.17, medium: 1.23, large: 1.35 }[planetId]
    const temperature = { small: 80, medium: 40, large: -40 }[planetId]
    const mines = {
        metal: Math.ceil(
            raw('metal', 30) +
                Math.floor(raw('metal', 30) * (positionBonus - 1)),
        ),
        crystal: Math.ceil(raw('crystal', 20)),
        deuterium: Math.ceil(
            raw('deuterium', 10) * (1.44 - 0.004 * temperature),
        ),
    }
    let fusionFuel = Math.ceil(-raw('fusion', 10))
    const fusionOn =
        resources.deuterium > 0 || mines.deuterium + fusionFuel >= 0
    const energyMade =
        Math.floor(raw('solar', 20)) +
        (fusionOn
            ? Math.floor(
                  30 *
                      lv('fusion') *
                      (1.05 + (research.energyTech ?? 0) * 0.01) **
                          lv('fusion'),
              )
            : 0)
    const energyUsed =
        -Math.floor(-raw('metal', 10)) -
        Math.floor(-raw('crystal', 10)) -
        Math.floor(-raw('deuterium', 20))
    const factor = energyUsed
        ? Math.min(
              1,
              Math.max(0, Math.floor((energyMade / energyUsed) * 100) / 100),
          )
        : 1
    if (!fusionOn) fusionFuel = 0
    return {
        rates: {
            metal: Math.ceil(30 * positionBonus + mines.metal * factor),
            crystal: Math.ceil(15 + mines.crystal * factor),
            deuterium: Math.ceil((mines.deuterium + fusionFuel) * factor),
        },
        limits: Object.fromEntries(
            resourceTypes.map((key) => [
                key,
                storageLimit(lv(`${key}Storage`)),
            ]),
        ),
        energyMade,
        energyUsed,
        factor,
        temperature,
        positionBonus,
        mines,
    }
}
export function price(type, level = 1, quantity = 1) {
    const rule = economyRules[type]
    const multiplier = rule.factor ** (level - 1)
    return Object.fromEntries(
        Object.entries(rule.cost).map(([key, value]) => [
            key,
            Math.floor(value * multiplier) * (key === 'energy' ? 1 : quantity),
        ]),
    )
}
export function missingRequirements(type, buildings, research) {
    return Object.entries(economyRules[type].requirements).filter(
        ([key, level]) =>
            (researchTypes.includes(key)
                ? (research[key] ?? 0)
                : levelOf(buildings, key)) < level,
    )
}
export function duration(type, cost, buildings, nextLevel = 1) {
    const lv = (key) => levelOf(buildings, key)
    const research = researchTypes.includes(type)
    const unit = [
        'lightFighter',
        'smallCargo',
        'probe',
        'rocket',
        'laser',
    ].includes(type)
    const denominator = research
        ? 1000 * (1 + lv('research'))
        : 2500 *
          (1 + lv(unit ? 'shipyard' : 'robotics')) *
          2 ** lv('nanite') *
          (unit || type === 'nanite' ? 1 : Math.max(4 - nextLevel / 2, 1))
    return (
        Math.max(
            1,
            Math.floor(((cost.metal + cost.crystal) * 3600) / denominator),
        ) * 1000
    )
}
export function integrate(resources, stats, milliseconds) {
    const result = { ...resources }
    for (const key of resourceTypes) {
        const rate = stats.rates[key]
        // Trade may exceed storage; production does not destroy that surplus.
        result[key] =
            rate >= 0
                ? Math.max(
                      resources[key],
                      Math.min(
                          stats.limits[key],
                          resources[key] + (rate * milliseconds) / 3600000,
                      ),
                  )
                : Math.max(0, resources[key] + (rate * milliseconds) / 3600000)
    }
    return result
}
