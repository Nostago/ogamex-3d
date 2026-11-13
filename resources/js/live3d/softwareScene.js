// CPU-rendered sphere and projected 3D structures for browsers without a working GPU context.
// This is interactive geometry, not a placeholder screenshot; no game state is simulated.
export function createSoftwareScene(host, labels, select, names) {
    const canvas = document.createElement('canvas'),
        context = canvas.getContext('2d')
    if (!context) throw new Error('canvas_unavailable')
    host.replaceChildren(canvas)
    labels.replaceChildren()
    canvas.setAttribute('aria-label', names.scene || '')
    host.dataset.renderer = 'software'
    let snapshot,
        width = 1,
        height = 1,
        angle = 0.6,
        tilt = 0.25,
        scale = 1,
        mode = 'overview',
        rotating = false,
        pointer,
        frame,
        last = 0,
        dirty = true,
        targets = []
    const surface = document.createElement('canvas')
    surface.width = surface.height = 256
    const pixels = surface.getContext('2d'),
        image = pixels.createImageData(256, 256)
    // Cache spherical samples once; re-shade only after a camera or data change.
    const samples = []
    for (let y = 0; y < 256; y++)
        for (let x = 0; x < 256; x++) {
            const nx = (x - 127.5) / 126,
                ny = (127.5 - y) / 126,
                d = nx * nx + ny * ny
            if (d <= 1)
                samples.push([4 * (y * 256 + x), nx, ny, Math.sqrt(1 - d)])
        }
    function sphere() {
        image.data.fill(0)
        const c = Math.cos(angle),
            s = Math.sin(angle),
            ct = Math.cos(tilt),
            st = Math.sin(tilt)
        for (const [i, x, vy, vz] of samples) {
            const y = vy * ct - vz * st,
                zz = vy * st + vz * ct,
                z = zz * c - x * s,
                xx = x * c + zz * s
            const n =
                Math.sin(xx * 3 + Math.cos(z * 3)) +
                0.6 * Math.cos(z * 4 + y * 3) +
                0.45 * Math.sin(y * 5 + xx * 2)
            const land = n > 0.05,
                ice = Math.abs(y) > 0.94,
                light = Math.max(0.09, -0.45 * x + 0.4 * vy + 0.7 * vz)
            let rgb = ice
                ? [195, 216, 225]
                : land
                  ? [48 + n * 15, 89 + n * 12, 61 + n * 9]
                  : [12, 51, 91]
            const cloud =
                Math.max(
                    0,
                    Math.sin(xx * 16 + Math.cos(z * 8)) +
                        Math.sin(y * 19 + z * 11) -
                        1.1,
                ) * 0.65
            rgb = rgb.map((v) => (v * (1 - cloud) + 215 * cloud) * light)
            for (let j = 0; j < 3; j++) image.data[i + j] = rgb[j]
            image.data[i + 3] = 255
        }
        pixels.putImageData(image, 0, 0)
    }
    function project(x, y, z, radius) {
        const c = Math.cos(angle),
            s = Math.sin(angle),
            ct = Math.cos(tilt),
            st = Math.sin(tilt)
        const xx = x * c - z * s,
            zz = x * s + z * c,
            yy = y * ct + zz * st,
            depth = zz * ct - y * st
        return {
            x: width / 2 + xx * radius,
            y: height / 2 - yy * radius,
            depth,
        }
    }
    function draw() {
        if (!snapshot || width < 2 || height < 2) return
        context.clearRect(0, 0, width, height)
        const r = Math.min(width * 0.27, height * 0.37) * scale
        const glow = context.createRadialGradient(
            width / 2,
            height / 2,
            r * 0.96,
            width / 2,
            height / 2,
            r * 1.12,
        )
        glow.addColorStop(0, '#40cfff99')
        glow.addColorStop(1, '#1699ff00')
        context.fillStyle = glow
        context.fillRect(
            width / 2 - r * 1.2,
            height / 2 - r * 1.2,
            r * 2.4,
            r * 2.4,
        )
        const ring = (front) => {
            const points = Array.from({ length: 129 }, (_, i) => {
                const a = (i * Math.PI * 2) / 128
                return project(Math.cos(a) * 1.35, 0, Math.sin(a) * 1.35, r)
            })
            context.strokeStyle = '#60dfff'
            context.lineWidth = mode === 'orbit' ? 3 : 1
            context.beginPath()
            let pen = false
            for (const p of points) {
                if (p.depth >= 0 !== front) {
                    pen = false
                    continue
                }
                if (pen) context.lineTo(p.x, p.y)
                else context.moveTo(p.x, p.y)
                pen = true
            }
            context.stroke()
        }
        if (mode !== 'colony') ring(false)
        sphere()
        context.drawImage(surface, width / 2 - r, height / 2 - r, r * 2, r * 2)
        if (mode !== 'colony') ring(true)
        targets = []
        if (mode !== 'orbit')
            for (const building of snapshot.buildings) {
                const site = snapshot.layout.find(
                    (item) => item.id === building.siteId,
                )
                if (!site) continue
                const p = project(...site.normal, r)
                if (p.depth < 0.12) continue
                const size = Math.max(5, r * 0.035),
                    h = size * (1 + Math.min(8, building.level) * 0.15)
                context.fillStyle = '#526b7e'
                context.fillRect(p.x - size, p.y - h, size * 2, h)
                context.fillStyle = '#9ab2bd'
                context.beginPath()
                context.moveTo(p.x - size, p.y - h)
                context.lineTo(p.x, p.y - h - size * 0.5)
                context.lineTo(p.x + size, p.y - h)
                context.closePath()
                context.fill()
                context.fillStyle = '#58e9ff'
                context.fillRect(
                    p.x - size * 0.65,
                    p.y - h * 0.7,
                    size * 1.3,
                    2,
                )
                targets.push({
                    x: p.x,
                    y: p.y - h / 2,
                    size: size * 3,
                    id: building.id,
                })
            }
        if (mode !== 'colony')
            for (
                let i = 0;
                i <
                Math.min(
                    12,
                    snapshot.formations.reduce(
                        (sum, f) => sum + f.modelCount,
                        0,
                    ),
                );
                i++
            ) {
                const a = i * 2.4,
                    p = project(Math.cos(a) * 1.6, 0.16, Math.sin(a) * 1.6, r)
                if (
                    p.depth < 0 &&
                    Math.hypot(p.x - width / 2, p.y - height / 2) < r
                )
                    continue
                context.fillStyle = '#9eb8cb'
                context.beginPath()
                context.moveTo(p.x + 10, p.y)
                context.lineTo(p.x - 8, p.y - 4)
                context.lineTo(p.x - 4, p.y + 4)
                context.closePath()
                context.fill()
                context.fillStyle = '#46cfff'
                context.fillRect(p.x - 17, p.y - 1, 10, 2)
            }
        host.dataset.units = String(snapshot.fleetSummary.total)
        host.dataset.rendering = 'active'
        host.dataset.frames = String(Number(host.dataset.frames || 0) + 1)
    }
    const resize = new ResizeObserver(() => {
        const rect = host.getBoundingClientRect()
        const resolution = Math.min(
            1,
            900 / Math.max(1, rect.width),
            650 / Math.max(1, rect.height),
        )
        width = Math.round(rect.width * resolution)
        height = Math.round(rect.height * resolution)
        canvas.width = width
        canvas.height = height
        dirty = true
    })
    resize.observe(host)
    function down(e) {
        pointer = {
            x: e.clientX,
            y: e.clientY,
            startX: e.clientX,
            startY: e.clientY,
        }
        canvas.setPointerCapture(e.pointerId)
    }
    function move(e) {
        if (!pointer) return
        angle += (e.clientX - pointer.x) * 0.008
        tilt = Math.max(
            -1.2,
            Math.min(1.2, tilt + (e.clientY - pointer.y) * 0.006),
        )
        pointer.x = e.clientX
        pointer.y = e.clientY
        dirty = true
    }
    function up(e) {
        if (!pointer) return
        const rect = canvas.getBoundingClientRect()
        if (
            Math.hypot(e.clientX - pointer.startX, e.clientY - pointer.startY) <
            6
        ) {
            const target = targets.find(
                (p) =>
                    Math.hypot(
                        p.x - ((e.clientX - rect.left) * width) / rect.width,
                        p.y - ((e.clientY - rect.top) * height) / rect.height,
                    ) < p.size,
            )
            if (target) select(String(target.id))
        }
        pointer = null
    }
    function zoom(delta) {
        scale = Math.max(0.65, Math.min(1.6, scale - delta * 0.04))
        dirty = true
    }
    function wheel(e) {
        e.preventDefault()
        zoom(Math.sign(e.deltaY))
    }
    function key(e) {
        if (
            [
                'ArrowLeft',
                'ArrowRight',
                'ArrowUp',
                'ArrowDown',
                '+',
                '-',
            ].includes(e.key)
        ) {
            e.preventDefault()
            if (e.key === 'ArrowLeft') angle -= 0.1
            if (e.key === 'ArrowRight') angle += 0.1
            if (e.key === 'ArrowUp') tilt += 0.1
            if (e.key === 'ArrowDown') tilt -= 0.1
            if (e.key === '+') zoom(-1)
            if (e.key === '-') zoom(1)
            dirty = true
        }
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', () => (pointer = null))
    canvas.addEventListener('wheel', wheel, { passive: false })
    host.addEventListener('keydown', key)
    function tick(time) {
        frame = requestAnimationFrame(tick)
        if (document.hidden || !host.offsetWidth) return
        if (rotating && time - last > 70) {
            angle += 0.012
            dirty = true
        }
        if (dirty && time - last > 60) {
            draw()
            dirty = false
            last = time
        }
    }
    frame = requestAnimationFrame(tick)
    return {
        update(value) {
            snapshot = value
            dirty = true
        },
        setMode(value) {
            mode = value
            dirty = true
        },
        zoom,
        resetCamera() {
            angle = 0.6
            tilt = 0.25
            scale = 1
            dirty = true
        },
        setRotation(value) {
            rotating = value
        },
        dispose() {
            cancelAnimationFrame(frame)
            resize.disconnect()
            host.removeEventListener('keydown', key)
            canvas.remove()
            labels.replaceChildren()
        },
    }
}
