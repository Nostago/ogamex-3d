import { messageTabs, messagePageSize } from './messages.js'

export function createMessageUi({ host, getState, provider, onChange, t }) {
    let tab = 'fleets',
        subtab = 'espionage',
        page = 1,
        selected = null,
        notice = ''
    const el = (tag, cls, text) => {
        const n = document.createElement(tag)
        if (cls) n.className = cls
        if (text !== undefined) n.textContent = text
        return n
    }
    const filtered = () =>
        getState()
            .messages.filter((m) => m.tab === tab && m.subtab === subtab)
            .slice()
            .reverse()
    async function load() {
        try {
            page = Math.min(
                page,
                Math.max(1, Math.ceil(filtered().length / messagePageSize)),
            )
            const state = await provider.readMessages(tab, subtab, page)
            notice = ''
            onChange(state)
        } catch (e) {
            notice = t[`error_${e.code}`] || t.build_error
            render()
        }
    }
    function title(m) {
        return t[`message_${m.key}_subject`] || m.key
    }
    function body(m) {
        let value = t[`message_${m.key}_body`] || ''
        for (const [key, text] of Object.entries(m.params))
            value = value.replaceAll(
                `:${key}`,
                typeof text === 'number'
                    ? new Intl.NumberFormat('de-DE').format(text)
                    : String(text),
            )
        return value
    }
    function render() {
        const state = getState()
        host.replaceChildren()
        const categories = el('div', 'mail-tabs')
        categories.setAttribute('role', 'group')
        categories.setAttribute('aria-label', t.mail_categories)
        for (const key of Object.keys(messageTabs)) {
            const unread = state.messages.filter(
                (m) => m.tab === key && !m.viewed,
            ).length
            const button = el(
                'button',
                key === tab ? 'active' : '',
                `${t[`mail_${key}`]}${unread ? ` (${unread})` : ''}`,
            )
            button.id = `mail-tab-${key}`
            button.dataset.mailTab = key
            button.setAttribute('aria-pressed', String(key === tab))
            button.addEventListener('click', () => {
                tab = key
                subtab = messageTabs[key][0]
                page = 1
                selected = null
                load()
            })
            categories.append(button)
        }
        const subtabs = el('div', 'mail-subtabs')
        for (const key of messageTabs[tab]) {
            const button = el(
                'button',
                key === subtab ? 'active' : '',
                t[`mail_${key}`],
            )
            button.id = `mail-subtab-${key}`
            button.dataset.mailSubtab = key
            button.setAttribute('aria-pressed', String(key === subtab))
            button.addEventListener('click', () => {
                subtab = key
                page = 1
                selected = null
                load()
            })
            subtabs.append(button)
        }
        host.append(categories, subtabs, el('p', 'muted', t.mail_demo_note))
        const layout = el('div', 'equal-layout'),
            list = el('section', 'card message-list'),
            reader = el('section', 'card message-reader')
        const rows = filtered(),
            totalPages = Math.max(1, Math.ceil(rows.length / messagePageSize))
        page = Math.min(page, totalPages)
        list.append(el('h2', '', t[`mail_${subtab}`]))
        const visible = rows.slice(
            (page - 1) * messagePageSize,
            page * messagePageSize,
        )
        for (const message of visible) {
            const button = el(
                'button',
                `message-row ${message.id === selected ? 'selected' : ''} ${!message.viewed ? 'unread' : ''}`,
            )
            button.id = `open-${message.id}`
            button.dataset.messageId = message.id
            button.append(
                el('strong', '', title(message)),
                el(
                    'small',
                    '',
                    message.createdAt
                        ? new Intl.DateTimeFormat('de-DE', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                              timeZone: 'Europe/Berlin',
                          }).format(message.createdAt)
                        : t.sample_message,
                ),
            )
            button.addEventListener('click', () => {
                selected = message.id
                load()
            })
            list.append(button)
        }
        if (!visible.length) list.append(el('p', 'muted', t.no_messages))
        const pagination = el('div', 'mail-pagination'),
            previous = el('button', '', t.previous_page),
            next = el('button', '', t.next_page),
            refresh = el('button', '', t.refresh_messages)
        previous.id = 'mail-previous'
        next.id = 'mail-next'
        refresh.id = 'mail-refresh'
        previous.disabled = page <= 1
        next.disabled = page >= totalPages
        previous.addEventListener('click', () => {
            page--
            selected = null
            load()
        })
        next.addEventListener('click', () => {
            page++
            selected = null
            load()
        })
        refresh.addEventListener('click', load)
        pagination.append(
            previous,
            el('span', '', `${page} / ${totalPages}`),
            next,
            refresh,
        )
        list.append(pagination)
        if (notice) reader.append(el('p', 'capacity-warning', notice))
        const message = state.messages.find(
            (m) => m.id === selected && m.tab === tab && m.subtab === subtab,
        )
        if (message) {
            reader.append(el('h2', '', title(message)))
            const content = el('p', 'message-body', body(message))
            content.id = 'message-body'
            reader.append(content)
            const remove = el('button', '', t.delete_message)
            remove.id = 'delete-message'
            remove.addEventListener('click', async () => {
                try {
                    await provider.deleteMessage(message.id)
                    selected = null
                    load()
                } catch (e) {
                    notice = t[`error_${e.code}`] || t.build_error
                    render()
                }
            })
            reader.append(remove)
        } else
            reader.append(
                el('h2', '', t.message_details),
                el('p', 'muted', t.select_message),
            )
        layout.append(list, reader)
        host.append(layout)
    }
    return { render, load }
}
