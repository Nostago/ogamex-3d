import { demoPlanets } from './planets.js'

// Bounded sample universe, not the real server's universe configuration.
export const galaxyBounds = Object.freeze({ galaxies: 3, systems: 499 })
export function validSystem(galaxy, system) {
    return (
        Number.isInteger(galaxy) &&
        galaxy >= 1 &&
        galaxy <= galaxyBounds.galaxies &&
        Number.isInteger(system) &&
        system >= 1 &&
        system <= galaxyBounds.systems
    )
}
export function systemRows(galaxy, system) {
    if (!validSystem(galaxy, system)) throw new RangeError('invalid_system')
    return Array.from({ length: 16 }, (_, index) => {
        const position = index + 1
        const own =
            galaxy === 1 && system === 42 ? demoPlanets[position - 6] : null
        const foreign =
            galaxy === 1 && system === 42 && [3, 10].includes(position)
        return {
            position,
            coordinates: `[${galaxy}:${system}:${position}]`,
            kind:
                position === 16
                    ? 'expedition'
                    : own
                      ? 'own'
                      : foreign
                        ? 'foreign'
                        : 'empty',
            planetId: own?.id ?? null,
            name:
                own?.name ??
                (foreign ? (position === 3 ? 'Vega' : 'Nereid') : ''),
        }
    })
}
