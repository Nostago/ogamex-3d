// UI projection only: coordinates are schematic; authoritative flight times remain in OGameX.
const neighbours = [
    [10, 10],
    [32, 8],
    [59, 9],
    [85, 12],
    [11, 35],
    [29, 31],
    [85, 36],
    [13, 65],
    [73, 64],
    [92, 66],
    [12, 89],
    [38, 88],
    [63, 91],
    [87, 90],
]
export function systemPosition(position, home = 8) {
    if (Number(position) === Number(home)) return { x: 50, y: 50 }
    const index = Math.max(
        0,
        Math.min(
            13,
            Number(position) - 1 - (Number(position) > Number(home) ? 1 : 0),
        ),
    )
    const [x, y] = neighbours[index]
    return { x, y }
}
export function fleetPoint(fleet, galaxy, system, home, now) {
    function endpoint(value) {
        const [g, s, p] = String(value)
            .replace(/[\[\]]/g, '')
            .split(':')
            .map(Number)
        return g === galaxy && s === system && p >= 1 && p <= 15
            ? systemPosition(p, home)
            : { x: g < galaxy || (g === galaxy && s < system) ? 1 : 99, y: 50 }
    }
    const from = endpoint(fleet.origin),
        to = endpoint(fleet.destination),
        progress = fleet.holding
            ? 1
            : Math.max(
                  0,
                  Math.min(
                      1,
                      (now - fleet.departure) /
                          Math.max(1, fleet.arrival - fleet.departure),
                  ),
              )
    return {
        from,
        to,
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress,
        angle: (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI,
        progress,
    }
}
export function reportFor(reports, row, type = 1) {
    const bodies = Array.isArray(row.planets)
        ? row.planets
        : row.planets
          ? [row.planets]
          : []
    if (!bodies.some((body) => body.planetType === type && !body.isDestroyed))
        return null
    return (
        (reports || []).find(
            (report) =>
                report.position === row.position &&
                report.type === type &&
                String(report.targetPlayer) === String(row.playerId),
        ) || null
    )
}

// Nearby missions remain individually reachable; offsets are display spacing, not coordinates.
export function spaceRadarContacts(points, width, height) {
    const placed = [],
        gap = 46
    return points.map((point) => {
        let candidate
        for (let step = 0; step < 240; step++) {
            const angle = step * 2.3999632297,
                radius = step ? gap * Math.sqrt(step) : 0
            candidate = {
                x: Math.max(
                    22,
                    Math.min(
                        width - 22,
                        (point.x * width) / 100 + Math.cos(angle) * radius,
                    ),
                ),
                y: Math.max(
                    22,
                    Math.min(
                        height - 22,
                        (point.y * height) / 100 + Math.sin(angle) * radius,
                    ),
                ),
            }
            if (
                placed.every(
                    (other) =>
                        (other.x - candidate.x) ** 2 +
                            (other.y - candidate.y) ** 2 >=
                        gap ** 2,
                )
            )
                break
        }
        placed.push(candidate)
        return {
            x: (candidate.x / width) * 100,
            y: (candidate.y / height) * 100,
        }
    })
}
