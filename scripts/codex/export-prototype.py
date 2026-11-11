#!/usr/bin/env python3
"""Export the built prototype as one offline HTML file and a downloadable ZIP."""
import argparse
import json
import pathlib
import re
import urllib.parse
import urllib.request
import zipfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--version', required=True)
    parser.add_argument('--url', default='http://127.0.0.1/prototype-3d')
    parser.add_argument('--output', type=pathlib.Path, default=pathlib.Path('downloads'))
    args = parser.parse_args()
    if not re.fullmatch(r'[0-9]+\.[0-9]+', args.version):
        parser.error('version must be a major.minor number')
    root = pathlib.Path(__file__).resolve().parents[2]
    manifest = json.loads((root / 'public/build/manifest.json').read_text())
    entry = manifest['resources/js/prototype3d/index.js']
    if entry.get('imports') or entry.get('dynamicImports'):
        raise RuntimeError('Standalone export requires a single self-contained JS bundle')
    with urllib.request.urlopen(args.url, timeout=30) as response:
        page = response.read().decode('utf-8')
    if f'OGameX-3D · {args.version}' not in page:
        raise RuntimeError('The running page does not match the requested version')
    page = re.sub(r'<link\b[^>]*>', '', page)
    page = re.sub(r'<script\b[^>]*\bsrc=[^>]*></script>', '', page)
    css = '\n'.join((root / 'public/build' / path).read_text() for path in entry['css'])
    js = (root / 'public/build' / entry['file']).read_text()
    license_text = (root / 'resources/js/prototype3d/vendor/THREE-LICENSE').read_text()
    page = page.replace('</head>', '<style>' + css + '</style>\n</head>')
    page = page.replace('</body>', '<script type="module">' + js.replace('</script', '<\\/script') + '</script>\n<!-- Three.js MIT license\n' + license_text + '-->\n</body>')
    origin = urllib.parse.urlsplit(args.url)
    page = page.replace('href="' + origin.scheme + '://' + origin.netloc + '"', 'href="https://github.com/Nostago/ogamex-3d"')
    page = page.replace('Zum Spiel', 'Zum Projekt')
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    name = f'OGameX-3D-{args.version}.html'
    (output / name).write_text(page)
    instructions = f'''OGameX-3D {args.version} — eigenständige lokale Demo

ZIP entpacken und {name} mit Safari, Chrome, Firefox oder Edge öffnen.
Kein Server und keine Installation nötig. JavaScript und WebGL müssen aktiv sein.
Nach dem Download funktioniert die Demo ohne Internet.

Maus ziehen: drehen. Mausrad oder +/−: zoomen.
Gebäude anklicken: Details und sanfter Kamerafokus.
Übersicht: zurück zum Planeten. Rotation: automatische Kameradrehung.
Demo-Ausbau: Bauanimation, danach neue Stufe und Gebäudemodell (maximal Stufe 8).
Während des Baus: Demo zurücksetzen oder Orbit wählen bricht den Ausbau ab.
Orbit: Station und drei Beispielschiffe. Kamera kann jederzeit per Maus bewegt werden.

Alle Werte sind Beispieldaten; keine Verbindung zu einem echten Spielstand.
Neuladen oder Demo zurücksetzen stellt die Ausgangswerte wieder her.
Betriebsanimationen und Kamerafahrten beachten die Systemeinstellung
„Bewegung reduzieren“. Der optionale Projekt-Link benötigt Internet.
Three.js-MIT-Lizenz ist im Quelltext der HTML-Datei enthalten.
'''
    archive = output / f'OGameX-3D-{args.version}.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        bundle.writestr(name, page)
        bundle.writestr('ANLEITUNG.txt', instructions)
    with zipfile.ZipFile(archive) as bundle:
        if bundle.testzip() is not None:
            raise RuntimeError('ZIP integrity check failed')
    print(f'Created {archive} ({archive.stat().st_size} bytes)')


if __name__ == '__main__':
    main()
