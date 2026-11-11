import { missionProgress } from './missions.js'
export function renderMissions(host, state, t, number, onTarget) {
    host.replaceChildren()
    host.append(
        node('h2', '', t.mission_overview),
        node('p', 'muted', t.mission_demo_note),
    )
    if (!state.missions.length) host.append(node('p', 'muted', t.no_missions))
    for (const mission of state.missions.slice().reverse()) {
        const card = node('article', 'mission-card')
        card.dataset.mission = mission.id
        card.append(
            node(
                'h3',
                '',
                `${mission.name} · ${t[mission.status === 'flying' ? (mission.delivered ? 'transport_returning' : 'mission_flying') : 'mission_arrived']}`,
            ),
            node('p', '', `${mission.originName} → ${mission.targetName}`),
            node(
                'p',
                'muted',
                mission.ships
                    .map((s) => `${number.format(s.count)} × ${t[s.type]}`)
                    .join(' · '),
            ),
        )
        if (mission.kind === 'transport')
            card.append(
                node(
                    'p',
                    'muted',
                    `${t.transport_mission}: ${Object.entries(mission.cargo)
                        .map(
                            ([key, value]) =>
                                `${t[`resource_${key}`]} ${number.format(value)}`,
                        )
                        .join(
                            ' · ',
                        )} · ${t[mission.status === 'arrived' ? 'transport_home' : mission.delivered ? 'transport_returning' : 'transport_outbound']}`,
                ),
            )
        const bar = node('progress')
        bar.max = 1
        bar.value = missionProgress(mission, Date.now())
        bar.dataset.missionProgress = mission.id
        bar.setAttribute('aria-label', t.flight_progress)
        const remaining = node('p', 'muted')
        remaining.dataset.missionRemaining = mission.id
        const target = node('button', '', t.open_target)
        target.addEventListener('click', () => onTarget(mission.targetId))
        card.append(bar, remaining, target)
        host.append(card)
    }
    updateMissionProgress(host, state, t)
}
export function updateMissionProgress(host, state, t) {
    for (const mission of state.missions) {
        const bar = host.querySelector(
                `[data-mission-progress="${mission.id}"]`,
            ),
            remaining = host.querySelector(
                `[data-mission-remaining="${mission.id}"]`,
            )
        if (bar) bar.value = missionProgress(mission, Date.now())
        if (remaining)
            remaining.textContent =
                mission.status === 'arrived'
                    ? t.mission_arrived
                    : `${t.arrival_in} ${Math.max(0, Math.ceil(((mission.delivered ? mission.returnsAt : mission.arrivesAt) - Date.now()) / 1000))} s`
    }
}
function node(tag, cls, text) {
    const n = document.createElement(tag)
    if (cls) n.className = cls
    if (text !== undefined) n.textContent = text
    return n
}
