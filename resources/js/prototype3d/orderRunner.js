// One animation and completion at a time. A stopped run cannot resume after
// its pending animation resolves, even if another run has already started.
export function createOrderRunner() {
    let generation = 0
    let running = false
    return {
        get running() {
            return running
        },
        stop() {
            ++generation
            running = false
        },
        async run(next, execute) {
            if (running) return
            const token = ++generation
            running = true
            try {
                while (token === generation) {
                    const id = next()
                    if (!id || !(await execute(id))) break
                }
            } finally {
                if (token === generation) running = false
            }
        },
    }
}
