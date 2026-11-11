# OGameX-3D 0.13 ausprobieren

[ZIP herunterladen](https://github.com/Nostago/ogamex-3d/raw/refs/heads/codex/ogamex-3d-v0.13/downloads/OGameX-3D-0.13.zip),
entpacken und `OGameX-3D-0.13.html` im Browser öffnen. Kein Server und keine
Installation nötig. JavaScript und WebGL müssen aktiv sein. Nach dem Download
funktioniert die Anwendung offline. Frühere ZIPs unter `downloads/` bleiben erhalten.

## Neu: Wirtschaft, Zeitaufträge, Forschung und Speichern

Sieben getrennte Seiten: Planet, Gebäude, Forschung, Schiffe, Flotten, Galaxie,
Nachrichten. Kolonie und Orbit bleiben Ansichten des Planeten. Unterseiten
behalten Listen und Eingaben als Hauptinhalt; die gemeinsame 3D-Szene dominiert
nur die Planetenübersicht. Höchstens zwölf repräsentative Schiffsmodelle stehen
für beliebig große Zahlenbestände. Die Geometrie wächst nicht mit der Stückzahl.

Die Wirtschaft verwendet **1× Wirtschaft, 1× Forschung**, 100 % Betrieb der
Minen und keine Klassen-, Offiziers-, Item-, Crawler- oder Plasmaboni. Rohstoffe
wachsen zeitabhängig. Die Buttons **Demozeit +1 Minute / +1 Stunde** spulen die
gesamte Simulation einschließlich aller Planeten, Zeitaufträge und Missionen vor.
Sie erhöhen die angezeigte Produktionsgeschwindigkeit nicht.

Vorbereitete Beispielkolonien starten jeweils mit 5.000 Metall, 5.000 Kristall
und 2.000 Deuterium. Das sind Demo-Startbestände, kein OGame-Neustart. Bereits
vorhandene Anlagen und Schiffe bleiben Beispiele; neue Aufträge benötigen die
zugehörigen Voraussetzungen. Forschungsstände sind anfangs null.

### Produktion nach vorhandenen OGameX-Formeln

Referenz sind die unveränderten PHP-Implementierungen dieses Repositories:

- `app/GameObjects/BuildingObjects.php`: Minen, Kraftwerke und Lager.
- `app/GameObjects/Models/Fields/GameObjectProduction.php`: Positionsbonus und Rundung.
- `app/Services/PlanetService.php`: Grundproduktion, Gesamtproduktion, Energiequote,
  Speicherbehandlung sowie Bau-, Forschungs- und Schiffsbauzeiten.
- `app/Services/SettingsService.php`: Standard-Grundproduktion 30 Metall / 15 Kristall.
- `app/Services/ObjectService.php` und `app/GameObjects/{Station,Research,MilitaryShip,CivilShip,Defense}Objects.php`:
  Kosten, Preisfaktoren, Voraussetzungen und Basis-Laderaum.

Basiswerte pro Stunde bei Minenstufe L:

| Anlage | Basisformel | Energie |
|---|---|---|
| Metallmine | `30 × L × 1,1^L` | `−10 × L × 1,1^L` |
| Kristallmine | `20 × L × 1,1^L` | `−10 × L × 1,1^L` |
| Deuterium-Synthesizer | `10 × L × 1,1^L × (1,44 − 0,004 × Temperaturmittel)` | `−20 × L × 1,1^L` |
| Solarkraftwerk | — | `20 × L × 1,1^L` |
| Fusionskraftwerk | Verbrauch `−10 × L × 1,1^L` Deuterium | `30 × L × (1,05 + Energietechnik × 0,01)^L` |

Positionsboni gelten wie im vorhandenen Code auch für die Grundproduktion.
Der Minen-Positionsbonus wird zunächst abgerundet, Rohstoffproduktion aufgerundet
und Energie abgerundet. Die Energiequote wird auf ganze Prozent abgerundet und
auf 0–100 % begrenzt. Sie senkt die Minenproduktion, nicht die Grundproduktion.
Der Fusionsreaktor verbraucht Deuterium; ein leerer Tank ohne ausreichende
Eigenversorgung deaktiviert ihn beim nächsten Berechnungsschritt.

| Kolonie | Position | Temperaturmittel (Demo) | Metallbonus | Anfangsproduktion M / K / D pro h |
|---|---|---|---|---|
| Aster | 1:42:6 | 80 °C | 17 % | 241 / 95 / 28 |
| Kepler IX | 1:42:7 | 40 °C | 23 % | 253 / 95 / 31 |
| Titan Prime | 1:42:8 | −40 °C | 35 % | 278 / 95 / 39 |

Temperaturen, Durchmesser, Felder und Startausbau sind ausdrücklich Beispieldaten.
Die Berechnung orientiert sich am aktuellen OGameX-Code und behauptet keine
vollständige Simulation aller modernen OGame-Boni.

Lagerkapazität: `5000 × floor(2,5 × exp(20 × Lagerstufe / 33))`.
Ohne Lagerausbau stehen 10.000 Einheiten zur Verfügung. Produktion stoppt am
jeweiligen Limit. Transportlieferungen und Erstattungen können darüber liegen;
dieser Überschuss wird nicht durch einen Produktionstakt gelöscht.

### Kosten und Zeitaufträge

Kosten sind `floor(Basiskosten × Preisfaktor^(Zielstufe−1))`; Schiffe und
Verteidigungsmodelle haben Stückkosten. Einheiten werden beim Vormerken bezahlt,
Gebäude und Forschung beim Start. Fehlende Rohstoffe oder Voraussetzungen
verhindern die Mutation. Ein Gebäudeauftrag pro Planet, ein Forschungsauftrag
für den gesamten Spieler und eine laufende Schiffsbau-Warteliste pro Planet.
Forschung gilt global. Laborausbau und Forschung am Forschungsort sperren sich.

Die Zeitformeln folgen dem vorhandenen `PlanetService`, einschließlich seines
Frühstufenfaktors für Gebäude. Mindestdauer ist eine Sekunde. Robotik und Naniten
verkürzen Gebäudezeiten; Werft und Naniten beeinflussen Schiffsbau; das Labor
beeinflusst Forschung. Beispiel: Leichter Jäger in Werft 2 benötigt bei 1× ohne
Naniten 1.920 Sekunden. Energietechnik 1 in Labor 2 dauert 960 Sekunden.
Reduzierte Bewegung überspringt keine Bauzeit.

**Alle Aufträge abarbeiten** startet die Schiffsliste in ihrer Reihenfolge.
Einzelne Schiffe werden nach ihrer Bauzeit gutgeschrieben; große Mengen werden
arithmetisch als Gruppe verarbeitet. **Schiffsaufträge pausieren** bewahrt den
bereits erreichten Fortschritt. Fortsetzen ist möglich. Entfernen eines pausierten
Restauftrags erstattet ausschließlich noch nicht gebaute Einheiten. Ein aktiver,
nicht pausierter Auftrag kann nicht entfernt werden. Menü- und Planetenwechsel
stoppen laufende Zeitaufträge nicht. Gebäude- und Forschungsabbrüche sind noch
nicht angeboten; deren lokaler Reset verwirft den jeweiligen Auftrag.

Die sechs Forschungsarten sind Energietechnik, Lasertechnik, Verbrennungs- und
Impulstriebwerk, Spionage- und Computertechnik. Ihre bestehenden Voraussetzungen
werden übernommen. Gebäude bleiben grafisch auf Stufe 8, Forschung auf Stufe 12
begrenzt. Hohe Voraussetzungen wie Robotik 10 für die Nanitenfabrik sind deshalb
noch nicht erreichbar. Verteidigungsstufen bleiben symbolische Modelle, keine
vollständige OGame-Verteidigungsverwaltung. Die Technologien schalten neue
Aufträge frei; Boni auf echte Flugzeiten, Schiffsgeschwindigkeit und Transport-
kapazität sind noch nicht angebunden.

### Ausprobieren

1. Planet öffnen und Produktionswerte sowie Bestand/Lagergrenze ansehen.
2. Gebäude → Metallmine auswählen. Kosten und Dauer prüfen, Ausbau starten und
   Demozeit vorspulen. Das Modell verändert sich nach Fertigstellung.
3. Forschung → Energietechnik 1, danach Verbrennungstriebwerk 1 erforschen.
4. Unter Schiffe einen Leichten Jäger vormerken und starten. Mit Demozeit
   vorspulen oder die Bauzeit abwarten. Für mehrere Aufträge genügend Rohstoffe
   produzieren lassen; die Warteliste anschließend vollständig starten.
5. Pausieren, Datei neu öffnen und fortsetzen. Den Speicherhinweis oben beachten.
6. Flotte aus verfügbaren Schiffen anlegen. Galaxie → Eigenes System → Position 6
   → Transport planen. Kleine Ladung versenden, eine Demo-Minute vorspulen,
   Bestand am Ziel und Nachrichten → Flotten → Transport prüfen.

### Speicherung und Reset

`localStorage`-Schlüssel `ogamex3d:v013`, Schema 1. Gespeichert werden alle drei
Planeten, Rohstoffreste, Gebäude, Schiffe, Zeitaufträge, Forschung, Flotten,
Missionen, Nachrichten und Demo-Zeitversatz. Beim Wiederöffnen werden Produktion
und fällige Ereignisse chronologisch nachgeholt. Ein Ausbau wirkt damit nicht
rückwirkend auf die davor liegende Produktionszeit. Schiffsmengen, Zustellungen
und Rückkehr werden genau einmal verbucht.

Die Anzeige oben meldet Speicherung, einen unlesbaren Speicherstand oder einen
nicht verfügbaren Browserspeicher. Browser behandeln lokale `file://`-Dateien
unterschiedlich. Derselbe Browser und Dateipfad sind für die Wiederaufnahme
empfohlen. Privatmodus, Umbenennen oder Verschieben kann einen anderen Speicher
verwenden. Ohne Speicher bleibt die Demo für die Sitzung nutzbar. Das ist keine
serverseitige oder browserübergreifende Speicherung. Ältere Versionen hatten
keinen kompatiblen lokalen Wirtschaftsspielstand und werden nicht importiert.

Lokaler Planetenreset setzt dessen Startzustand zurück, verwirft dortige Aufträge
und beendet eine von dort gestartete Forschung. Abgeschlossene globale Forschung
bleibt erhalten. Betroffene Missionen werden gestoppt. Nicht zugestellte Ladung
wird bei Zielreset an den Ursprung erstattet; nach Zustellung gibt es keine
rückwirkende Erstattung. **Gesamte Demo zurücksetzen** setzt nach Bestätigung
auch Forschung, Zeitversatz und Postfach zurück und speichert den neuen Zustand.

## Erhaltene Bereiche und Grenzen

Flotten können angelegt, editiert und aufgelöst werden; nur verfügbare Schiffe
sind zuweisbar. Auf Mission sind Änderungen gesperrt. Verlegung verschiebt
Schiffe und Verband nach 15 Demo-Sekunden zum Ziel. Transport stellt die Ladung
nach 15 Sekunden zu und kehrt nach weiteren 15 Sekunden leer zurück. Diese
kurzen Flugzeiten sind weiterhin Demonstrationswerte ohne Treibstoffkosten.
Basis-Laderaum: Kleiner Transporter 5.000, Leichter Jäger 50, Sonde 0.

Galaxie: 3 Beispielgalaxien × 499 Systeme, Positionen 1–15 und Expeditionsraum 16.
Eigene Kolonien liegen auf 1:42:6–8, fremde Beispielplaneten auf 3 und 10. Aktionen
gegen fremde Spieler, Kolonisation, Monde, Trümmerfelder, Spionage und Kampf
sind noch nicht verfügbar. Nachrichten übernehmen die Kategorien des Originals
und enthalten lokale Beispielpost sowie Transport-/Verlegungsberichte. Es wird
keine Post an andere Spieler gesendet. Im Laravel-Projekt bleibt das optionale
Originalpostfach-Theme über `/messages?prototype3d=1` verfügbar; der Serverlink
wird aus der ZIP entfernt.

Der ausdrücklich kostenlose Großflotten-Modelltest kann einen Beispielbestand
von 1,1 Millionen Schiffen laden. Das ist kein regulärer Wirtschaftsvorgang und
verändert keine echten Spielstände. Abhängigkeiten, Lockfiles, bestehende
Spielmechanik, Datenbank und Hauptbranch bleiben unverändert.

## Architektur und Verifikation

`economyRules.js` enthält die geprüften Basiskosten und Voraussetzungen aus den
PHP-Katalogen. `economy.js` enthält Produktions-, Lager-, Preis- und Zeitformeln.
`economyUi.js` zeigt Produktionswerte, Kosten und Forschungsaufträge.
`data.js` verwaltet die chronologische lokale Ereignisverarbeitung und stellt
asynchrone DTOs bereit; der spätere authentifizierte Serveradapter muss weiterhin
autoritativ rechnen. `demoStorage.js` lädt versionierte, validierte Browserdaten.
`scene.js` zeichnet begrenzte Modelle, ohne Wirtschaft oder Bauzeit zu bestimmen.
Der Wirtschaftstakt baut die Szene nur bei Zustandsänderungen neu auf.

`createDemoProvider({ economyMode: true, storage, now })` aktiviert Wirtschaft
und Speicherung. Ohne `economyMode` bleibt der bisherige reine Beispieldaten-
Provider für die vorhandenen isolierten Modell-/Reservierungstests verfügbar.
Die ausgelieferte Anwendung aktiviert die Wirtschaft immer. `now` ist für Tests
austauschbar. Zeitaufträge und Millionenmengen werden ohne Framezähler und ohne
Schleifen pro Schiff abgeschlossen.

```sh
node --test tests/Frontend/*.test.mjs
sh scripts/codex/compose.sh exec -T ogamex-app composer run rector
sh scripts/codex/compose.sh exec -T ogamex-app composer run cs
sh scripts/codex/compose.sh exec -T ogamex-app composer run stan
sh scripts/codex/compose.sh exec -T ogamex-app composer run tests -- --processes=2 --filter 'Prototype3dTest|Http200Test|RustFfiTest|MessagesTest|GalaxyTest|FleetDispatchTransportTest'
sh scripts/codex/compose.sh exec -T ogamex-app composer run tests -- --filter ResourceProductionTest
npm run build
python3 scripts/codex/export-prototype.py --version 0.13 --output /workspace/exports/v0.13
PLAYWRIGHT_MODULE=/workspace/ogamex-cloud/browser-tools/node_modules/playwright \
PROTOTYPE_HTML=/workspace/exports/v0.13/OGameX-3D-0.13.html \
ARTIFACT_DIR=/workspace/ogamex-cloud/v013-artifacts \
node tests/Frontend/economy.browser.mjs
```

`tests/fixtures/prototype-production.json` wurde aus den originalen PHP-Closures
bei Temperaturmittel 40 °C erzeugt. Die Node-Tests vergleichen damit Stufen 1–8,
Energierundung und Positionsbonus und prüfen zusätzlich Kosten/Zeit, chronologische
Produktion, Voraussetzungen, doppelte Starts, Reservierungen, Teilfertigung,
Pause/Fortsetzen, Erstattung, Millionenschiffe, Speichern/Nachholen und Reset.
Die vorhandenen Modell-, Flotten-, Nachrichten- und Galaxietests bleiben erhalten.
`prototype3d.browser.mjs` dokumentiert den Browserstand vor aktivierter Wirtschaft
und kann gegen die unveränderte 0.12-ZIP ausgeführt werden; für 0.13 gilt der
neue Browserlauf oben. Er verwendet einen lokal abgefangenen Dokumentaufruf
mit Browser-Origin, damit Speicherung und Neuladen offline geprüft werden können.
Es ist dafür kein Server erreichbar oder erforderlich; externe Requests werden
blockiert. Zusätzlich werden alle sieben Mobilseiten und Speicherfehler geprüft.
