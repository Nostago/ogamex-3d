// Decorative, deterministic star/nebula texture. All planets and ships remain 3D.
export function paintSpaceBackdrop(host) {
    try {
        const canvas = document.createElement('canvas')
        canvas.width = 1600
        canvas.height = 1000
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        let seed = 214013
        const rand = () => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
            return seed / 4294967296
        }
        ctx.fillStyle = '#020813'
        ctx.fillRect(0, 0, 1600, 1000)
        for (let i = 0; i < 180; i++) {
            const x = (i / 180) * 1800 - 100,
                y = 180 + Math.sin(i * 0.04) * 200 + (rand() - 0.5) * 250,
                r = 30 + rand() * 180
            const glow = ctx.createRadialGradient(x, y, 0, x, y, r)
            glow.addColorStop(
                0,
                i % 3 === 0 ? 'rgba(78,55,118,.10)' : 'rgba(24,92,135,.09)',
            )
            glow.addColorStop(1, 'rgba(0,0,0,0)')
            ctx.fillStyle = glow
            ctx.fillRect(x - r, y - r, r * 2, r * 2)
        }
        for (let i = 0; i < 2200; i++) {
            const x = rand() * 1600,
                y = rand() * 1000,
                r = rand() > 0.99 ? 1.7 : rand() * 0.7 + 0.15
            ctx.fillStyle = `rgba(${160 + Math.floor(rand() * 80)},${190 + Math.floor(rand() * 65)},255,${0.15 + rand() * 0.65})`
            ctx.beginPath()
            ctx.arc(x, y, r, 0, Math.PI * 2)
            ctx.fill()
            if (r > 1.5) {
                ctx.fillStyle = '#75cfff25'
                ctx.fillRect(x - 7, y - 0.3, 14, 0.6)
                ctx.fillRect(x - 0.3, y - 7, 0.6, 14)
            }
        }
        host.style.backgroundImage = `url(${canvas.toDataURL()})`
        host.style.backgroundSize = 'cover'
    } catch {
        /* CSS background remains available on restricted browsers. */
    }
}
