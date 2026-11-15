// Display only: timestamps and completion remain authoritative in Laravel.
export function formatDuration(value, labels = {}) {
    let seconds = Math.max(0, Math.ceil(Number(value) || 0))
    const days = Math.floor(seconds / 86400)
    seconds %= 86400
    const hours = Math.floor(seconds / 3600)
    seconds %= 3600
    const minutes = Math.floor(seconds / 60)
    seconds %= 60
    return `${labels.time_days || 'Tage'}: ${days} ${labels.time_hours || 'Stunden'}: ${hours} ${labels.time_minutes || 'Minuten'}: ${minutes} ${labels.time_seconds || 'Sekunden'}: ${seconds}`
}

// Four distinct, labelled fields stay readable in short and long countdowns.
export function renderDuration(node, value, labels = {}) {
    const total = Math.max(0, Math.ceil(Number(value) || 0)),
        values = [
            Math.floor(total / 86400),
            Math.floor(total / 3600) % 24,
            Math.floor(total / 60) % 60,
            total % 60,
        ],
        names = [
            labels.time_days || 'Tage',
            labels.time_hours || 'Stunden',
            labels.time_minutes || 'Minuten',
            labels.time_seconds || 'Sekunden',
        ]
    if (
        !node.classList.contains('duration-parts') ||
        node.children.length !== 4
    ) {
        node.replaceChildren()
        node.classList.add('duration-parts')
        for (const name of names) {
            const part = node.ownerDocument.createElement('span'),
                label = node.ownerDocument.createElement('span'),
                number = node.ownerDocument.createElement('strong')
            part.className = 'duration-part'
            label.textContent = name
            part.append(label, number)
            node.append(part)
        }
    }
    for (let index = 0; index < 4; index++)
        node.children[index].lastElementChild.textContent = String(
            values[index],
        )
    node.setAttribute('aria-label', formatDuration(total, labels))
}
