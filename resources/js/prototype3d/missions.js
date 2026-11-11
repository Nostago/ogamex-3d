export const demoFlightMs = 15_000
export const maxActiveMissions = 30
export function missionProgress(mission, now) {
    return mission.status === 'arrived'
        ? 1
        : Math.min(
              1,
              Math.max(
                  0,
                  (now - mission.startedAt) /
                      (mission.arrivesAt - mission.startedAt),
              ),
          )
}
export function missionShips(missions, targetId) {
    return missions
        .filter((m) => m.status === 'flying' && m.targetId === targetId)
        .reduce((sum, m) => sum + m.ships.reduce((n, s) => n + s.count, 0), 0)
}
