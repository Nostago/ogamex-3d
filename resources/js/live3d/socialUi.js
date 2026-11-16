import '../../css/live3d-social.css'

// Presentation only: requests and messages still use the original game endpoints.
export function createSocialUi({ t, planet, refresh, openGalaxy }) {
    const node = (tag, text, className) => {
        const element = document.createElement(tag)
        if (text !== undefined) element.textContent = text
        if (className) element.className = className
        return element
    }
    const dialog = node('dialog', undefined, 'live-social'),
        header = node('header'),
        title = node('h2'),
        close = node('button', t.close),
        notice = node('p'),
        body = node('div'),
        attached = new WeakSet()
    dialog.id = 'live-social-dialog'
    title.id = 'live-social-title'
    dialog.setAttribute('aria-labelledby', title.id)
    notice.setAttribute('role', 'status')
    close.type = 'button'
    header.append(title, close)
    dialog.append(header, notice, body)
    document.body.append(dialog)
    let generation = 0,
        opener = null,
        busy = false
    function hide() {
        generation++
        if (dialog.open) dialog.close()
    }
    close.onclick = hide
    dialog.addEventListener('cancel', (event) => {
        event.preventDefault()
        hide()
    })
    dialog.addEventListener('close', () =>
        opener?.focus?.({ preventScroll: true }),
    )
    function open(heading, source) {
        generation++
        opener = source
        busy = false
        title.textContent = heading
        body.replaceChildren()
        notice.textContent = ''
        notice.className = ''
        if (!dialog.open) dialog.showModal()
        return generation
    }
    function message(text, error = false) {
        notice.textContent = text
        notice.className = error ? 'social-error' : 'social-notice'
    }
    async function post(path, values) {
        const url = new URL(path, location.origin)
        url.searchParams.set('ui', 'live3d')
        url.searchParams.set('cp', planet())
        const response = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')
                    .content,
            },
            body: new URLSearchParams(values),
        })
        if (response.redirected) throw new Error(t.error)
        const data = await response.json()
        if (
            !response.ok ||
            data.success === false ||
            (data.status && data.status !== 'OK')
        )
            throw new Error(
                data.message || t.chat_errors?.[data.status] || t.error,
            )
        return data
    }
    function textForm(labelText, maxLength, optional, buttonText, submit) {
        const form = node('form'),
            label = node('label', labelText),
            text = node('textarea'),
            send = node('button', buttonText)
        text.id = 'live-social-text'
        text.maxLength = maxLength
        text.required = !optional
        label.htmlFor = text.id
        send.type = 'submit'
        form.append(label, text, send)
        const version = generation
        form.onsubmit = async (event) => {
            event.preventDefault()
            if (busy || !form.reportValidity()) return
            busy = true
            send.disabled = true
            message(t.working)
            try {
                await submit(text.value, version)
            } catch (error) {
                if (version === generation)
                    message(error.message || t.error, true)
            } finally {
                if (version === generation) {
                    busy = false
                    send.disabled = false
                }
            }
        }
        body.append(form)
        text.focus({ preventScroll: true })
        return text
    }
    function requestFriend(id, name, source) {
        open(t.request_title, source)
        body.append(node('strong', name))
        textForm(
            t.request_message,
            5000,
            true,
            t.send_request,
            async (text, version) => {
                const data = await post('/buddies/send-request', {
                    receiver_id: id,
                    message: text,
                })
                if (version !== generation) return
                message(data.message)
                body.replaceChildren(node('p', name))
                refresh()
            },
        )
    }
    function decode(text) {
        return new DOMParser().parseFromString(String(text), 'text/html')
            .documentElement.textContent
    }
    function chat(id, name, source) {
        const version = open(`${t.chat_title} ${name}`, source),
            history = node('section'),
            historyTitle = node('h3', t.history),
            entries = node('div'),
            reload = node('button', t.refresh),
            historyStatus = node('p')
        reload.type = 'button'
        history.append(historyTitle, historyStatus, entries, reload)
        body.append(history)
        let loading = false
        async function load() {
            if (loading || version !== generation) return
            loading = true
            reload.disabled = true
            historyStatus.textContent = t.loading
            try {
                const data = await post('/chat/history', {
                    mode: 2,
                    playerId: id,
                    updateUnread: 1,
                })
                if (version !== generation) return
                const messages = (data.chatItemsByDateAsc || [])
                    .slice(-10)
                    .map((key) => data.chatItems[key])
                entries.replaceChildren()
                for (const item of messages) {
                    const entry = node(
                            'article',
                            undefined,
                            'social-chat-entry',
                        ),
                        date = new Date(item.date * 1000),
                        time = node('time', date.toLocaleString('de-DE'))
                    time.dateTime = date.toISOString()
                    entry.append(node('strong', item.playerName), time)
                    if (item.refData)
                        entry.append(
                            node(
                                'blockquote',
                                `${item.refData.author}: ${decode(item.refData.text)}`,
                            ),
                        )
                    entry.append(node('p', decode(item.chatContent)))
                    entries.append(entry)
                }
                historyStatus.textContent = messages.length ? '' : t.no_messages
            } catch (error) {
                if (version === generation)
                    historyStatus.textContent = error.message || t.error
            } finally {
                loading = false
                reload.disabled = false
            }
        }
        const text = textForm(
            t.chat_message,
            2000,
            false,
            t.send,
            async (value, requestVersion) => {
                await post('/chat/send', { mode: 1, playerId: id, text: value })
                if (requestVersion !== generation) return
                text.value = ''
                message(t.sent_ok)
                await load()
                refresh()
            },
        )
        reload.onclick = load
        load()
    }
    async function mutate(form, frame) {
        const submit = form.querySelector('button[type=submit]')
        if (submit.disabled) return
        submit.disabled = true
        const version = generation
        try {
            // A hidden input named "action" shadows HTMLFormElement.action.
            const target = new URL(form.getAttribute('action'), location.origin)
            if (
                target.origin !== location.origin ||
                target.pathname !== '/buddies'
            )
                throw new Error(t.error)
            await post('/buddies', [...new FormData(form)])
            if (version === generation) hide()
            if (frame.contentDocument === form.ownerDocument)
                frame.contentWindow.location.reload()
            refresh()
        } catch (error) {
            if (version === generation) {
                if (!dialog.open) open(t.friends, submit)
                message(error.message || t.error, true)
            }
        } finally {
            submit.disabled = false
        }
    }
    function attach(frame) {
        const doc = frame.contentDocument
        if (!doc?.querySelector('#live-social') || attached.has(doc)) return
        attached.add(doc)
        doc.addEventListener(
            'click',
            (event) => {
                const action = event.target.closest('[data-social-action]'),
                    galaxy = event.target.closest('[data-social-galaxy]')
                if (galaxy) {
                    event.preventDefault()
                    event.stopImmediatePropagation()
                    openGalaxy(new URL(galaxy.href))
                } else if (action) {
                    event.preventDefault()
                    event.stopImmediatePropagation()
                    const id = Number(action.dataset.playerId)
                    if (!Number.isInteger(id) || id < 1) return
                    if (action.dataset.socialAction === 'chat')
                        chat(id, action.dataset.playerName, action)
                    else requestFriend(id, action.dataset.playerName, action)
                }
            },
            true,
        )
        doc.addEventListener(
            'submit',
            (event) => {
                const form = event.target.closest('[data-social-mutation]')
                if (!form) return
                event.preventDefault()
                event.stopImmediatePropagation()
                if (!form.dataset.socialConfirm) {
                    mutate(form, frame)
                    return
                }
                open(t.remove_friend, form.querySelector('button'))
                body.append(node('p', form.dataset.socialConfirm))
                const actions = node('div', undefined, 'social-actions'),
                    confirm = node('button', t.confirm, 'social-danger'),
                    cancel = node('button', t.cancel)
                confirm.type = cancel.type = 'button'
                confirm.onclick = async () => {
                    if (busy) return
                    busy = true
                    confirm.disabled = true
                    await mutate(form, frame)
                    busy = false
                    confirm.disabled = false
                }
                cancel.onclick = hide
                actions.append(cancel, confirm)
                body.append(actions)
                cancel.focus()
            },
            true,
        )
        doc.querySelector('[data-social-filter]')?.addEventListener(
            'input',
            (event) => {
                const value = event.target.value
                    .trim()
                    .toLocaleLowerCase('de-DE')
                let visible = 0
                for (const row of doc.querySelectorAll(
                    '[data-social-friend]',
                )) {
                    row.hidden = !row.dataset.socialFriend
                        .toLocaleLowerCase('de-DE')
                        .includes(value)
                    if (!row.hidden) visible++
                }
                doc.querySelector('[data-social-no-friends]').hidden =
                    visible > 0
            },
        )
        doc.querySelector('[data-social-page]')?.addEventListener(
            'change',
            (event) => event.target.form.requestSubmit(),
        )
    }
    return {
        attach,
        hide,
        dispose() {
            hide()
            dialog.remove()
        },
    }
}
