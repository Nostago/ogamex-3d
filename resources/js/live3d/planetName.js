export function initPlanetName({ client, state, refresh, t, setBusy }) {
    const dialog = document.querySelector('#live-rename-dialog'),
        form = document.querySelector('#live-rename-form'),
        name = document.querySelector('#live-rename-name'),
        status = document.querySelector('#live-rename-status')
    let target = null,
        pending = false
    document.querySelector('#live-rename-open').onclick = () => {
        target = { ...state().planet }
        name.value = target.name
        document.querySelector('#live-rename-target').textContent =
            `${target.name} [${target.coordinates}]`
        status.textContent = ''
        dialog.showModal()
        name.focus({ preventScroll: true })
        name.select()
    }
    document.querySelector('#live-rename-close').onclick = () => dialog.close()
    form.onsubmit = async (event) => {
        event.preventDefault()
        if (pending || !target || !form.reportValidity()) return
        pending = true
        form.inert = true
        setBusy(true)
        try {
            await client.command(String(target.id), 'rename-planet', {
                newPlanetName: name.value,
            })
            dialog.close()
        } catch (error) {
            status.textContent =
                error.code === 'rejected' ? error.message : t.error_request
        } finally {
            pending = false
            form.inert = false
            setBusy(false)
            await refresh()
        }
    }
    return {
        hide() {
            dialog.close()
            if (!pending) target = null
        },
    }
}
