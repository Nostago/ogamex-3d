# Neuaufbereitung aus den ursprünglichen GLBs

Stand: 18.11.2026. Alle fünf gemeldeten beschädigten Modelle sind aus den Originalen neu erzeugt; keine Änderungen an Spielregeln oder Spielständen.

## Geometrie repariert

Crawler, Bomber, Reaper, Solarsatellit und kleiner Transporter sind vollständig übertragen. Reaper kam als ZIP, Solarsatellit und Transporter als zusammengefügte ZIP-Teile. Alle fünf Quellhashes stimmen mit den ursprünglichen Bearbeitungsberichten überein. Die frühere 32-MiB-Transfergrenze ist damit überwunden. Es fehlen keine Originale mehr für diese Reparatur.

Die frühere Webreduktion erzeugte Geometriespitzen außerhalb der echten Modellgrenzen. Die neue Reduktion verwendet Blenders Decimate-Modifier mit UV-/Normalenzuordnung. Texturen werden auf höchstens 1024 px begrenzt und die GLBs mit Meshopt/WebP komprimiert. Ein verlustloses PNG-Zwischenformat vermeidet eine zusätzliche JPEG-Stufe.

| Modell | Original (Bytes) | Neue GLB (Bytes) | Dreiecke Original → Web | Konturvergleich |
| --- | ---: | ---: | ---: | ---: |
| Crawler | 30.463.816 | 976.408 | 976.542 → 65.000 | 99.53 % |
| Bomber | 29.466.548 | 876.988 | 962.528 → 65.000 | 99.64 % |
| Reaper | 38.542.224 | 891.384 | 927.547 → 64.999 | 99.10 % |
| Solarsatellit | 68.564.020 | 1.233.156 | 1.970.563 → 64.999 | 99.57 % |
| Kleiner Transporter | 66.462.152 | 1.155.184 | 1.875.949 → 65.000 | 99.76 % |

Konturvergleich: Intersection-over-Union der Alpha-Silhouetten bei identischem 35°-/22°-Blickwinkel und 1024×768-Rendering von Original und Webfassung. Alle fünf Paare wurden zusätzlich visuell geprüft. Kein Abschneiden der Modellspitzen und keine Kaschierung durch Ausreißerfilter. Die neue Geometrie ersetzt die beschädigte v2 jeweils als `public/models/live3d/<key>-v3.glb`; dazu gehören v3-Berichte und `public/img/live3d/ships/<key>-35-v3.webp`.

Die Berichte enthalten Quellhash, Modellhash, Originalgrenzen, Stichprobenabstand und Konturvergleich. `geometry_repair_pending` ist für alle fünf `false`. Die vier bisherigen ersten Schiffe bleiben in allen zwölf Modell-/Bild-/Berichtsdateien bytegleich.

## Einheitliche Vorschaugröße

Alle 17 Schiffe verwenden im Baukatalog die Bildfelder der beiden Jäger: **96×72 px**, auf kleinen Bildschirmen **72×54 px**. Die Größe hängt auf der Schiffsseite nicht mehr von einem Modellalias ab. Der Browser prüft ausdrücklich auch das Entfernen der optionalen `model-thumbnail`-Klasse, damit die neuen Schiffe nicht auf die alten 40×40-Felder zurückfallen.

Alle 13 zusätzlichen Schiffstypen haben vergrößerte echte Modellrenderings als transparente 512×384-WebPs. Der Renderer passt alle projizierten Geometriepunkte in den Ausschnitt ein, mit 16 % Reserve gegenüber dem engstmöglichen Rahmen. Die längste Bildachse füllt mindestens 80 %; natürliche Unterschiede der Schiffsproportionen bleiben erhalten. Der Todesstern bleibt rund. Die Spionagesonde nutzt für das Miniaturbild zusätzlich 45° Kameraroll. Die bisherigen vier Bilder bleiben unverändert.

## Reproduktion und Prüfung

Nur in der Entwicklungsumgebung; keine Assetwerkzeuge auf dem VPS erforderlich:

```bash
blender -b -t 3 --python scripts/assets/prepare-ship-preview.py -- Original.glb output-dir --key crawler
bash scripts/assets/compress-ship-preview.sh output-dir/crawler-reduced.glb output-dir/crawler-v3.glb
PLAYWRIGHT_MODULE=/path/to/playwright node scripts/assets/render-ship-portraits.mjs output-dir crawler bomber
```

`SOURCE_MODELS_FILE` kann für Referenzrenderings auf eine lokale JSON-Datei mit Machine-Key → Originalpfad zeigen. Originale werden nur über einen temporären Loopback-Server gelesen, nie in `public/` kopiert.

Die Reduktion prüft Modellgrenzen und mindestens 4096 Punkte gegen einen KD-Baum der ursprünglichen Vertexpositionen. Grenzüberschreitung und 99. Perzentil des Abstandes müssen innerhalb von 1 % der ursprünglichen Ausdehnung liegen; der maximale Einzelabstand innerhalb von 2,5 %. Das ist eine Positionsstichprobe, keine vollständige Oberflächendistanz. Der Browser prüft die Grenzen auch nach tatsächlichem GLTF-/Meshopt-Decoding sowie Bildfüllung und freien Rand aller 13 Miniaturen.

Validierung: 103 JavaScript-Tests bestanden; Rector, Pint, PHPStan und Frontend-Build erfolgreich. Vollständige PHP-Suite: 1.204 bestanden, 42 Hinweise, 27.294 Assertions (320,38 s mit fünf Prozessen). Chromium prüft alle 17 Modelle in Komponente und gebauter Spieloberfläche, Sofortladen, Wechsel, Refresh, mobile Darstellung, WebGL-Ausfall sowie gleiche Bildfelder. PHP-Tests und UI-Prüfung verwenden ausschließlich separate Entwicklungsdatenbanken. Kein produktives Deployment.
