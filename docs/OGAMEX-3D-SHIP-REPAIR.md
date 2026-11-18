# Neuaufbereitung aus den ursprünglichen GLBs

Stand: 18.11.2026. Aufbauend auf `a333934e`; keine Änderungen an Spielregeln oder Spielständen.

## Crawler und Bomber repariert

Die neu hochgeladenen Originale wurden vollständig übertragen. Ihre SHA-256-Werte stimmen mit den ursprünglichen Quellangaben überein. Beide Originale sind unverformt. Ihre früheren Webfassungen hatten dagegen Geometriespitzen weit außerhalb der tatsächlichen Modellgrenzen.

Die neue Reduktion verwendet Blenders eigenen Decimate-Modifier einschließlich UV-/Normalenzuordnung. Anschließend werden die Texturen auf höchstens 1024 px begrenzt und GLBs mit dem vorhandenen Meshopt-/WebP-Verfahren komprimiert. Ein verlustloses PNG-Zwischenformat vermeidet eine zusätzliche JPEG-Kompressionsstufe.

| Modell | Original | Neue GLB | Dreiecke Original → Web | Konturvergleich |
| --- | ---: | ---: | ---: | ---: |
| Crawler | 30.463.816 Bytes | 976.408 Bytes | 976.542 → 65.000 | 99.53 % |
| Bomber | 29.466.548 Bytes | 876.988 Bytes | 962.528 → 65.000 | 99.64 % |

Konturvergleich: Intersection-over-Union der Alpha-Silhouetten bei identischem 35°-/22°-Blickwinkel und 1024×768-Rendering von Original und neuer Webfassung. Die Originale und reduzierten Modelle wurden zusätzlich visuell verglichen. Die Fotos verwenden alle projizierten Geometriepunkte: keine Beschneidung der Modellspitzen, einheitlich 16 % Reserve gegenüber dem engstmöglichen Bildausschnitt. Der Rumpf füllt dadurch mehr als 80 % der Breite; beim langgestreckten Bomber bleibt die natürliche freie Fläche ober-/unterhalb erhalten.

Neue Pfade:

- `public/models/live3d/crawler-v3.glb` und `crawler-v3.json`
- `public/models/live3d/bomber-v3.glb` und `bomber-v3.json`
- `public/img/live3d/ships/crawler-35-v3.webp`
- `public/img/live3d/ships/bomber-35-v3.webp`

Die alten beschädigten v2-GLBs der beiden Typen wurden durch neue versionierte URLs ersetzt. Die vier bisherigen ersten Schiffe bleiben bytegleich. Die neuen JSON-Berichte enthalten Quellhash, Modellhash, Originalgrenzen, Stichprobenabstand zur Originaloberfläche und den Konturvergleich. `geometry_repair_pending` ist für diese beiden Modelle nun `false`.

## Noch blockiert: drei Originalübertragungen

Solarsatellit, kleiner Transporter und Reaper wurden ebenfalls vom Nutzer hochgeladen. Das Downloadwerkzeug lehnt diese drei Dateien jedoch wegen seiner **32-MiB-Transfergrenze pro Datei** ab. Sie liegen daher noch nicht lokal zur Neuaufbereitung vor. Dies ist keine Freigabe- oder GitHub-API-Frage. Benötigt werden verlustfrei gepackte ZIPs unter 32 MiB, gegebenenfalls auf mehrere Archivteile verteilt.

Die bisher verfügbaren, bereits beschädigten Webfassungen dieser drei Typen bleiben unverändert. Ihre Reparatur bleibt ausdrücklich offen; der abgeschlossene Format-/Ladetest allein ist kein Qualitätsnachweis für deren Oberfläche.

## Reproduktion und Prüfung

Nur in der Entwicklungsumgebung, keine Installation auf dem VPS:

```bash
blender -b -t 3 --python scripts/assets/prepare-ship-preview.py -- Original.glb output-dir --key crawler
bash scripts/assets/compress-ship-preview.sh output-dir/crawler-reduced.glb output-dir/crawler-v3.glb
PLAYWRIGHT_MODULE=/path/to/playwright node scripts/assets/render-ship-portraits.mjs output-dir crawler bomber
```

Für Referenzrenderings kann `SOURCE_MODELS_FILE` auf eine lokale JSON-Datei mit Machine-Key → Originalpfad gesetzt werden. Die Originale werden ausschließlich über einen temporären Loopback-Server gelesen und nicht in `public/` kopiert.

Die Reduktion prüft Modellgrenzen und mindestens 4096 Punkte gegen einen KD-Baum der ursprünglichen Oberfläche. Die maximale Grenzüberschreitung und das 99. Perzentil des Abstandes zur nächsten Originalposition müssen innerhalb von 1 % der ursprünglichen Ausdehnung liegen; der maximale Einzelabstand innerhalb von 2,5 %. Der Browser prüft die nativen Modellgrenzen auch nach der tatsächlichen Meshopt-/GLTF-Decodierung sowie Bildgröße und freien Rand. Diese Prüfungen hätten die früheren weit herausragenden Flächen erkannt.

Abschlussprüfung dieses Teilstands: Rector, Pint, PHPStan und Frontend-Build erfolgreich; 103 JavaScript-Tests sowie die vollständige PHP-Suite mit 1.204 bestandenen Tests und 42 Hinweisen. Chromium prüfte alle 17 Zuordnungen einschließlich Sofortladen, schnellem Wechsel, Refresh, mobiler Darstellung, WebGL-Ausfall und der neuen Kontur-/Randprüfungen. PHP-Tests verwendeten ausschließlich die separaten Datenbanken mit Präfix `ogamex_ship_model_checks_20261118`. Kein Zugriff auf produktive Spielstände und kein VPS-Deployment.
