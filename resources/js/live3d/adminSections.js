// Reorganize the existing DOM; retain every form/control, its action and its value.
// Hiding an inactive section never disables or removes its fields from submission.
export function organizeAdminSections(frame, doc, controls, t) {
    const sections = []
    const labels = [
        ['[name="set_mines"]', 'admin_setup'],
        ['[name^="unit_"]', 'admin_units'],
        ['[name^="building_"]', 'buildings'],
        ['[name^="research_"]:not([name="research_speed"])', 'research'],
        [
            '[name="enable_free_class_changes"],[name="disable_free_class_changes"]',
            'admin_classes',
        ],
        ['[name="reset_buildings"]', 'admin_reset'],
        ['[name="update_resources_planet"]', 'admin_resources'],
        ['[name="create_planet"]', 'admin_planets'],
        ['[name="dark_matter"]', 'admin_dark_matter'],
        ['[name="economy_speed"]', 'admin_economy'],
        ['[name="expedition_weight_resources"]', 'admin_expeditions'],
    ]
    const actionLabels = {
        set_mines: 'admin_mines30',
        set_storages: 'admin_storages15',
        set_shipyard: 'admin_facilities12',
        set_research: 'admin_research10',
    }
    // Buttons can wrap their complete label, unlike the old fixed-width submit inputs.
    for (const input of doc.querySelectorAll('input[type="submit"]')) {
        const button = doc.createElement('button')
        for (const attr of input.attributes)
            button.setAttribute(attr.name, attr.value)
        button.type = 'submit'
        button.value = input.value
        button.textContent = t[actionLabels[input.name]] || input.value
        input.replaceWith(button)
    }
    for (const heading of [...doc.querySelectorAll('p.box_highlight')]) {
        const parent = heading.parentElement
        if (!parent?.closest('form')) continue
        const section = doc.createElement('section')
        section.className = 'live-admin-section'
        parent.insertBefore(section, heading)
        let node = heading
        while (node && (node === heading || !node.matches('p.box_highlight'))) {
            const next = node.nextElementSibling
            section.append(node)
            node = next
        }
        const match = labels.find(([selector]) =>
            section.querySelector(selector),
        )
        const name = match ? t[match[1]] : heading.textContent.trim()
        heading.textContent = name
        sections.push({ section, name })
    }
    controls.replaceChildren()
    controls.hidden = sections.length < 2
    // The actual navigation lives in the parent page, with no nested toolbar.
    const select = document.createElement('select')
    select.id = 'live-admin-section'
    select.setAttribute('aria-label', t.admin_section)
    const text = document.createElement('label')
    text.htmlFor = select.id
    text.textContent = t.admin_section
    sections.forEach(({ name }, index) => {
        const option = document.createElement('option')
        option.value = index
        option.textContent = name
        select.append(option)
    })
    controls.append(text, select)
    const notice = document.createElement('p')
    notice.className = 'admin-frame-notice'
    notice.setAttribute('role', 'status')
    controls.append(notice)
    text.hidden = select.hidden = sections.length < 2
    const feedback = () => {
        let message =
            doc.querySelector('#fadeBoxContent')?.textContent.trim() || ''
        if (message === 'Changes saved!') message = t.admin_saved_short
        if (message) {
            notice.textContent = message
            notice.dataset.tone = doc
                .querySelector('#fadeBoxStyle')
                ?.classList.contains('error')
                ? 'error'
                : 'success'
            controls.hidden = false
        }
    }
    feedback()
    const toast = doc.querySelector('#fadeBoxContent'),
        feedbackObserver = new MutationObserver(feedback)
    if (toast)
        feedbackObserver.observe(toast, {
            childList: true,
            subtree: true,
            characterData: true,
        })
    const content = doc.querySelector('#inhalt') || doc.body
    function resize() {
        if (!frame.offsetWidth) return
        frame.style.height = `${Math.max(260, Math.ceil(content.getBoundingClientRect().height + 30))}px`
    }
    function show(index) {
        sections.forEach(({ section }, i) => (section.hidden = i !== index))
        select.value = index
        frame.dataset.section = String(index)
        requestAnimationFrame(resize)
    }
    select.addEventListener('change', () => show(Number(select.value)))
    const observer = new ResizeObserver(resize)
    observer.observe(content)
    const invalid = (event) => {
        const index = sections.findIndex(({ section }) =>
            section.contains(event.target),
        )
        if (index >= 0) show(index)
    }
    doc.addEventListener('invalid', invalid, true)
    if (sections.length)
        show(Math.min(Number(frame.dataset.section || 0), sections.length - 1))
    else requestAnimationFrame(resize)
    const style = doc.createElement('style')
    style.textContent = `
        #top,#chatBar,#eventboxContent,#notificationbarcomponent,#commandercomponent,#fadeBox{display:none!important}
        html,body{height:auto!important;min-height:0!important;overflow-x:hidden!important}
        #inhalt,#pageContent,#middle,.maincontent,#buttonz,.content,.buddylistContent{min-height:0!important;max-width:100%!important;box-sizing:border-box!important}
        #inhalt{padding:0!important}#planet.shortHeader,.header>h2{display:none!important}
        #inhalt>.maincontent,#resourcesettingscomponent,#buttonz,#inhalt form,#inhalt .content,#inhalt .buddylistContent,.live-admin-section{width:100%!important;min-width:0!important;box-sizing:border-box!important}
        .live-admin-section .group,.live-admin-section .fieldwrapper{width:100%!important;box-sizing:border-box!important}
        .live-admin-section[hidden]{display:none!important}.live-admin-section{margin:0!important;padding:0!important}
        .live-admin-section>.box_highlight{margin:0 0 18px!important;padding:16px!important;background:#0b2739!important;font-size:18px!important;border:0!important}
        .fieldwrapper{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:12px!important;min-width:0!important;padding:16px!important}
        .fieldwrapper button[type=submit],button.btn_blue{width:auto!important;min-width:0!important;max-width:100%!important;white-space:normal!important;overflow:visible!important;line-height:1.6!important;padding:12px 16px!important;font-size:12px!important;float:none!important;text-align:left!important}
        .fieldwrapper>button[type=submit]{flex:1 1 170px!important}
        .fieldwrapper input[type=text],.fieldwrapper input[type=number]{min-width:90px!important;width:180px!important;max-width:100%!important}
        .fieldwrapper .thefield{display:flex!important;gap:12px!important;flex-wrap:wrap!important;max-width:100%!important;min-width:0!important}
        .group{max-width:100%!important;min-width:0!important;margin:0 0 16px!important;padding:0!important}
        .buddylistContent,.live-admin-section{display:flow-root!important;float:none!important;height:auto!important}.buddylistContent{margin-bottom:0!important}.content{padding:0!important}
        form>.footer,form .content>.footer{height:auto!important;padding:16px!important;background:#071a28!important;position:static!important;inset:auto!important;clear:both!important;pointer-events:auto!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;z-index:1!important}
        .footer button{position:relative!important;z-index:10!important;pointer-events:auto!important;display:inline-block!important;min-width:180px!important;width:auto!important;white-space:normal!important}
        @media(max-width:650px){.fieldwrapper>button[type=submit]{flex-basis:100%!important}.fieldwrapper input[type=text],.fieldwrapper input[type=number]{width:100%!important}.thefield>div{min-width:100px;max-width:100%}}
    `
    doc.head.append(style)
    frame.dataset.organized = frame.contentWindow.location.pathname
    return () => {
        observer.disconnect()
        feedbackObserver.disconnect()
        doc.removeEventListener('invalid', invalid, true)
    }
}
