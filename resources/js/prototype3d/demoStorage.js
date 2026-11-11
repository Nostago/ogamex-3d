export const saveKey = 'ogamex3d:v013'
export function browserStorage() {
    try {
        return localStorage
    } catch {
        return null
    }
}
export function readSave(storage) {
    const raw = storage?.getItem(saveKey)
    if (!raw) return null
    if (raw.length > 1_000_000) throw new Error('save_size')
    const data = JSON.parse(raw)
    if (
        data.schema !== 1 ||
        !Array.isArray(data.states) ||
        data.states.length !== 3 ||
        !Number.isFinite(data.lastSettled) ||
        data.lastSettled < 0 ||
        !Number.isFinite(data.offset) ||
        data.offset < 0
    )
        throw new Error('save_schema')
    const validate = (value) => {
        if (
            typeof value === 'number' &&
            (!Number.isFinite(value) ||
                Math.abs(value) > Number.MAX_SAFE_INTEGER)
        )
            throw new Error('save_number')
        if (value && typeof value === 'object')
            for (const [key, child] of Object.entries(value)) {
                if (['__proto__', 'constructor', 'prototype'].includes(key))
                    throw new Error('save_key')
                validate(child)
            }
    }
    validate(data)
    return data
}
