// Retain the original controllers/forms/scripts, replace their presentation shell.
export function skinOriginalArea(frame, { t, planet, refresh }) {
    const doc = frame.contentDocument
    if (!doc?.body) return
    const style = doc.createElement('style')
    style.textContent = `
    html,body{min-width:0!important;margin:0!important;background:#071521!important;color:#d3e7f0!important;font:14px/1.6 system-ui,sans-serif!important}
    #top,#left,#right,#siteHeader,#siteFooter,#adminbar,#pageReloader,#eventboxContent,#fadeBox{display:none!important}
    #pageContent,#middle,#inhalt,.maincontent,#buttonz,.content,.contentbox,.contentBox,.buddylistContent{width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important;float:none!important;margin:0!important;background-image:none!important}
    #inhalt{padding:16px!important}#planet.shortHeader{display:none!important}
    #chatBarPlayerList{display:none!important}#chatBar{display:block!important;background:#0a2030!important;color:#d4edf6!important;border-color:#31576e!important}
    #chatBar .chat_box,#chatBar .chat_box_ctn,#chatBar .chat_content{background:#0a2030!important;color:#d4edf6!important;background-image:none!important}
    #inhalt .c-left,#inhalt .c-right{display:none!important}
    #technologies{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;max-width:100%}
    #technologies>div{width:auto!important;min-width:0!important;float:none!important}
    #technologies ul{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;padding:0!important;list-style:none!important}
    #technologies li.technology{display:grid!important;grid-template-columns:80px minmax(0,1fr);gap:5px 9px;width:auto!important;height:auto!important;min-height:115px;padding:9px!important;margin:0!important;float:none!important;background:#102635!important;border:1px solid #31536a;border-radius:5px;box-sizing:border-box}
    #technologies li .icon{grid-row:1/4;grid-column:1;position:relative!important;top:auto!important;left:auto!important;margin:0!important}
    #technologies li .amount{color:#c6e5f0!important;background:#071723dd!important;font-size:12px!important}
    #technologies .live-unit-name{grid-column:2;min-width:0;overflow-wrap:anywhere;font-size:12px;color:#cdeefa;line-height:1.4;font-weight:600}
    #technologies .live-unit-stock{grid-column:2;font-size:11px;color:#85c4d9}
    #technologies li input{grid-column:2;position:static!important;min-width:0!important;width:100%!important;margin:0!important;float:none!important}
    #technologies li[data-status=off]{opacity:.5}
    @media(max-width:700px){#technologies{grid-template-columns:minmax(0,1fr)}#technologies ul{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}}
    #inhalt .maincontent>#planet,#inhalt>#planet{display:none!important}
    #inhalt .header,#inhalt .footer,#inhalt .tabs,#inhalt .tabs a,#inhalt .tab,#inhalt .tabwrapper,#inhalt .box_highlight{background-image:none!important;box-shadow:none!important}
    #inhalt label,#inhalt p,#inhalt .textBeefy{font-family:system-ui,sans-serif!important}
    #inhalt input[type=checkbox],#inhalt input[type=radio]{appearance:auto!important;opacity:1!important;position:static!important;width:auto!important;height:auto!important}
    #live-notes-content .overlayDiv.notices{display:block!important;position:static!important;width:100%!important;max-width:100%!important}
    #inhalt a.continue,#inhalt a.start{background:#14556b!important;border:1px solid #57b9d2!important;border-radius:5px!important;padding:8px 16px!important;min-height:38px;box-sizing:border-box!important;color:#d2f6ff!important}
    #inhalt a.continue.off,#inhalt a.start.off{opacity:.45}
    .header,.footer,.new_footer,.new_header,.box_highlight{background-image:none!important;height:auto!important;color:#a6ecfa!important}
    .header h2,h2,h3{font:600 20px/1.5 system-ui!important;color:#a6ecfa!important}
    .content,.sectioncontent,.group,.contentbox,.contentBox{background-color:#0a2030!important;border:1px solid #294c60!important;border-radius:7px!important;padding:16px!important;box-sizing:border-box!important}
    input,select,textarea{background:#061724!important;color:#e1f3fc!important;border:1px solid #3b647b!important;border-radius:5px!important;box-shadow:none!important;font:inherit!important;box-sizing:border-box!important;max-width:100%!important}
    input[type=text],input[type=number],input[type=password],select,textarea{padding:9px!important;height:auto!important}
    button,.btn_blue,.btn_blue span,input[type=submit],.buttonSave,a.btn_blue{height:auto!important;min-height:36px;white-space:normal!important;background:#14475c!important;background-image:none!important;color:#c9f6ff!important;border:1px solid #368aa6!important;border-radius:5px!important;padding:8px 13px!important;font:inherit!important;text-shadow:none!important;cursor:pointer!important;box-sizing:border-box!important}
    button:disabled,input:disabled{opacity:.5;cursor:not-allowed!important}
    a{color:#73dff5!important}table{width:100%!important;background:none!important;border-collapse:collapse!important}td,th{padding:10px!important;background-image:none!important;border-bottom:1px solid #244354!important;overflow-wrap:break-word}
    .ui-dialog,.ui-dialog-content,.tooltip,.tip{background:#0a2030!important;color:#d3e7f0!important;border-color:#368aa6!important;background-image:none!important}
    .footer{position:static!important;clear:both!important;pointer-events:auto!important;height:auto!important;min-height:50px!important;padding:16px!important;background:#0a2030!important}
    .footer input,.footer button{position:relative!important;z-index:10!important;width:auto!important;min-width:160px!important;pointer-events:auto!important}
    @media(max-width:700px){#inhalt{padding:6px!important}.content,.group{padding:8px!important}table{font-size:12px!important}td,th{padding:6px!important}.w250,.w300,.w500{max-width:100%!important}}
    `
    doc.head.append(style)
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
    const observer = new MutationObserver(() => { observer.disconnect(); bind(); observer.observe(doc.body, {childList:true, subtree:true}) })
    observer.observe(doc.body, {childList:true, subtree:true})
    frame.contentWindow.addEventListener('pagehide', () => observer.disconnect(), {once:true})
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
    frame.dataset.areaReady = frame.contentWindow.location.pathname
    frame.title = t.original_area
    refresh()
}
