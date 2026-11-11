export const pages = Object.freeze([
    'planet',
    'buildings',
    'ships',
    'fleets',
    'galaxy',
    'messages',
])
export function pageFromHash(hash) {
    const value = hash.replace(/^#/, '')
    return pages.includes(value) ? value : 'planet'
}
