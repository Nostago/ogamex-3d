# Schiffsmodelle: Ladezeit und Bildausschnitt

Stand: 18.11.2026. Aufbauend auf dem mit dem Serverstand abgeglichenen Commit `880dc222`.

## Aktueller Reparaturstand

**Alle fünf beschädigten Modelle sind aus den neu übertragenen Originalen repariert und als v3 registriert.** Alle 13 zusätzlichen Schiffe haben große, vollständige Miniaturen; alle 17 Bildfelder entsprechen den beiden Jägern. Details und Quellvergleiche: [Neuaufbereitung](OGAMEX-3D-SHIP-REPAIR.md).

Die aktuellen 13 GLBs benötigen zusammen **10.408.516 Bytes (9,93 MiB)** statt 34.837.244 Bytes der ersten Integration, rund **70,1 % weniger**. Die fünf reparierten Dateien liegen zwischen 876.988 und 1.233.156 Bytes. Die bisherigen vier Modelle und Bilder bleiben bytegleich.

Die folgenden Messungen dokumentieren den vorherigen Kompressionsstand `a333934e`; sie sind keine neue Laufzeitmessung der v3-Reparaturen und keine Zusage für die VPS-Ladezeit.

## Vorheriger Kompressionsstand

- Alle dreizehn zusätzlichen GLBs wurden mit dem bereits vorhandenen Meshopt-/WebP-Verfahren komprimiert. **34.837.244 → 10.806.844 Bytes**, rund **69 % weniger Daten**. Keine weitere Dreiecksreduktion; alle vorhandenen Dreiecke bleiben erhalten. Einzeldateien: 352.264 bis 1.273.396 Bytes.
- Die vier ursprünglichen Modelle und Vorschaubilder bleiben bytegleich. Auch Crawler und Solarsatellit sind kleiner, ihre beschädigte Geometrie bleibt jedoch unverändert. Eine Kompression repariert keine Geometrie.
- Spionagesonde und Pathfinder haben neu aus der GLB gerenderte transparente 512×384-Vorschaubilder. Der Rumpf füllt mindestens 80 % der Bildbreite und 70 % der Höhe, mit Abstand zum Rand. Winkel 35°/22°; die Spionagesonde erhält nur für das Miniaturbild zusätzlich 45° Kameraroll, damit ihre lange Achse in den Querformat-Rahmen passt.
- Neue Modell-/Bildadressen verhindern alte Browsercache-Treffer. Alle JS-/PHP-Zuordnungen, Flottenbilder und Katalogbilder verwenden die neuen Pfade. Listen laden weiterhin keine GLBs.

## Historischer Befund vor der Neuaufbereitung

**Dieser Befund ist inzwischen durch die Originalübertragung und v3-Neuaufbereitung behoben.** Die verfügbare Datei `OGameX-3D-13-Schiffsmodelle-Web.zip` enthält bereits reduzierte Modelle; die ursprünglichen GLBs und `Archiv(2).zip` sind in dieser Arbeitsumgebung nicht vorhanden.

Bei Solarsatellit und Crawler bestätigt die Nahansicht die gemeldeten explodierten Flächen. Auch Bomber, Reaper und kleiner Transporter zeigen unplausible Geometriespitzen. Diese Außenfragmente vergrößern die Modellgrenzen und damit den Bildausschnitt; der eigentliche Rumpf wird winzig. Eine stärkere Vergrößerung würde die Schäden nur sichtbarer machen. Sie wurde deshalb nicht als Reparatur veröffentlicht.

Für diese fünf Modelle mussten Reduktion und Vorschaubilder aus den Originalen neu erzeugt und visuell verglichen werden. Die Kompression der fünf betroffenen Modelle verändert ihre bereits beschädigte Topologie nicht; ihre damaligen Berichte kennzeichneten `geometry_repair_pending: true`. Strukturelle GLB-/Indexprüfungen allein sind kein Nachweis einer unverformten Modelloberfläche.

## Gemessene Vorschauzeiten

Chromium, Software-WebGL, leerer Browsercache, 10 Mbit/s, 80 ms Latenz, Vorschau 512×290. Die Messung lief ohne parallele Testlast. Dieselben gebauten Preview-Module und dieselben ausgewählten Schiffe wurden einmal mit den vorherigen GLB-Bytes und einmal mit den komprimierten GLBs ausgeliefert. Angegeben ist die Zeit ab Auswahl bis zum ersten Bild einschließlich Download und Decodierung. Der erste Modulimport (rund 0,75 s) und Rendereraufbau sind separat und in der Tabelle nicht enthalten. Die Werte isolieren die Vorschau; sie sind keine zugesicherte Ladezeit der vollständigen VPS-Seite.

| Schiff | Vorher | Nachher |
| --- | ---: | ---: |
| Bomber | 2,69 s | 1,24 s |
| Reaper | 3,29 s | 1,12 s |
| Kleiner Transporter | 3,25 s | 1,23 s |
| Spionagesonde | 2,98 s | 0,74 s |
| Pathfinder | 1,46 s | 0,65 s |
| Kreuzer | 2,19 s | 0,81 s |
| Schlachtschiff | 2,47 s | 0,82 s |
| Schlachtkreuzer | 3,23 s | 0,98 s |
| Zerstörer | 0,73 s | 0,46 s |
| Todesstern | 2,70 s | 0,74 s |
| Recycler | 1,43 s | 0,54 s |
| Crawler | 2,99 s | 1,04 s |
| Solarsatellit | 3,73 s | 1,27 s |

Messdaten: [vorher](benchmarks/ship-quality-before.json), [nachher](benchmarks/ship-quality-after.json). Das erneute Öffnen des zuletzt geladenen Modells benötigte im Nachher-Test rund 28 ms.

## Entwicklung und Prüfung

Kein Assetwerkzeug muss auf dem Spielserver installiert werden. Die gebauten Frontend-Dateien werden mitgeliefert. Keine Migrationen, keine Preis-/Mengenänderungen und kein Zugriff auf produktive Spielstände.

Kompression pro Modell:

```bash
bash scripts/assets/compress-ship-preview.sh input.glb output-v2.glb
```

Vorschaubilder aus den registrierten GLBs erzeugen:

```bash
PLAYWRIGHT_MODULE=/path/to/playwright node scripts/assets/render-ship-portraits.mjs output-dir espionage_probe pathfinder
```

Der Renderer berücksichtigt alle projizierten Geometriepunkte und schneidet keine Ausreißer ab. Die erzeugten Bilder sind echte Renderings der Modelle; keine erfundenen Ersatzbilder.

Prüfungen: 1.204 PHP-Tests (42 Hinweise), 103 JavaScript-Tests; GLB-Meshopt-Decodierung, Dreiecksindizes, Dateibudgets und Topologieberichte; zusätzlicher PHP-Artwork-Featuretest, Rector, Pint, PHPStan; Frontend-Build; Chromium mit allen 17 registrierten Modellen einschließlich Erstaufruf, Refresh, schnellen Wechseln, GPU-Ausfall, mobiler Darstellung und pixelbasierter Größen-/Randprüfung aller 13 neuen Miniaturen. Der zusätzliche Originalvergleich der fünf reparierten Modelle ist in der Neuaufbereitung dokumentiert.
