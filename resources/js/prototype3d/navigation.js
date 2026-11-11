export const pages = Object.freeze([
    'planet',
    'buildings',
    'ships',
    'fleets',
    'messages',
])
export function pageFromHash(hash) {
    const value = hash.replace(/^#/, '')
    return pages.includes(value) ? value : 'planet'
}
