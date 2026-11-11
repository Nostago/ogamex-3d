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
    page = re.sub(r'<a\b[^>]*data-live-message-link[^>]*>.*?</a>', '', page, flags=re.S)
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

Hauptnavigation: Planet / Gebäude / Schiffe / Flotten. Auf dem Handy unten.
Planet und Reset sind oben auf allen Seiten erreichbar.
Planet: Kolonie und Orbit sind zwei Ansichten desselben Planeten.
Orbit bleibt hier; die linke Navigation Flotten öffnet die Flottenverwaltung.
Maus ziehen: drehen. Mausrad oder +/−: zoomen. Übersicht: Kamera zurücksetzen.
Ein Gebäude auf dem Planeten anklicken öffnet seine Gebäudeseite.
Gebäude: drei Übersichten Rohstoffe, Schiffe und Verteidigung.
Keine Suchleiste oder Kategorienfilter. Details und Demo-Ausbau bis Stufe 8.
Baumenü: Typ wählen und Demo errichten. Der Standort wird automatisch vergeben.
Terraformer erweitert die Baufelder, nicht den Planetendurchmesser.
Jede Gebäudestufe braucht ein Feld; Verteidigungsmodelle brauchen keine Felder.
Schiffe: Je Typ werden Bereit, In Produktion / beauftragt und Frei verfügbar aktualisiert.
Typ und Stückzahl eingeben, Mengenauftrag vormerken, dann einen Auftrag oder „Alle Aufträge abarbeiten“ ausführen.
Alle Aufträge laufen nacheinander, auch beim Menüwechsel. Unterbrechen oder
Planetenwechsel stoppt die Verarbeitung; offene Aufträge bleiben vorgemerkt.
Die kurze Montage-/Startanimation steht für den gesamten Mengenauftrag.
Flotten: Bestehende Verbände mit Name, Zusammensetzung und Status.
Neue Flotte: Name und verfügbare Schiffe wählen, dann speichern.
Bearbeiten ändert die Zusammensetzung; Auflösen gibt reservierte Schiffe frei.
Noch nicht fertig gebaute oder anderen Flotten zugewiesene Schiffe sind nicht verfügbar.
Bei einer Flotte Zielplanet wählen und „Verlegung bestätigen und starten“ drücken.
15 Sekunden Demo-Flugzeit, Fortschritt und Ankunft in der Missionsübersicht.
Unterwegs sind Bearbeiten und Auflösen gesperrt. Am Ziel wird die Flotte wieder frei.
Die Schiffe werden genau einmal vom Ursprung zum Ziel übertragen.
Nachrichten: Kategorien wie im Original, Ungelesenzähler, Details und Löschen.
Flotten → Sonstiges enthält die Ankunftsberichte deiner Demo-Verlegungen.
Die Offline-Datei enthält Beispielpost, keine echte Post oder Sendefunktion.
Das angemeldete Originalpostfach kann im Laravel-Projekt mit neuem Theme geöffnet werden.
Keine echten OGame-Flugzeiten, Kosten oder Kämpfe.
Flotten werden in dieser geöffneten Demo gespeichert; Neuladen setzt die Demo zurück.
Unter Schiffe den Beispielbestand Großflotte wählen: 1.100.000 Schiffe.
Vor dem Ersetzen offene Aufträge abschließen/entfernen und bestehende Flotten auflösen.
Höchstens zwölf repräsentative Orbitmodelle stehen für den ganzen Bestand.
Auf Unterseiten ist die kleine 3D-Vorschau optional; Listen und Eingaben stehen im Mittelpunkt.
Formulare und Auswahl bleiben beim Navigieren erhalten.
Die Hauptnavigation unterbricht laufende Demo-Vorgänge nicht.
„Vorgang unterbrechen“ stoppt die Animation; ein Schiffsauftrag bleibt vorgemerkt.
„Auftrag entfernen“ verwirft einen offenen Auftrag ausdrücklich.
Planetenwechsel unterbricht Bauanimationen, aber keine laufenden Flüge.
Reset stoppt betroffene Demo-Missionen und verhindert verspätete Ankünfte.
Reset betrifft nur den aktuellen Planeten, Neuladen alle.
Die Demo erlaubt Mengen von 1 bis 1.000.000.000 und höchstens 20 offene Aufträge.
Diese Grenzen sind keine OGame-Flottenlimits. Keine produktiven Missionen oder Kämpfe.

Alle Werte sind Beispieldaten; keine Verbindung zu einem echten Spielstand.
„Diesen Planeten zurücksetzen“ setzt nur den ausgewählten Planeten zurück.
Neuladen setzt alle Planeten zurück. Ein Planetenwechsel bricht laufende Bauten ab.
Demo-Kosten, Forschungsvoraussetzungen und echte Bauzeiten werden nicht simuliert.
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
