// Stable per-world colour: no shared Earth atlas and no new colour on reload.
export function planetTint(id, type = 1) {
    let seed = 2166136261
    for (const character of `${type}:${id}`)
        seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0
    const hue = (seed % 360) / 60
    const saturation = type === 3 ? 0.13 : 0.28 + ((seed >>> 8) % 28) / 100
    const value = type === 3 ? 0.46 : 0.42 + ((seed >>> 16) % 22) / 100
    const chroma = saturation * value,
        x = chroma * (1 - Math.abs((hue % 2) - 1)),
        m = value - chroma
    const rgb = [
        [chroma, x, 0],
        [x, chroma, 0],
        [0, chroma, x],
        [0, x, chroma],
        [x, 0, chroma],
        [chroma, 0, x],
    ][Math.floor(hue)]
    return rgb.reduce(
        (hex, channel) => (hex << 8) | Math.round((channel + m) * 255),
        0,
    )
}
