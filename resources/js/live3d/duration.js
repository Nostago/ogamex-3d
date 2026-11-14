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
