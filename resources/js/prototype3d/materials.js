import * as THREE from './vendor/three.module.min.js'

// Generated in memory: no image downloads and no random variation between runs.
export function createColonyMaterials() {
    const textures = []
    function texture(kind) {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 256
        const context = canvas.getContext('2d')
        const pixels = context.createImageData(256, 256)
        let seed = 104729
        for (let y = 0; y < 256; y++) {
            for (let x = 0; x < 256; x++) {
                seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
                const noise = seed / 4294967296
                const value =
                    kind === 'concrete'
                        ? 160 + noise * 65
                        : 171 + noise * 24 + Math.sin(y * 1.7) * 9
                const i = (y * 256 + x) * 4
                pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value
                pixels.data[i + 3] = 255
            }
        }
        context.putImageData(pixels, 0, 0)
        if (kind === 'concrete') {
            context.strokeStyle = '#666461'
            context.lineWidth = 2
            for (let i = 0; i <= 256; i += 64) {
                context.beginPath()
                context.moveTo(i, 0)
                context.lineTo(i, 256)
                context.stroke()
                context.beginPath()
                context.moveTo(0, i)
                context.lineTo(256, i)
                context.stroke()
            }
        } else if (kind === 'panels') {
            context.fillStyle = '#0a1c31'
            context.fillRect(0, 0, 256, 256)
            for (let y = 3; y < 256; y += 32) {
                for (let x = 3; x < 256; x += 32) {
                    context.fillStyle = '#173c61'
                    context.fillRect(x, y, 27, 27)
                    context.strokeStyle = '#68819a'
                    context.lineWidth = 0.7
                    context.strokeRect(x + 0.5, y + 0.5, 26, 26)
                    for (let line = 1; line < 4; line++) {
                        context.fillStyle = '#345571'
                        context.fillRect(x + line * 6, y, 0.6, 27)
                    }
                }
            }
        } else {
            context.strokeStyle = '#6b7073'
            context.lineWidth = 1
            context.strokeRect(2, 2, 252, 252)
            context.fillStyle = '#858a8e'
            for (const x of [9, 247])
                for (const y of [9, 247]) {
                    context.beginPath()
                    context.arc(x, y, 2, 0, Math.PI * 2)
                    context.fill()
                }
        }
        const map = new THREE.CanvasTexture(canvas)
        map.colorSpace = THREE.SRGBColorSpace
        map.wrapS = map.wrapT = THREE.RepeatWrapping
        map.anisotropy = 8
        textures.push(map)
        return map
    }
    const steelMap = texture('steel'),
        concreteMap = texture('concrete'),
        cells = texture('panels')
    const palette = {
        steel: new THREE.MeshStandardMaterial({
            color: 0xa5afb4,
            map: steelMap,
            bumpMap: steelMap,
            bumpScale: 0.014,
            roughness: 0.44,
            metalness: 0.72,
        }),
        painted: new THREE.MeshStandardMaterial({
            color: 0x354859,
            map: steelMap,
            bumpMap: steelMap,
            bumpScale: 0.018,
            roughness: 0.59,
            metalness: 0.3,
        }),
        dark: new THREE.MeshStandardMaterial({
            color: 0x18232d,
            roughness: 0.86,
            metalness: 0.35,
        }),
        concrete: new THREE.MeshStandardMaterial({
            color: 0x777f83,
            map: concreteMap,
            bumpMap: concreteMap,
            bumpScale: 0.035,
            roughness: 0.97,
            metalness: 0,
        }),
        insulation: new THREE.MeshStandardMaterial({
            color: 0xc2cbd1,
            map: steelMap,
            bumpMap: steelMap,
            bumpScale: 0.012,
            roughness: 0.79,
            metalness: 0.15,
        }),
        gold: new THREE.MeshStandardMaterial({
            color: 0xe0a257,
            roughness: 0.8,
            metalness: 0.25,
        }),
        cyan: new THREE.MeshStandardMaterial({
            color: 0x68b7c5,
            roughness: 0.38,
            metalness: 0.3,
            emissive: 0x246374,
            emissiveIntensity: 0.65,
        }),
        window: new THREE.MeshPhysicalMaterial({
            color: 0x183d49,
            roughness: 0.2,
            metalness: 0.2,
            clearcoat: 0.7,
            emissive: 0x398db7,
            emissiveIntensity: 0.3,
        }),
        warmWindow: new THREE.MeshStandardMaterial({
            color: 0xbfac7e,
            roughness: 0.4,
            emissive: 0xffad4d,
            emissiveIntensity: 0.8,
        }),
        panel: new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: cells,
            roughness: 0.38,
            metalness: 0.5,
        }),
        purple: new THREE.MeshPhysicalMaterial({
            color: 0x596b9b,
            roughness: 0.2,
            metalness: 0.12,
            clearcoat: 1,
            emissive: 0x13223d,
            emissiveIntensity: 0.12,
        }),
        ore: new THREE.MeshStandardMaterial({
            color: 0x72665b,
            roughness: 1,
            metalness: 0.08,
        }),
    }
    const sky = document.createElement('canvas')
    sky.width = 256
    sky.height = 128
    const skyContext = sky.getContext('2d')
    const gradient = skyContext.createLinearGradient(0, 0, 0, 128)
    gradient.addColorStop(0, '#c1cfdd')
    gradient.addColorStop(0.5, '#657384')
    gradient.addColorStop(1, '#1d252a')
    skyContext.fillStyle = gradient
    skyContext.fillRect(0, 0, 256, 128)
    skyContext.fillStyle = '#e8e0cc'
    skyContext.fillRect(40, 20, 34, 32)
    skyContext.fillStyle = '#a3c4da'
    skyContext.fillRect(175, 35, 16, 35)
    const environment = new THREE.CanvasTexture(sky)
    environment.colorSpace = THREE.SRGBColorSpace
    environment.mapping = THREE.EquirectangularReflectionMapping
    textures.push(environment)
    const contact = document.createElement('canvas')
    contact.width = contact.height = 64
    const contactContext = contact.getContext('2d')
    const shadow = contactContext.createRadialGradient(32, 32, 12, 32, 32, 32)
    shadow.addColorStop(0, 'rgba(0,0,0,0.6)')
    shadow.addColorStop(1, 'rgba(0,0,0,0)')
    contactContext.fillStyle = shadow
    contactContext.fillRect(0, 0, 64, 64)
    const contactMap = new THREE.CanvasTexture(contact)
    textures.push(contactMap)
    palette.contact = new THREE.MeshBasicMaterial({
        map: contactMap,
        transparent: true,
        depthWrite: false,
        opacity: 0.65,
    })
    return {
        palette,
        environment,
        dispose() {
            Object.values(palette).forEach((item) => item.dispose())
            textures.forEach((item) => item.dispose())
        },
    }
}
