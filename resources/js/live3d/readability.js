const storageKey = 'ogamex-ui-text-scale-v1',
    allowed = ['1', '1.15', '1.3', '1.5']
export function applyFrameReadability(doc) {
    if (doc?.documentElement)
        doc.documentElement.style.setProperty(
            '--ui-text-scale',
            document.documentElement.style.getPropertyValue(
                '--ui-text-scale',
            ) || '1',
        )
}
export function initReadability() {
    const select = document.querySelector('#live-ui-text-scale')
    let value = '1'
    try {
        const saved = localStorage.getItem(storageKey)
        if (allowed.includes(saved)) value = saved
    } catch {
        /* Private browsing may disable storage. */
    }
    function apply(next, save = true) {
        value = allowed.includes(next) ? next : '1'
        select.value = value
        document.documentElement.style.setProperty('--ui-text-scale', value)
        for (const frame of document.querySelectorAll('iframe')) {
            try {
                applyFrameReadability(frame.contentDocument)
            } catch {
                /* Same-origin game areas only. */
            }
        }
        if (save)
            try {
                localStorage.setItem(storageKey, value)
            } catch {
                /* The current setting still works. */
            }
    }
    select.addEventListener('change', () => apply(select.value))
    document
        .querySelector('#live-ui-text-reset')
        .addEventListener('click', () => apply('1'))
    apply(value, false)
}
