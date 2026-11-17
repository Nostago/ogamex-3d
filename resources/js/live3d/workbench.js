import '../../css/live3d-workbench.css'

// UI adapter only: every mutation uses an existing note/merchant endpoint.
export function createWorkbench({ t, resourceNames, planet, refresh }) {
    const make = (tag, text, className) => {
            const node = document.createElement(tag)
            if (text !== undefined) node.textContent = text
            if (className) node.className = className
            return node
        },
        dialog = make('dialog', undefined, 'live-social'),
        header = make('header'),
        title = make('h2'),
        close = make('button', t.close),
        notice = make('p'),
        body = make('div'),
        attached = new WeakSet(),
        number = (value) => new Intl.NumberFormat('de-DE').format(value)
    dialog.id = 'live-work-dialog'
    title.id = 'live-work-title'
    dialog.setAttribute('aria-labelledby', title.id)
    notice.setAttribute('role', 'status')
    close.type = 'button'
    header.append(title, close)
    dialog.append(header, notice, body)
    document.body.append(dialog)
    let frame,
        version = 0,
        busy = false,
        opener,
        initial = ''
    function dirty() {
        const form = body.querySelector('[data-note-form]')
        return form && initial !== JSON.stringify([...new FormData(form)])
    }
    function hide(force = false) {
        if (!force && dirty() && !confirm(t.unsaved)) return
        version++
        initial = ''
        if (dialog.open) dialog.close()
    }
    close.onclick = () => hide()
    dialog.addEventListener('cancel', (event) => {
        event.preventDefault()
        hide()
    })
    dialog.addEventListener('close', () =>
        opener?.focus?.({ preventScroll: true }),
    )
    function open(text, source) {
        version++
        busy = false
        initial = ''
        opener = source
        title.textContent = text
        notice.textContent = ''
        notice.className = ''
        body.replaceChildren()
        if (!dialog.open) dialog.showModal()
        return version
    }
    const contextUrl = (path) => {
        const url = new URL(path, location.origin)
        if (url.origin !== location.origin) throw new Error(t.error)
        url.searchParams.set('ui', 'live3d')
        url.searchParams.set('cp', planet())
        return url
    }
    async function post(path, data, html = false) {
        const response = await fetch(contextUrl(path), {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type':
                    data instanceof FormData
                        ? 'application/x-www-form-urlencoded'
                        : 'application/json',
                Accept: html ? 'text/html' : 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')
                    .content,
                'X-Requested-With': 'XMLHttpRequest',
            },
            body:
                data instanceof FormData
                    ? new URLSearchParams([...data])
                    : JSON.stringify(data),
        })
        if (response.redirected) throw new Error(t.error)
        if (html) {
            if (!response.ok) throw new Error(t.error)
            return {}
        }
        const result = await response.json()
        if (!response.ok || result.success === false || result.error) {
            const error = new Error(result.message || t.error)
            error.result = result
            throw error
        }
        return result
    }
    function status(doc, text, error = false) {
        const output = doc.querySelector('[data-work-status]')
        if (output) {
            output.textContent = text
            output.className = error ? 'social-error' : 'social-notice'
        }
    }
    function reload(target = frame) {
        if (target?.isConnected) target.contentWindow.location.reload()
        refresh()
    }
    function resources(values) {
        const dl = make('dl', undefined, 'work-resources')
        for (const key of ['metal', 'crystal', 'deuterium']) {
            const row = make('div')
            row.append(
                make('dt', resourceNames[key]),
                make('dd', number(values[key] || 0)),
            )
            dl.append(row)
        }
        return dl
    }
    async function note(id, source) {
        const generation = open(id ? t.edit_note : t.new_note, source)
        notice.textContent = t.loading
        try {
            const url = contextUrl('/overlay/notes/view')
            if (id) url.searchParams.set('id', id)
            const response = await fetch(url, {
                credentials: 'same-origin',
                cache: 'no-store',
            })
            if (!response.ok || response.redirected) throw new Error(t.error)
            const doc = new DOMParser().parseFromString(
                    await response.text(),
                    'text/html',
                ),
                editor = doc.querySelector('[data-native-note-editor]')
            if (!editor) throw new Error(t.error)
            if (generation !== version) return
            // Note text is escaped by Blade inside form values/textarea.
            editor
                .querySelectorAll('script,iframe,object')
                .forEach((n) => n.remove())
            body.replaceChildren(document.importNode(editor, true))
            notice.textContent = ''
            const form = body.querySelector('form')
            initial = JSON.stringify([...new FormData(form)])
            form.onsubmit = async (event) => {
                event.preventDefault()
                if (busy || !form.reportValidity()) return
                busy = true
                const submit = form.querySelector('[type=submit]')
                submit.disabled = true
                notice.textContent = t.saving
                try {
                    const data = await post(
                        '/ajax/notes/create',
                        new FormData(form),
                    )
                    if (!data.id) throw new Error(t.error)
                    if (generation !== version) return
                    hide(true)
                    reload()
                } catch (error) {
                    if (generation === version) {
                        notice.textContent = error.message
                        notice.className = 'social-error'
                    }
                } finally {
                    busy = false
                    submit.disabled = false
                }
            }
            form.querySelector('textarea').oninput = (event) => {
                form.querySelector('[data-note-count]').textContent =
                    `${event.target.value.length} / 5000`
            }
            form.querySelector('input:not([type=hidden])').focus({
                preventScroll: true,
            })
        } catch {
            if (generation === version) {
                notice.textContent = t.error
                notice.className = 'social-error'
            }
        }
    }
    body.addEventListener('click', (event) => {
        if (event.target.closest('[data-work-close]')) hide()
    })
    function attach(targetFrame) {
        const doc = targetFrame.contentDocument
        if (
            !doc?.querySelector(
                '#live-notes,#live-scrap,#live-market,#live-merchant',
            ) ||
            attached.has(doc)
        )
            return
        attached.add(doc)
        frame = targetFrame
        const noteRows = () =>
            [...doc.querySelectorAll('[data-note-row]')].filter(
                (n) => !n.hidden,
            )
        function selection() {
            const rows = noteRows(),
                selected = rows.filter(
                    (n) => n.querySelector('input[type=checkbox]').checked,
                ),
                all = doc.querySelector('[data-notes-all]')
            if (!all) return
            all.checked = rows.length > 0 && selected.length === rows.length
            all.indeterminate =
                selected.length > 0 && selected.length < rows.length
            all.disabled = !rows.length
            doc.querySelector('[data-notes-delete]').disabled = !selected.length
            doc.querySelector('[data-notes-empty]').hidden = rows.length > 0
        }
        const inputs = () => [
            ...doc.querySelectorAll('[data-scrap-unit] input'),
        ]
        function preview() {
            const root = doc.querySelector('[data-scrap-percentage]')
            if (!root) return {}
            const totals = { metal: 0, crystal: 0, deuterium: 0 }
            let count = 0
            for (const unit of doc.querySelectorAll('[data-scrap-unit]')) {
                const input = unit.querySelector('input'),
                    amount = Math.max(0, Number(input.value) || 0),
                    costs = JSON.parse(unit.dataset.costs)
                count += amount
                for (const key in totals) totals[key] += amount * costs[key]
            }
            for (const key in totals) {
                totals[key] = Math.floor(
                    (totals[key] * Number(root.dataset.scrapPercentage)) / 100,
                )
                doc.querySelector(`[data-scrap-return="${key}"]`).textContent =
                    number(totals[key])
            }
            doc.querySelectorAll('[data-scrap-submit]').forEach((button) => {
                button.disabled = !count || busy
            })
            return totals
        }
        async function removeNotes(ids, source) {
            if (
                !ids.length ||
                busy ||
                !confirm(t.delete_confirm.replace(':count', ids.length))
            )
                return
            busy = true
            source.disabled = true
            try {
                await post(
                    '/overlay/notes',
                    { noticeDeleteMethode: '1', delIds: ids },
                    true,
                )
                reload(targetFrame)
            } catch (error) {
                open(t.notes, source)
                notice.textContent = error.message
                notice.className = 'social-error'
            } finally {
                busy = false
                source.disabled = false
            }
        }
        function corrected(error) {
            const data = error.result
            if (!data?.needsConfirmation) return false
            for (const [id, value] of Object.entries(
                data.adjustedItems || {},
            )) {
                const field = doc.querySelector(
                    `[data-scrap-unit="${id}"] input`,
                )
                if (field) field.value = value
            }
            preview()
            status(
                doc,
                [
                    t.corrected,
                    ...(data.warnings || []).map((warning) => warning.message),
                ].join(' '),
                true,
            )
            return true
        }
        doc.addEventListener(
            'click',
            async (event) => {
                const source = event.target.closest('button')
                if (!source) return
                if (source.matches('[data-note-open]')) {
                    event.preventDefault()
                    note(Number(source.dataset.noteOpen), source)
                }
                if (source.matches('[data-note-delete],[data-notes-delete]')) {
                    event.preventDefault()
                    const ids = source.dataset.noteDelete
                        ? [Number(source.dataset.noteDelete)]
                        : noteRows()
                              .filter((n) => n.querySelector('input').checked)
                              .map((n) => Number(n.dataset.noteRow))
                    removeNotes(ids, source)
                }
                if (source.matches('[data-scrap-max]')) {
                    const input = source
                        .closest('[data-scrap-unit]')
                        .querySelector('input')
                    input.value = input.max
                    preview()
                }
                if (source.matches('[data-scrap-all],[data-scrap-clear]')) {
                    for (const input of inputs())
                        input.value = source.hasAttribute('data-scrap-all')
                            ? input.max
                            : 0
                    preview()
                }
                if (source.matches('[data-market-max]')) {
                    const form = source.closest('form'),
                        input = source.parentElement.querySelector('input'),
                        budget = form.elements.give_amount
                    const otherCost = [
                        ...form.querySelectorAll('[data-market-rate]'),
                    ]
                        .filter((n) => n !== input)
                        .reduce(
                            (sum, n) =>
                                sum +
                                Math.ceil(
                                    Number(n.value) /
                                        Number(n.dataset.marketRate),
                                ),
                            0,
                        )
                    input.value = Math.max(
                        0,
                        Math.min(
                            Number(input.max),
                            Math.floor(
                                (Math.min(
                                    Number(budget.value),
                                    Number(budget.max),
                                ) -
                                    otherCost) *
                                    Number(input.dataset.marketRate),
                            ),
                        ),
                    )
                }
                if (source.matches('[data-scrap-bargain]')) {
                    if (
                        busy ||
                        !confirm(
                            t.bargain_confirm.replace(
                                ':cost',
                                number(source.dataset.cost),
                            ),
                        )
                    )
                        return
                    busy = true
                    source.disabled = true
                    try {
                        const result = await post('/merchant/scrap/bargain', {})
                        doc.querySelector(
                            '[data-scrap-percentage]',
                        ).dataset.scrapPercentage = result.newPercentage
                        doc.querySelector('[data-scrap-offer]').textContent =
                            result.newPercentage + ' %'
                        doc.querySelector('[data-scrap-dm]').textContent =
                            number(result.darkMatter)
                        doc.querySelector('[data-scrap-cost]').textContent =
                            number(result.newCost)
                        source.dataset.cost = result.newCost
                        source.dataset.balance = result.darkMatter
                        preview()
                        status(doc, t.offer_updated)
                        refresh()
                    } catch (error) {
                        status(doc, error.message, true)
                    } finally {
                        busy = false
                        preview()
                        source.disabled =
                            Number(
                                doc.querySelector('[data-scrap-percentage]')
                                    .dataset.scrapPercentage,
                            ) >= 75 ||
                            Number(source.dataset.balance) <
                                Number(source.dataset.cost)
                    }
                }
            },
            true,
        )
        doc.addEventListener('input', (event) => {
            if (event.target.matches('[data-scrap-unit] input')) preview()
            if (event.target.matches('[data-notes-filter]')) {
                const term = event.target.value
                    .trim()
                    .toLocaleLowerCase('de-DE')
                for (const row of doc.querySelectorAll('[data-note-row]')) {
                    row.hidden = !row.dataset.noteSearch
                        .toLocaleLowerCase('de-DE')
                        .includes(term)
                    if (row.hidden) row.querySelector('input').checked = false
                }
                selection()
            }
        })
        doc.addEventListener('change', (event) => {
            if (event.target.matches('[data-scrap-only-available]'))
                for (const unit of doc.querySelectorAll('[data-scrap-unit]'))
                    unit.hidden =
                        event.target.checked &&
                        Number(unit.querySelector('input').max) <= 0

            if (event.target.matches('[data-notes-all]'))
                for (const row of noteRows())
                    row.querySelector('input').checked = event.target.checked
            if (event.target.matches('[data-notes-all],[data-note-select]'))
                selection()
        })
        doc.addEventListener(
            'submit',
            async (event) => {
                const form = event.target
                if (!form.matches('[data-scrap-form],[data-work-post]')) return
                event.preventDefault()
                event.stopImmediatePropagation()
                if (busy || !form.reportValidity()) return
                if (form.dataset.confirm && !confirm(form.dataset.confirm))
                    return
                busy = true
                const submit = form.querySelector('[type=submit]')
                submit.disabled = true
                status(doc, t.working)
                try {
                    if (form.matches('[data-work-post]')) {
                        const result = await post(
                            form.getAttribute('action'),
                            new FormData(form),
                        )
                        open(t.result, submit)
                        body.append(make('p', result.message || t.done))
                        if (result.received)
                            body.append(resources(result.received))
                        reload(targetFrame)
                    } else {
                        const items = {},
                            selected = []
                        for (const unit of doc.querySelectorAll(
                            '[data-scrap-unit]',
                        )) {
                            const value = Number(
                                unit.querySelector('input').value,
                            )
                            if (value > 0) {
                                items[unit.dataset.scrapUnit] = value
                                selected.push(
                                    `${number(value)} × ${unit.dataset.name}`,
                                )
                            }
                        }
                        await post('/merchant/scrap/execute', {
                            items,
                            confirmed: false,
                        })
                        const generation = open(t.review_scrap, submit),
                            list = make('ul'),
                            commit = make(
                                'button',
                                t.commit_scrap,
                                'social-danger',
                            )
                        for (const text of selected)
                            list.append(make('li', text))
                        body.append(
                            make('p', t.scrap_confirm),
                            list,
                            resources(preview()),
                            commit,
                        )
                        commit.type = 'button'
                        commit.onclick = async () => {
                            if (busy) return
                            busy = true
                            commit.disabled = true
                            try {
                                const result = await post(
                                    '/merchant/scrap/execute',
                                    { items, confirmed: true },
                                )
                                if (generation !== version) return
                                title.textContent = t.result
                                body.replaceChildren(
                                    make('p', result.message),
                                    resources(result.returned),
                                )
                                reload(targetFrame)
                            } catch (error) {
                                if (corrected(error)) {
                                    hide(true)
                                    return
                                }
                                notice.textContent = error.message
                                notice.className = 'social-error'
                            } finally {
                                busy = false
                                commit.disabled = false
                            }
                        }
                    }
                } catch (error) {
                    if (!corrected(error)) status(doc, error.message, true)
                } finally {
                    busy = false
                    submit.disabled = false
                    if (form.matches('[data-scrap-form]')) preview()
                }
            },
            true,
        )
        selection()
        preview()
    }
    return {
        attach,
        hide: () => hide(true),
        dispose() {
            hide(true)
            dialog.remove()
        },
    }
}
