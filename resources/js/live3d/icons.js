const paths = {
    officers: 'M8 3h8l2 5-6 4-6-4 2-5Zm4 9v9m-4-3 4 3 4-3',
    shop: 'M3 8h18v13H3V8Zm4 0V3h10v5',
    merchant: 'M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4',
    notes: 'M5 2h14v20H5V2Zm3 5h8M8 11h8m-8 4h6',
    buddies: 'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-4c0-5 12-5 12 0v4m3-13h6m-3-3v6',
    options: 'M4 5h16M4 12h16M4 19h16M8 2v6m8 1v6m-6 1v6',
    highscore: 'M3 21V11h5v10m2 0V3h5v18m2 0V7h5v14',
    planet: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM2 17c3 3 21-9 20-12M2 17c-3-4 2-8 5-9m15-3c2 3 0 6-3 8',
    buildings: 'M3 22V11h5v11m0-9V3h5v19m0-15h5v15m0-9h3v9M6 14v2m5-9v2m5 2v2',
    research: 'M8 2h8m-6 0v7L3 20c0 2 18 2 18 0L14 9V2M7 15h10',
    ships: 'm3 15 6-3 5-8 4 2-1 6 5 4-9 2-4 4-2-6-4-1ZM9 12l8 0',
    defense: 'm12 2 8 3v7c0 5-4 8-8 10-4-2-8-5-8-10V5l8-3Zm0 3v14m-5-9h10',
    fleets: 'm2 9 8-5 11 5-11 5-8-5Zm0 6 8 5 11-5M3 12l7 5 10-5',
    galaxy: 'M12 12c-6 0-6-6 0-6s10 9 2 12S0 17 3 9 18 0 22 8s-3 16-13 14',
    alliance:
        'M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm9-1a2.5 2.5 0 1 0 0-5M2 21v-5c0-5 12-5 12 0v5m2-8c4 0 6 1 6 4v4',
    messages: 'M2 5h20v14H2V5Zm0 0 10 8L22 5M2 19l7-7m13 7-7-7',
    settings:
        'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2-6h4l1 4 4-1 2 4-3 3 3 3-2 4-4-1-1 4h-4l-1-4-4 1-2-4 3-3-3-3 2-4 4 1 1-4Z',
    refresh: 'M20 8a9 9 0 1 0 0 9m0-15v6h-6',
    external: 'M14 3h7v7m0-7L10 14M10 4H3v17h17v-7',
    rotate: 'M4 12a8 8 0 1 0 2-5M2 3v6h6',
}
export function renderIcons() {
    for (const node of document.querySelectorAll('[data-icon]')) {
        const path = paths[node.dataset.icon]
        if (!path) continue
        const svg = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'svg',
            ),
            line = document.createElementNS(svg.namespaceURI, 'path')
        svg.setAttribute('viewBox', '0 0 24 24')
        svg.setAttribute('fill', 'none')
        svg.setAttribute('stroke', 'currentColor')
        svg.setAttribute('stroke-width', '1.3')
        svg.setAttribute('aria-hidden', 'true')
        line.setAttribute('d', path)
        svg.append(line)
        node.append(svg)
    }
}
