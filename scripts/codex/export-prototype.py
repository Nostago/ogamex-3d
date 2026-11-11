#!/usr/bin/env python3
"""Export the built prototype as one offline HTML file and a downloadable ZIP."""
import argparse
import json
import pathlib
import re
import subprocess
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
    with urllib.request.urlopen(args.url, timeout=30) as response:
        page = response.read().decode('utf-8')
    if f'OGameX-3D · {args.version}' not in page:
        raise RuntimeError('The running page does not match the requested version')
    page = re.sub(r'<a\b[^>]*data-live-message-link[^>]*>.*?</a>', '', page, flags=re.S)
    page = re.sub(r'<link\b[^>]*>', '', page)
    page = re.sub(r'<script\b[^>]*\bsrc=[^>]*></script>', '', page)
    css_paths = []
    visited = set()
    def collect_css(key):
        if key in visited:
            return
        visited.add(key)
        item = manifest[key]
        for dependency in item.get('imports', []) + item.get('dynamicImports', []):
            collect_css(dependency)
        for path in item.get('css', []):
            if path not in css_paths:
                css_paths.append(path)
    collect_css('resources/js/prototype3d/index.js')
    css = '\n'.join((root / 'public/build' / path).read_text() for path in css_paths)
    js = (root / 'public/build' / entry['file']).read_text()
    if entry.get('imports') or entry.get('dynamicImports'):
        # Multiple Vite entries share visual modules. Bundle the demo entry only;
        # Rolldown is already provided by Vite, so no installation is required.
        js = subprocess.check_output([
            'node', '--input-type=module', '-e',
            "import {rolldown} from 'rolldown'; const b = await rolldown({input:process.argv[1]}); const r = await b.generate({format:'es',inlineDynamicImports:true}); process.stdout.write(r.output.find(x=>x.type==='chunk').code)",
            str(root / 'public/build' / entry['file']),
        ], cwd=root, text=True)
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

ZIP entpacken und {name} in Safari, Chrome, Firefox oder Edge öffnen.
Kein Server und keine Installation. JavaScript und WebGL müssen aktiv sein.
Nach dem Download funktioniert die Demo ohne Internet.

Neu: Wirtschaft, bezahlte Zeitaufträge, Forschung und lokale Speicherung.
Wirtschaft 1×, Forschung 1×, keine Klassen-, Offiziers- oder Itemboni.
Produktionsformeln, Grundproduktion, Positionsboni, Rundung, Energiebedarf,
Lagergrenzen, Kosten und Bauzeiten sind dem vorhandenen OGameX-Code entnommen.
Planeten, Startausbau und Anfangsbestände bleiben Beispieldaten:
5.000 Metall, 5.000 Kristall und 2.000 Deuterium je Kolonie.
Temperaturmittel Aster 80 °C, Kepler IX 40 °C, Titan Prime −40 °C.
Kepler IX produziert anfangs 253 Metall, 95 Kristall und 31 Deuterium je Stunde.
Volle Lager stoppen den weiteren Zuwachs; Lieferungen dürfen Lager überfüllen.
Energieknappheit senkt Minenproduktion, nicht die Grundproduktion.

Planet: Kolonie und Orbit, Maus ziehen zum Drehen, Mausrad zum Zoomen.
Gebäude: Kosten, Voraussetzungen und Bauzeit ansehen, Auftrag starten.
Pro Planet ein Gebäudeauftrag. Modell verändert sich nach Fertigstellung.
Forschung: sechs Technologien, global für alle Kolonien, ein Auftrag gleichzeitig.
Zuerst Energietechnik 1, danach Verbrennungstriebwerk 1 für neue Leichte Jäger.
Kosten werden beim Start abgebucht. Forschungslabor kann während der dortigen
Forschung nicht ausgebaut werden und umgekehrt.
Schiffe: Kosten werden beim Vormerken bezahlt. Auftragsliste einzeln oder mit
„Alle Aufträge abarbeiten“ starten. Schiffe werden nach ihrer Einzelbauzeit
nach und nach fertig. Pausieren hält Fortschritt; fortsetzen ist möglich.
Entfernen erstattet nur den noch nicht gebauten Teil eines Auftrags.
Planeten- und Menüwechsel stoppen Zeitaufträge nicht.
Die Buttons „Demozeit +1 Minute“ und „Demozeit +1 Stunde“ spulen alle Planeten,
Aufträge und Flüge gemeinsam vor. Die angezeigten Produktionsraten bleiben 1×.
„Bewegung reduzieren“ überspringt keine Bauzeit.

Flotten: verfügbare Schiffe zu Verbänden zusammenstellen, bearbeiten, auflösen.
Galaxie: Galaxie/System wählen, eigene Kolonien auf [1:42:6–8] öffnen oder als
Transportziel wählen. Fremde Planeten und Expeditionen bleiben Platzhalter.
Transporte: Ladung prüfen, beim Start abbuchen, nach 15 s zustellen und nach
weiteren 15 s leer zurückkehren. Verlegungen dauern 15 s und verschieben Schiffe.
Diese kurzen Flugzeiten sind frei gewählte Demowerte, keine OGame-Flugformeln.
Nachrichten enthalten Beispielpost sowie Zustell- und Rückkehrberichte.
Keine echten Kämpfe, Spionage, Spielerpost oder Verbindung zu Spielständen.
Große Bestände bleiben Zahlen mit höchstens zwölf repräsentativen Orbitmodellen.
Der kostenlose Großflotten-Modelltest ersetzt ausdrücklich nur Beispielschiffe.

Speichern: Automatisch im Browserspeicher, falls verfügbar. Erneutes Öffnen am
selben Ort im selben Browser übernimmt den Spielstand und holt fällige Aufträge
und Produktion nach. Die Speicheranzeige zeigt, ob das funktioniert. File-URLs
werden je nach Browser unterschiedlich behandelt; Privatmodus, Verschieben oder
Umbenennen der HTML-Datei kann den Speicher unzugänglich machen. Ohne Speicher
funktioniert die Demo nur für diese Sitzung. Alte ZIP-Spielstände werden nicht
importiert. Ohne Browserfreigabe wird nichts an einen Server gesendet.
„Diesen Planeten zurücksetzen“ betrifft die lokale Kolonie; globale bereits
fertige Forschung bleibt. „Gesamte Demo zurücksetzen“ löscht den lokalen
Fortschritt nach Bestätigung. Vor einem Zielreset nicht zugestellte Ladung wird
erstattet, bereits zugestellte Ladung nicht rückwirkend zurückgebucht.

Ausbau bleibt auf Stufe 8, Forschung auf Stufe 12 begrenzt. Hohe Voraussetzungen
z. B. der Nanitenfabrik sind deshalb in dieser Demo noch nicht erreichbar.
Defensive Stufen sind symbolische Modelle, keine vollständige Verteidigungslogik.
Forschungsboni auf Schiffsantriebe, Ladekapazität und echte Flugzeiten folgen später.
Three.js-MIT-Lizenz steht im HTML-Quelltext. Der Projekt-Link benötigt Internet.
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
