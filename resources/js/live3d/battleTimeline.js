export function replayFrame(position, last) {
    const value = Math.min(Math.max(0, Number(position) || 0), last)
    return {
        index: Math.ceil(value),
        phase: Number.isInteger(value) ? 1 : value % 1,
    }
}
export function advanceReplay(position, milliseconds, speed, last) {
    return Math.min(
        last,
        Math.max(0, position) + (Math.max(0, milliseconds) * speed) / 2400,
    )
}
export function replayCount(units, key) {
    if (units === null || units === undefined) return null
    const value = String(units[key] ?? '0')
    return /^\d+$/.test(value) ? value : null
}
export function sideTypes(data, side) {
    const used = new Set(
        data.frames.flatMap((frame) => Object.keys(frame[side]?.units || {})),
    )
    return data.catalog.filter((unit) => used.has(unit.key))
}
