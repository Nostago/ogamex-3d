// Visual locations are not gameplay fields. Physical building footprints stay fixed.
export function createLayout(radius, limit) {
    const slots = []
    function accept(normal) {
        if (slots.length >= limit) return
        const position = normal.map((value) => value * radius)
        if (Math.hypot(position[0], position[1] - radius, position[2]) < 1.9)
            return
        if (
            slots.some(
                (slot) =>
                    Math.hypot(
                        ...position.map(
                            (value, axis) => value - slot.normal[axis] * radius,
                        ),
                    ) < 3.4,
            )
        )
            return
        slots.push({
            id: `site-${String(slots.length + 1).padStart(3, '0')}`,
            normal,
        })
    }
    for (const [x, z] of [
        [-1.75, -1.75],
        [1.75, -1.75],
        [-1.75, 1.75],
        [1.75, 1.75],
    ])
        accept([
            x / radius,
            Math.sqrt(radius ** 2 - x ** 2 - z ** 2) / radius,
            z / radius,
        ])
    for (let i = 0; i < 2048 && slots.length < limit; i++) {
        const y = 1 - (2 * (i + 0.5)) / 2048,
            ring = Math.sqrt(1 - y * y),
            a = i * 2.399963229728653
        accept([ring * Math.cos(a), y, ring * Math.sin(a)])
    }
    if (slots.length !== limit)
        throw new Error(
            'Visual layout does not fit the requested rendering budget',
        )
    return slots
}
export function surfacePosition(slot, radius) {
    return slot.normal.map((value) => value * radius)
}
export function chooseSite(slots, buildings, category) {
    const used = new Set(buildings.map((building) => building.siteId))
    const target =
        category === 'defense' ? 0.3 : category === 'storage' ? 0.6 : 1
    return slots
        .filter((slot) => !used.has(slot.id))
        .sort(
            (a, b) =>
                Math.abs(a.normal[1] - target) -
                    Math.abs(b.normal[1] - target) || a.id.localeCompare(b.id),
        )[0]
}
