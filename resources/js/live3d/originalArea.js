import embeddedCss from '../../css/live3d-embedded.css?inline'
// Retain the original controllers/forms/scripts, replace their presentation shell.
export function skinOriginalArea(frame, { t, planet, refresh, openFleet, onLoading }) {
    const doc = frame.contentDocument
    if (!doc?.body) return
    doc.addEventListener('click', event => {
        const anchor = event.target.closest('a[href]')
        if (!anchor || !openFleet) return
        const target = new URL(anchor.href, location.origin)
        if (target.origin === location.origin && /^\/fleet(?:\/|$)/.test(target.pathname)) {
            event.preventDefault()
            event.stopImmediatePropagation()
            openFleet(target.href)
        }
    }, true)
    if (!doc.querySelector('link[data-live3d-embedded-style]')) {
        const style = doc.createElement('style')
        style.textContent = embeddedCss
        doc.head.append(style)
    }
    frame.setAttribute('scrolling', 'no')
    let sizing
    function resizeFrame() {
        cancelAnimationFrame(sizing)
        sizing = requestAnimationFrame(() => {
            if (!frame.isConnected || !frame.offsetWidth) return
            const height = Math.max(300, Math.ceil(doc.body.getBoundingClientRect().height + 32))
            if (Math.abs(frame.getBoundingClientRect().height - height) > 2) frame.style.height = `${height}px`
            frame.dataset.autoHeight = String(height)
        })
    }
    const sizeObserver = new ResizeObserver(resizeFrame)
    sizeObserver.observe(doc.body)
    doc.addEventListener('load', resizeFrame, true)
    resizeFrame()
    function bind() {
        for (const cell of doc.querySelectorAll('#technologies li[data-technology]')) {
            if (cell.querySelector('.live-unit-name')) continue
            const name = doc.createElement('span')
            name.className = 'live-unit-name'
            name.textContent = cell.getAttribute('aria-label') || ''
            const stock = doc.createElement('small')
            stock.className = 'live-unit-stock'
            const value = cell.querySelector('.amount')?.dataset.value || '0'
            stock.textContent = `${new Intl.NumberFormat('de-DE').format(/^\d+$/.test(value) ? BigInt(value) : 0)} ${t.ready}`
            cell.append(name, stock)
        }
        for (const link of doc.querySelectorAll('a[href]')) {
            const url = new URL(link.getAttribute('href'), location.origin)
            if (url.origin !== location.origin || !url.pathname.startsWith('/') || /^javascript:|^#/.test(link.getAttribute('href'))) continue
            if (url.searchParams.has('signature')) continue
            url.searchParams.set('ui', 'live3d')
            url.searchParams.set('cp', planet)
            link.href = url.href
        }
        for (const form of doc.forms) {
            for (const [name, value] of [['ui', 'live3d'], ['cp', planet]]) {
                let field = form.querySelector(`input[name="${name}"]`)
                if (!field) { field = doc.createElement('input'); field.type = 'hidden'; field.name = name; form.append(field) }
                field.value = value
            }
        }
    }
    bind()
    const observer = new MutationObserver(() => { observer.disconnect(); bind(); resizeFrame(); observer.observe(doc.body, {childList:true, subtree:true}) })
    observer.observe(doc.body, {childList:true, subtree:true})
    frame.contentWindow.addEventListener('pagehide', () => { onLoading?.(); observer.disconnect(); sizeObserver.disconnect(); cancelAnimationFrame(sizing) }, {once:true})
    // Mutations continue to use the original server endpoints; update the outer HUD.
    const jq = frame.contentWindow.jQuery
    if (jq) {
        jq.ajaxPrefilter(options => {
            const url = new URL(options.url, doc.location.href)
            if (url.origin !== location.origin || url.searchParams.has('signature')) return
            url.searchParams.set('cp', planet)
            url.searchParams.set('ui', 'live3d')
            options.url = url.href
        })
        // Legacy controls listen to keyup only. Keep pasted/touch-entered values
        // connected to the same original handlers rather than duplicating their rules.
        jq(doc).on('input.live3d', '#technologies li input,#fleet2 input#galaxy,#fleet2 input#system,#fleet2 input#position,#fleet2 input#metal,#fleet2 input#crystal,#fleet2 input#deuterium', event => jq(event.target).trigger('keyup'))
        jq(doc).ajaxComplete(() => { refresh() })
    }
    // Keep navigation in this content area; the surrounding game shell stays put.
    for (const form of doc.forms) if (['_top', '_parent'].includes(form.target)) form.target = '_self'
    doc.addEventListener('click', event => {
        const anchor = event.target.closest('a[href]')
        if (!anchor || anchor.hasAttribute('download') || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || anchor.target === '_blank') return
        const target = new URL(anchor.href, doc.location.href)
        if (target.origin !== location.origin || !/^https?:$/.test(target.protocol) || anchor.getAttribute('href').startsWith('#')) return
        if (['_top', '_parent'].includes(anchor.target)) anchor.target = '_self'
        setTimeout(() => { if (frame.contentDocument === doc && !event.defaultPrevented && target.href !== doc.location.href) onLoading?.() }, 0)
    }, true)
    doc.addEventListener('submit', event => {
        setTimeout(() => { if (frame.contentDocument === doc && !event.defaultPrevented) onLoading?.() }, 0)
    }, true)
    frame.dataset.areaReady = frame.contentWindow.location.pathname
    frame.title = t.original_area
    refresh()
}
