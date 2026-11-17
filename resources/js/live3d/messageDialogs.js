// The original message endpoints retain ownership, read-state and report logic.
export function createMessageDialogs({
    t,
    refresh,
    planet,
    openFleet,
    openGalaxy,
    objects,
}) {
    const dialog = document.createElement('dialog')
    dialog.id = 'live-message-dialog'
    dialog.setAttribute('aria-labelledby', 'live-message-title')
    const header = document.createElement('header'),
        title = document.createElement('h2'),
        close = document.createElement('button'),
        remove = document.createElement('button'),
        body = document.createElement('div'),
        notice = document.createElement('p')
    title.id = 'live-message-title'
    title.textContent = t.title
    close.type = remove.type = 'button'
    close.textContent = t.close
    remove.textContent = t.delete
    remove.className = 'message-delete-action'
    body.className = 'live-message-content'
    notice.setAttribute('role', 'status')
    notice.className = 'live-message-status'
    header.append(title, remove, close)
    dialog.append(header, notice, body)
    document.body.append(dialog)
    let frame = null,
        current = null,
        generation = 0,
        controller,
        pending = false,
        opener = null
    const csrf = () => document.querySelector('meta[name=csrf-token]').content
    function hide() {
        generation++
        controller?.abort()
        current = null
        if (dialog.open) dialog.close()
    }
    close.onclick = hide
    dialog.addEventListener('cancel', hide)
    dialog.addEventListener('close', () => {
        controller?.abort()
        opener?.focus?.({ preventScroll: true })
    })
    function clean(doc) {
        doc.querySelectorAll(
            'script,style,link,meta,base,iframe,object,embed,form,svg,math,template,noscript,input,textarea,select,.msg_actions,.footerHolder',
        ).forEach((n) => n.remove())
        for (const node of doc.querySelectorAll('*'))
            for (const a of [...node.attributes]) {
                if (
                    a.name.startsWith('on') ||
                    a.name === 'style' ||
                    a.name === 'srcdoc' ||
                    a.name === 'srcset' ||
                    a.name === 'xlink:href' ||
                    a.name.startsWith('form')
                )
                    node.removeAttribute(a.name)
                if (['href', 'src', 'action'].includes(a.name)) {
                    const url = new URL(a.value, location.origin)
                    if (
                        !['http:', 'https:'].includes(url.protocol) ||
                        (a.name !== 'href' && url.origin !== location.origin)
                    )
                        node.removeAttribute(a.name)
                    else if (
                        a.name === 'href' &&
                        url.origin !== location.origin
                    ) {
                        node.target = '_blank'
                        node.rel = 'noopener noreferrer'
                    }
                }
            }
        // Replace old transparent sprite placeholders with existing small object art.
        const byId = new Map(objects().map((o) => [o.id, o.image]))
        for (const img of doc.querySelectorAll(
            'img[src*="3e567d6f16d040326c7a0ea29a4f41.gif"]',
        )) {
            const id = Number(img.className.match(/\d+/)?.[0]),
                image = byId.get(id)
            if (image) img.src = image
            else img.remove()
        }
    }
    async function open(url, originatingFrame = frame, source = null) {
        if (pending) return
        const target = new URL(url, location.origin)
        if (
            target.origin !== location.origin ||
            !/^\/ajax\/messages\/\d+$/.test(target.pathname)
        )
            return
        frame = originatingFrame
        opener = source || opener
        controller?.abort()
        controller = new AbortController()
        const version = ++generation
        target.searchParams.set('ui', 'live3d')
        target.searchParams.set('cp', planet())
        current = null
        remove.disabled = true
        notice.textContent = t.loading
        body.replaceChildren()
        dialog.setAttribute('aria-busy', 'true')
        if (!dialog.open) dialog.showModal()
        try {
            const response = await fetch(target, {
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                signal: controller.signal,
            })
            if (!response.ok || response.redirected) throw new Error(t.error)
            const doc = new DOMParser().parseFromString(
                await response.text(),
                'text/html',
            )
            if (version !== generation || !dialog.open) return
            clean(doc)
            const content = doc.querySelector('[data-live-message-id]')
            if (!content) throw new Error(t.error)
            current = Number(content.dataset.liveMessageId)
            body.replaceChildren(document.importNode(content, true))
            notice.textContent = ''
            remove.disabled = false
            refresh()
        } catch (e) {
            if (e.name === 'AbortError' || version !== generation) return
            notice.textContent = t.error
            const retry = document.createElement('button')
            retry.textContent = t.retry
            retry.onclick = () => open(target, frame)
            body.replaceChildren(retry)
        } finally {
            if (version === generation) dialog.removeAttribute('aria-busy')
        }
    }
    function reloadList() {
        if (!frame?.isConnected || !frame.contentDocument) return
        const doc = frame.contentDocument,
            url = new URL('/messages', location.origin)
        // Reload the active original tab fragment instead of downloading and
        // initializing the entire legacy page and its scripts again.
        const jq = frame.contentWindow.jQuery
        if (jq) {
            const active = [...doc.querySelectorAll('.ui-tabs-active>a[href]')]
                .filter((a) => a.getClientRects().length)
                .at(-1)
            const widget = active && jq(active).closest('.ui-tabs')
            if (widget?.length && widget.data('ui-tabs')) {
                widget.tabs('load', jq(active).parent().index())
                refresh()
                return
            }
        }
        for (const a of doc.querySelectorAll('.ui-tabs-active>a[href]')) {
            if (!a.getClientRects().length) continue
            const tab = new URL(a.href, location.origin)
            for (const key of ['tab', 'subtab'])
                if (tab.searchParams.has(key))
                    url.searchParams.set(key, tab.searchParams.get(key))
        }
        url.searchParams.set('ui', 'live3d')
        url.searchParams.set('cp', planet())
        frame.src = url.href
        refresh()
    }
    async function erase(id, ids, selected = false) {
        const question = selected
            ? t.selected_confirm.replace(':count', ids.length)
            : ids
              ? t.read_confirm
              : t.delete_confirm
        if (pending || !confirm(question)) return
        pending = true
        remove.disabled = true
        if (frame?.contentDocument) syncSelection(frame.contentDocument)
        try {
            const response = await fetch('/messages?ui=live3d&cp=' + planet(), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrf(),
                },
                body: JSON.stringify({
                    _token: csrf(),
                    action: ids
                        ? selected
                            ? 'delete-selected'
                            : 'delete-read'
                        : 103,
                    ...(ids ? { messageIds: ids } : { messageId: id }),
                }),
            })
            if (!response.ok || response.redirected) throw new Error(t.error)
            const result = await response.json()
            if (!ids && result[id] !== true) throw new Error(t.error)
            if (ids && !Number.isInteger(result.deleted))
                throw new Error(t.error)
            const status = frame?.contentDocument?.querySelector(
                '[data-live-selection-status]',
            )
            if (status)
                status.textContent = ids
                    ? t.selected_deleted.replace(':count', result.deleted)
                    : t.deleted
            hide()
            reloadList()
        } catch {
            notice.textContent = t.delete_error
            if (!dialog.open) {
                body.replaceChildren()
                dialog.showModal()
            }
        } finally {
            pending = false
            remove.disabled = !current
            if (frame?.contentDocument) syncSelection(frame.contentDocument)
        }
    }
    remove.onclick = () => current && erase(current)
    body.addEventListener('click', (event) => {
        const pager = event.target.closest('[data-message-page]')
        if (pager && !pager.disabled) {
            event.preventDefault()
            const url = new URL(
                '/ajax/messages/' + pager.dataset.messagePage,
                location.origin,
            )
            url.searchParams.set('tab', pager.dataset.tab)
            url.searchParams.set('subtab', pager.dataset.subtab)
            open(url, frame)
            return
        }
        const link = event.target.closest('a[href]')
        if (!link) return
        const url = new URL(link.href, location.origin)
        if (
            url.origin === location.origin &&
            /^\/fleet(?:\/|$)/.test(url.pathname)
        ) {
            event.preventDefault()
            hide()
            openFleet(url.href)
        } else if (
            url.origin === location.origin &&
            url.pathname === '/galaxy'
        ) {
            event.preventDefault()
            hide()
            openGalaxy(url)
        }
    })
    function visibleMessages(doc) {
        return [...doc.querySelectorAll('li.msg[data-msg-id]')].filter(
            (node) =>
                !node.closest('[aria-hidden="true"]') &&
                node.getClientRects().length,
        )
    }
    function syncSelection(doc) {
        const rows = visibleMessages(doc),
            count = rows.filter(
                (row) =>
                    row.querySelector('[data-live-message-select]')?.checked,
            ).length,
            all = doc.querySelector('[data-live-select-all]'),
            button = doc.querySelector('[data-live-delete-selected]'),
            counter = doc.querySelector('[data-live-selection-count]'),
            read = doc.querySelector('[data-live-delete-read]')
        for (const row of rows) {
            const input = row.querySelector('[data-live-message-select]')
            if (input) input.disabled = pending
        }
        if (all) {
            all.checked = rows.length > 0 && count === rows.length
            all.indeterminate = count > 0 && count < rows.length
            all.disabled = pending || !rows.length
        }
        if (button) button.disabled = pending || !count
        if (read) read.disabled = pending || !rows.length
        const text = t.selection_count.replace(':count', count)
        if (counter && counter.textContent !== text) counter.textContent = text
    }
    function decorate(doc) {
        if (!doc.querySelector('#messages')) return
        for (const icon of doc.querySelectorAll('.js_actionKill')) {
            if (icon.classList.contains('live-message-delete')) continue
            icon.classList.add('live-message-delete')
            icon.textContent = t.delete
            icon.title = t.delete
            const a = icon.closest('a')
            if (a) {
                a.setAttribute('aria-label', t.delete)
                a.setAttribute('role', 'button')
            }
        }
        for (const a of doc.querySelectorAll(
            'a.msg_action_link[href*="/ajax/messages/"]',
        ))
            if (a.textContent !== t.details) a.textContent = t.details
        if (!doc.querySelector('[data-live-delete-read]')) {
            const toolbar = doc.createElement('div')
            toolbar.className = 'live-message-toolbar'
            const label = doc.createElement('label'),
                all = doc.createElement('input'),
                selected = doc.createElement('button'),
                counter = doc.createElement('span'),
                scope = doc.createElement('p'),
                status = doc.createElement('p')
            label.className = 'live-message-select'
            all.type = 'checkbox'
            all.dataset.liveSelectAll = 'true'
            label.append(all, doc.createTextNode(t.select_all))
            selected.type = 'button'
            selected.dataset.liveDeleteSelected = 'true'
            selected.textContent = t.delete_selected
            counter.dataset.liveSelectionCount = 'true'
            scope.className = 'live-message-selection-scope'
            scope.textContent = t.selection_scope
            status.dataset.liveSelectionStatus = 'true'
            status.setAttribute('role', 'status')
            const button = doc.createElement('button')
            button.type = 'button'
            button.dataset.liveDeleteRead = 'true'
            button.textContent = t.read_delete
            toolbar.append(label, selected, counter, button, scope, status)
            doc.querySelector('#messages').prepend(toolbar)
        }
        for (const row of doc.querySelectorAll('li.msg[data-msg-id]')) {
            if (row.querySelector('[data-live-message-select]')) continue
            const label = doc.createElement('label'),
                input = doc.createElement('input')
            label.className = 'live-message-select live-message-row-select'
            input.type = 'checkbox'
            input.dataset.liveMessageSelect = row.dataset.msgId
            label.append(input, doc.createTextNode(t.select_message))
            row.prepend(label)
        }
        syncSelection(doc)
    }
    function attach(targetFrame) {
        const doc = targetFrame.contentDocument
        if (!doc?.querySelector('#messages')) return
        frame = targetFrame
        decorate(doc)
        const change = (event) => {
            if (event.target.matches('[data-live-select-all]'))
                for (const row of visibleMessages(doc))
                    row.querySelector('[data-live-message-select]').checked =
                        event.target.checked
            if (
                event.target.matches(
                    '[data-live-select-all],[data-live-message-select]',
                )
            )
                syncSelection(doc)
        }
        const click = (event) => {
            if (event.target.closest('.live-message-select')) {
                event.stopImmediatePropagation()
                return
            }
            const selected = event.target.closest('[data-live-delete-selected]')
            if (selected) {
                event.preventDefault()
                event.stopImmediatePropagation()
                const ids = visibleMessages(doc)
                    .filter(
                        (row) =>
                            row.querySelector('[data-live-message-select]')
                                .checked,
                    )
                    .map((row) => Number(row.dataset.msgId))
                if (ids.length) erase(null, ids, true)
                return
            }
            if (
                event.target.closest(
                    '.ui-tabs-anchor,.paginator:not(.disabled)',
                )
            ) {
                for (const input of doc.querySelectorAll(
                    '[data-live-message-select]',
                ))
                    input.checked = false
                syncSelection(doc)
            }
            const read = event.target.closest('[data-live-delete-read]')
            if (read) {
                event.preventDefault()
                event.stopImmediatePropagation()
                const ids = visibleMessages(doc).map((n) =>
                    Number(n.dataset.msgId),
                )
                if (ids.length) erase(null, ids)
                return
            }
            const kill = event.target.closest('.js_actionKill')
            if (kill) {
                event.preventDefault()
                event.stopImmediatePropagation()
                const id = Number(kill.closest('[data-msg-id]')?.dataset.msgId)
                if (id) erase(id)
                return
            }
            const a = event.target.closest('a[href]')
            if (!a) return
            const url = new URL(a.href, location.origin)
            if (
                url.origin === location.origin &&
                /^\/ajax\/messages\/\d+$/.test(url.pathname)
            ) {
                event.preventDefault()
                event.stopImmediatePropagation()
                open(url, targetFrame, a)
            }
        }
        doc.addEventListener('click', click, true)
        doc.addEventListener('change', change, true)
        targetFrame.contentWindow.addEventListener(
            'pagehide',
            () => {
                doc.removeEventListener('click', click, true)
                doc.removeEventListener('change', change, true)
                hide()
            },
            { once: true },
        )
    }
    return {
        attach,
        decorate,
        hide,
        dispose() {
            hide()
            dialog.remove()
        },
    }
}
