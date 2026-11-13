import * as THREE from './vendor/three.module.min.js'

// Spherical coordinates make the generated maps seamless at the date line.
// Fixed texture sizes and one cloud mesh keep GPU cost independent of fleet size.
export function createPlanetSurface() {
    const width = 1024,
        height = 512
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d'),
        image = context.createImageData(width, height)
    const cloudCanvas = canvas.cloneNode(),
        cloudContext = cloudCanvas.getContext('2d'),
        cloudImage = cloudContext.createImageData(width, height)
    const noise = (x, y, z) =>
        Math.sin(x * 2.7 + Math.cos(z * 3.1)) +
        Math.cos(z * 3.6 + Math.sin(y * 2.8)) * 0.65 +
        Math.sin(y * 4.3 + x * 1.8) * 0.5
    for (let row = 0; row < height; row++) {
        const latitude = (Math.PI * row) / (height - 1),
            y = Math.cos(latitude),
            ring = Math.sin(latitude)
        for (let col = 0; col < width; col++) {
            const longitude = (Math.PI * 2 * col) / width,
                x = ring * Math.cos(longitude),
                z = ring * Math.sin(longitude)
            const coarse = noise(x, y, z),
                detail = noise(x * 8, y * 8, z * 8),
                grain = noise(x * 35, y * 35, z * 35)
            const elevation = coarse + 0.13 * detail + 0.025 * grain,
                ice = Math.abs(y) > 0.94 + 0.025 * detail
            let color
            if (ice) color = [174, 197, 208]
            else if (elevation < -0.16) {
                const depth = Math.max(0, Math.min(1, (elevation + 1.8) / 1.64))
                color = [7 + depth * 7, 23 + depth * 22, 46 + depth * 27]
            } else if (elevation < -0.08) color = [42, 83, 91]
            else if (elevation < 0.01) color = [122, 117, 82]
            else {
                const mountain = Math.max(0, elevation - 0.75),
                    dry = Math.abs(y) < 0.45 && detail > 0.4
                color = dry
                    ? [112, 102, 67]
                    : [
                          35 + mountain * 35,
                          65 + mountain * 20,
                          47 + mountain * 24,
                      ]
                if (mountain > 0.55)
                    color = [
                        128 + mountain * 20,
                        132 + mountain * 20,
                        127 + mountain * 20,
                    ]
            }
            const index = (row * width + col) * 4,
                shade = 0.88 + 0.08 * grain + 0.06 * detail
            for (let channel = 0; channel < 3; channel++)
                image.data[index + channel] = Math.max(
                    0,
                    Math.min(255, color[channel] * shade),
                )
            image.data[index + 3] = 255
            const cloud = Math.max(
                0,
                Math.min(
                    1,
                    (noise(x * 3 + y * 0.8, y * 5, z * 3) +
                        0.25 * detail -
                        0.4) *
                        0.7,
                ),
            )
            cloudImage.data[index] = 220
            cloudImage.data[index + 1] = 235
            cloudImage.data[index + 2] = 246
            cloudImage.data[index + 3] = cloud * 140
        }
    }
    context.putImageData(image, 0, 0)
    cloudContext.putImageData(cloudImage, 0, 0)
    const surface = new THREE.CanvasTexture(canvas),
        clouds = new THREE.CanvasTexture(cloudCanvas)
    surface.colorSpace = THREE.SRGBColorSpace
    clouds.colorSpace = THREE.SRGBColorSpace
    surface.anisotropy = 4
    return {
        surface,
        clouds,
        dispose() {
            surface.dispose()
            clouds.dispose()
        },
    }
}
