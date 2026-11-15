const storageKey = 'ogamex-ui-readability-v2',
    legacyKey = 'ogamex-ui-text-scale-v1'
const bounds = (value) =>
    Math.max(80, Math.min(160, Math.round(Number(value) || 100)))
export function applyFrameReadability(doc) {
    if (!doc?.documentElement) return
    for (const [key, fallback] of [
        ['--ui-text-scale', '1'],
        ['--ui-heading-scale', '0.8'],
    ])
        doc.documentElement.style.setProperty(
            key,
            document.documentElement.style.getPropertyValue(key) || fallback,
        )
}
export function initReadability() {
    const text = document.querySelector('#live-ui-text-scale'),
        headings = document.querySelector('#live-ui-heading-scale')
    let values = { text: 100, headings: 100 }
    try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
            const parsed = JSON.parse(saved)
            values = {
                text: bounds(parsed?.text),
                headings: bounds(parsed?.headings),
            }
        } else {
            const old = localStorage.getItem(legacyKey)
            if (['1', '1.15', '1.3', '1.5'].includes(old))
                values.text = bounds(Number(old) * 100)
        }
    } catch {
        /* Settings remain usable without browser storage. */
    }
    function apply(save = true) {
        document.documentElement.style.setProperty(
            '--ui-text-scale',
            String(values.text / 100),
        )
        document.documentElement.style.setProperty(
            '--ui-heading-scale',
            String((values.headings * 0.8) / 100),
        )
        for (const frame of document.querySelectorAll('iframe')) {
            try {
                applyFrameReadability(frame.contentDocument)
            } catch {
                /* Same-origin game areas only. */
            }
        }
        if (save)
            try {
                localStorage.setItem(storageKey, JSON.stringify(values))
            } catch {
                /* Current settings still work. */
            }
    }
    for (const [key, field] of [
        ['text', text],
        ['headings', headings],
    ]) {
        field.value = values[key]
        field.addEventListener('input', () => {
            if (!field.value || !field.validity.valid) return
            values[key] = bounds(field.value)
            apply()
        })
        field.addEventListener('change', () => {
            values[key] = bounds(field.value)
            field.value = values[key]
            apply()
        })
    }
    document.querySelector('#live-ui-text-reset').onclick = () => {
        values = { text: 100, headings: 100 }
        text.value = headings.value = '100'
        apply()
    }
    apply(false)
}
