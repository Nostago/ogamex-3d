// Tab/subtab keys and page size follow MessageService::$tabs and getMessagesForTab.
export const messageTabs = Object.freeze({
    fleets: [
        'espionage',
        'combat_reports',
        'expeditions',
        'transport',
        'other',
    ],
    communication: ['messages', 'information'],
    economy: ['economy'],
    universe: ['universe'],
    system: ['system'],
    favorites: ['favorites'],
})
export const messagePageSize = 10
export function createDemoInbox() {
    let nextId = 1
    let messages = [
        ['fleets', 'espionage', 'sample_espionage'],
        ['communication', 'messages', 'sample_communication'],
        ['economy', 'economy', 'sample_economy'],
        ['universe', 'universe', 'sample_universe'],
        ['system', 'system', 'sample_system'],
    ].map(([tab, subtab, key]) => ({
        id: `message-${nextId++}`,
        tab,
        subtab,
        key,
        viewed: false,
        createdAt: null,
        params: {},
    }))
    function snapshot() {
        return messages.map((item) => ({ ...item, params: { ...item.params } }))
    }
    function page(tab, subtab, pageNumber = 1) {
        if (
            !Object.hasOwn(messageTabs, tab) ||
            !messageTabs[tab].includes(subtab) ||
            !Number.isSafeInteger(pageNumber) ||
            pageNumber < 1
        )
            throw Object.assign(new Error('message_filter'), {
                code: 'message_filter',
            })
        const filtered = messages
            .filter((item) => item.tab === tab && item.subtab === subtab)
            .slice()
            .reverse()
        const items = filtered.slice(
            (pageNumber - 1) * messagePageSize,
            pageNumber * messagePageSize,
        )
        items.forEach((item) => {
            item.viewed = true
        })
        return {
            tab,
            subtab,
            page: pageNumber,
            pages: Math.max(1, Math.ceil(filtered.length / messagePageSize)),
            total: filtered.length,
            ids: items.map((item) => item.id),
        }
    }
    return {
        snapshot,
        page,
        delete(id) {
            const found = messages.find((item) => item.id === id)
            if (!found)
                throw Object.assign(new Error('unknown_message'), {
                    code: 'unknown_message',
                })
            messages = messages.filter((item) => item.id !== id)
        },
        transport(mission, createdAt, returned) {
            messages.push({
                id: `message-${nextId++}`,
                tab: 'fleets',
                subtab: 'transport',
                key: returned ? 'transport_return' : 'transport_delivery',
                viewed: false,
                createdAt,
                params: {
                    name: mission.name,
                    from: mission.originName,
                    to: mission.targetName,
                    ...mission.cargo,
                },
            })
            messages = messages.slice(-100)
        },
        arrival(mission, createdAt) {
            messages.push({
                id: `message-${nextId++}`,
                tab: 'fleets',
                subtab: 'other',
                key: 'fleet_deployment',
                viewed: false,
                createdAt,
                params: {
                    name: mission.name,
                    from: mission.originName,
                    to: mission.targetName,
                    quantity: mission.ships.reduce((n, s) => n + s.count, 0),
                },
            })
            messages = messages.slice(-100)
        },
    }
}
