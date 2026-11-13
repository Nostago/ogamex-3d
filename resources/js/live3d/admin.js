// Native test controls delegate to the existing admin controller. Advanced forms
// stay intact: the original action, CSRF token and all settings fields are preserved.
export function createAdmin({
    config,
    t,
    el,
    number,
    state,
    setBusy,
    refresh,
}) {
    const status = document.querySelector('#live-admin-status'),
        frame = document.querySelector('#live-admin-frame'),
        kind = document.querySelector('#live-admin-kind'),
        object = document.querySelector('#live-admin-object'),
        amount = document.querySelector('#live-admin-amount')
    let tab = 'test',
        pending = false,
        framePlanet = '',
        frameTab = ''
    const names = {
        test: t.admin_test,
        settings: t.admin_universe,
        security: t.admin_security,
        rules: t.admin_rules,
        timing: t.admin_timing,
        tools: t.admin_tools,
    }
    const hints = {
        settings: t.admin_universe_hint,
        security: t.admin_security_hint,
        rules: t.admin_rules_hint,
        timing: t.admin_timing_hint,
        tools: t.admin_tools_hint,
    }
    function url(key) {
        const link = new URL(config.adminLinks[key], location.origin)
        link.searchParams.set('cp', state().planet.id)
        return link.href
    }
    function show(key) {
        tab = key
        document.querySelector('#live-admin-test').hidden = key !== 'test'
        document.querySelector('#live-admin-advanced').hidden = key === 'test'
        document
            .querySelectorAll('[data-admin-tab]')
            .forEach((button) =>
                button.setAttribute(
                    'aria-pressed',
                    String(button.dataset.adminTab === key),
                ),
            )
        if (key === 'test') return
        document.querySelector('#live-admin-tab-hint').textContent = hints[key]
        document.querySelector('#live-admin-original').href = url(key)
        if (frameTab !== key || framePlanet !== String(state().planet.id)) {
            frameTab = key
            framePlanet = String(state().planet.id)
            frame.src = url(key)
        }
    }
    for (const [key, name] of Object.entries(names)) {
        const button = el('button', '', name)
        button.dataset.adminTab = key
        button.addEventListener('click', () => show(key))
        document.querySelector('#live-admin-tabs').append(button)
        if (key !== 'test') {
            const card = el('button', 'card admin-shortcut')
            card.append(
                el('strong', '', name + ' ›'),
                el('span', '', hints[key]),
            )
            card.addEventListener('click', () => show(key))
            document.querySelector('#live-admin-shortcuts').append(card)
        }
    }
    function catalog() {
        const previous = object.value
        object.replaceChildren()
        for (const item of state().objects.filter(
            (item) => item.type === kind.value,
        )) {
            const option = el(
                'option',
                '',
                `${item.name} · ${number(item.amount)}`,
            )
            option.value = item.id
            object.append(option)
        }
        if ([...object.options].some((option) => option.value === previous))
            object.value = previous
        amount.max = ['ship', 'defense'].includes(kind.value) ? 1000000000 : 100
        if (Number(amount.value) > Number(amount.max)) amount.value = amount.max
    }
    kind.addEventListener('change', catalog)
    for (const value of [1000000, 10000000, 100000000]) {
        const button = el('button', '', `${number(value)} × 3`)
        button.type = 'button'
        button.addEventListener('click', () => {
            for (const input of document.querySelectorAll(
                '#live-admin-resources input',
            ))
                input.value = String(value)
        })
        document.querySelector('#live-admin-packs').append(button)
    }
    async function command(payload) {
        if (pending) return
        const target = state().planet
        pending = true
        setBusy(true)
        document
            .querySelectorAll('#live-page-admin button')
            .forEach((button) => (button.disabled = true))
        status.textContent = t.processing
        try {
            const response = await fetch(config.adminCommandUrl, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector(
                        'meta[name="csrf-token"]',
                    ).content,
                },
                body: JSON.stringify({
                    ...payload,
                    planet: target.id,
                    _token: document.querySelector('meta[name="csrf-token"]')
                        .content,
                }),
            })
            const result = await response.json().catch(() => null)
            if (!response.ok || result?.status !== 'success')
                throw new Error(
                    response.status === 403
                        ? t.admin_denied
                        : result?.message || t.error_request,
                )
            status.textContent = `${t.admin_saved} ${target.name} [${target.coordinates}]`
        } catch (error) {
            status.textContent = error.message || t.error_request
        } finally {
            pending = false
            setBusy(false)
            document
                .querySelectorAll('#live-page-admin button')
                .forEach((button) => (button.disabled = false))
            await refresh()
            catalog()
        }
    }
    document
        .querySelector('#live-admin-resources')
        .addEventListener('submit', (event) => {
            event.preventDefault()
            command({
                action: 'resources',
                ...Object.fromEntries(new FormData(event.currentTarget)),
            })
        })
    document
        .querySelector('#live-admin-objects')
        .addEventListener('submit', (event) => {
            event.preventDefault()
            if (confirm(t.admin_object_confirm))
                command({
                    action: 'object',
                    technologyId: object.value,
                    amount: amount.value,
                })
        })
    frame.addEventListener('load', () => {
        try {
            const doc = frame.contentDocument
            if (!doc?.body) return
            const path = frame.contentWindow.location.pathname
            if (!path.startsWith('/admin/')) {
                status.textContent = t.admin_denied
                return
            }
            const css = doc.createElement('style')
            css.textContent = `
                html,body{min-width:0!important;background:#061421!important;color:#d4e7f2!important;font:13px 'Segoe UI',sans-serif!important}
                #siteHeader,#siteFooter,#headerbarcomponent,#resourcesbarcomponent,#left,#right,#adminbar,#pageReloader{display:none!important}
                #pageContent,#middle,#inhalt,#inhalt>.contentbox,#inhalt>.contentBox{width:100%!important;min-width:0!important;margin:0!important;padding:0!important;float:none!important}
                .content,.buddylistContent,.contentbox,.contentBox{background:transparent!important;width:auto!important;min-width:0!important;max-width:100%!important}
                .header,.footer{background:none!important}.fieldwrapper{display:flex!important;align-items:center;gap:20px;padding:12px!important;border-bottom:1px solid #23475a!important;float:none!important;width:auto!important;min-height:35px}
                label.styled{background:none!important;color:#b8d4e5!important;flex:1;width:auto!important;font:12px 'Segoe UI',sans-serif!important}.thefield{margin:0!important;float:none!important;min-width:130px}
                input,select,textarea{background:#071e2d!important;color:#dcf4ff!important;border:1px solid #3c6e83!important;border-radius:4px!important;box-shadow:none!important;font:13px 'Segoe UI',sans-serif!important;padding:9px!important;height:auto!important;max-width:100%!important}
                button,.btn_blue,.btn_blue span,input[type=submit],a.btn_blue{background:#13465b!important;color:#c8f5ff!important;border:1px solid #3f9db7!important;border-radius:4px!important;height:auto!important;padding:9px 12px!important;text-shadow:none!important;cursor:pointer!important}
                .box_highlight{background:#123348!important;color:#a6eaff!important;border:1px solid #35728a!important;padding:13px!important;margin:18px 0 6px!important;text-align:left!important;font:14px 'Segoe UI',sans-serif!important}
                table{width:100%!important;background:#081d2b!important;color:#bed9e7!important}td,th{padding:10px!important;border-color:#284b60!important;overflow-wrap:anywhere}.warning,.error{color:#ffb18e!important}
                .live-admin-toc{display:flex;gap:7px;flex-wrap:wrap;position:sticky;top:0;background:#061421f5;padding:12px 6px;z-index:100}.live-admin-toc button{font-size:10px!important}.group{background:#0a2130!important;border:1px solid #24485d!important;border-radius:4px!important;margin-bottom:10px!important;padding:6px!important}
                @media(max-width:650px){.fieldwrapper{flex-wrap:wrap;gap:8px}.thefield{width:100%}label.styled{flex-basis:100%}td,th{font-size:10px!important;padding:6px!important}}
            `
            doc.head.append(css)
            for (const form of doc.forms) {
                let cp = form.querySelector('[name="cp"]')
                if (!cp) {
                    cp = doc.createElement('input')
                    cp.type = 'hidden'
                    cp.name = 'cp'
                    form.append(cp)
                }
                cp.value = framePlanet
            }
            const headings = [
                ...doc.querySelectorAll('p.box_highlight'),
            ].filter(
                (node) =>
                    node.textContent.trim() && node.textContent.length < 100,
            )
            if (headings.length > 2) {
                const toc = doc.createElement('nav')
                toc.className = 'live-admin-toc'
                for (const heading of headings) {
                    const button = doc.createElement('button')
                    button.type = 'button'
                    button.textContent = heading.textContent.trim()
                    button.addEventListener('click', () =>
                        heading.scrollIntoView({
                            block: 'start',
                            behavior: 'smooth',
                        }),
                    )
                    toc.append(button)
                }
                doc.body.prepend(toc)
            }
        } catch {
            status.textContent = t.frame_fallback
        }
    })
    catalog()
    show('test')
    return {
        renderContext() {
            document.querySelector('#live-admin-target').textContent =
                `${state().planet.name} [${state().planet.coordinates}]`
            if (tab !== 'test' && framePlanet !== String(state().planet.id))
                show(tab)
        },
        show,
    }
}
