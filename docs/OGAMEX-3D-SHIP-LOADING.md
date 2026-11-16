# Kleinere Schiffsmodelle und Ladezeitmessung

Branch: `codex/ogamex-3d-ship-loading`. Baut auf der Schiffsmodell-Integration `299d377f3b88b7193a2736e25ac418df9f3abd44` auf. Der Hauptbranch bleibt unverändert.

## Dateigrößen und Qualität

| Schiff | Vorher | Jetzt | Ersparnis | Dreiecke vorher und jetzt |
| --- | ---: | ---: | ---: | ---: |
| Leichter Jäger | 1.820.228 Bytes | 672.036 Bytes | 63,1 % | 49.840 |
| Großer Transporter | 1.894.440 Bytes | 579.696 Bytes | 69,4 % | 49.257 |
| Kolonieschiff | 1.954.084 Bytes | 775.056 Bytes | 60,3 % | 47.991 |
| Schwerer Jäger | 1.815.592 Bytes | 644.704 Bytes | 64,5 % | 49.052 |

Alle vier GLBs bleiben unter einer Million Bytes. Keine weitere Polygonreduktion: Die bisherigen detaillierten Rümpfe werden mit Meshopt komprimiert. Positions- und Normalenwerte werden mit hoher Genauigkeit quantisiert. Die eingebettete Farbtextur bleibt 1024×1024 Pixel groß und wird als WebP mit Qualität 85 gespeichert. UVs außerhalb von 0–1 werden bewusst nicht quantisiert. Der Vergleich von vorher/nachher im selben WebGL-Vorschaufenster zeigt praktisch unveränderte Details; die Komprimierung ist wegen Quantisierung und Texturkonvertierung nicht mathematisch verlustfrei.

Die kleinen transparenten 35°-Vorschaubilder bleiben unverändert. Sie werden weiterhin in Listen, Flotten und Aufträgen benutzt. Die größeren GLBs werden erst in der Bauvorschau geladen und innerhalb derselben Seitensitzung wiederverwendet. Kamera, Produktionsanimation und Bildersatz bei WebGL-Ausfall bleiben erhalten.

## Decoder und Auslieferung

Die GLBs verwenden `EXT_meshopt_compression`, `KHR_mesh_quantization` und `EXT_texture_webp`. Der vorhandene GLTFLoader erhält den zugehörigen Meshopt-Decoder. Er wird zusammen mit dem verzögert geladenen Schiffsmodul ausgeliefert, enthält seine WebAssembly direkt und benötigt weder CDN noch zusätzlichen WASM-Aufruf. Unveränderte Quelldatei aus `meshoptimizer@1.2.0`, MIT-Lizenz unter `resources/js/prototype3d/vendor/meshopt/`.

Neue Modelladressen und Revisionen (`*-v2.glb`, `uploaded-*-v2`) verhindern, dass Browser weiterhin die alten großen GLBs verwenden. Die ungenutzten `*-v1.glb`-Dateien werden aus der aktuellen Auslieferung entfernt. Die WebP-Vorschaubilder behalten ihre bisherigen Adressen.

Auf dem VPS sind keine neuen Pakete oder Konfigurationsänderungen nötig. Das gebaute Frontend ist enthalten. Spielregeln und Datenbankschema bleiben unverändert.

## Gemessene Ladezeiten

Vergleich mit Chromium, Software-WebGL, leerem Browsercache, 80 ms Netzwerklatenz und simulierten 10 Mbit/s. Gleiche Kameraposition und Vorschaugröße 512×290. Die Messung isoliert die tatsächliche Vorschau mit den gebauten Produktionsmodulen; Login und sonstige Spielanfragen werden nicht mitgemessen.

| Schiff | Download vorher → jetzt | Sichtbare Vorschau vorher → jetzt |
| --- | ---: | ---: |
| Leichter Jäger | 1,67 → 0,66 s | 2,12 → 1,39 s |
| Großer Transporter | 1,91 → 0,58 s | 2,04 → 0,73 s |
| Kolonieschiff | 1,69 → 0,76 s | 1,89 → 0,99 s |
| Schwerer Jäger | 1,70 → 0,71 s | 1,82 → 1,03 s |

Die Vorschauzeiten enthalten Modell-Download, Decodierung, Kameraanpassung und erste Darstellung. Beim ersten Schiff kommt der initiale Import der 3D-Module und die Renderer-Erzeugung hinzu: vorher 0,83 s, jetzt 0,84 s. Erneutes Auswählen des bereits geladenen Leichten Jägers: ca. 0,04 s. Die Werte sind eine lokale Vergleichsmessung und keine Garantie für VPS, Browser oder Verbindung des Nutzers. Die dort gemeldeten zehn Sekunden wurden nicht direkt gemessen.

Messdaten: [vorher](benchmarks/ship-loading-before.json), [jetzt](benchmarks/ship-loading-after.json).

Reproduzierbare Messung bei laufender Entwicklungsinstallation, ohne Spielkonto oder Datenbankänderungen:

```bash
PLAYWRIGHT_MODULE=/path/to/playwright \
ARTIFACT_DIR=/tmp/ship-loading LABEL=measurement \
DOWNLOAD_MBIT=10 LATENCY_MS=80 \
node tests/Frontend/ship-loading.benchmark.mjs
```

Optional `LIVE_BASE_URL` setzen. Die Messung erzeugt JSON und vier Vergleichsbilder. Für vorher/nachher jeweils denselben Aufbau und dieselbe Verbindungseinstellung verwenden. Software-WebGL ist langsamer und variabler als viele reale GPUs; es gibt deshalb keine feste Zeitgrenze im Test.

## Reproduktion und Tests

Nur für die Entwicklung, nicht auf dem Spielserver:

```bash
bash scripts/assets/compress-ship-preview.sh source-v1.glb target-v2.glb
```

Das Skript verwendet die gepinnte CLI `@gltf-transform/cli@4.5.1`. Erst die Textur umwandeln, danach Meshopt anwenden; eine nachträgliche Neuschreibung mit einem Texturkommando würde die Geometrie erneut exportieren. Die vorherige GLB kann für eine Wiederholung aus Commit `299d377f3b88b7193a2736e25ac418df9f3abd44` entnommen werden. Die Berichte `public/models/live3d/*-v2.json` enthalten Original-SHA, vorherige und neue Dateigröße sowie Dreieckszahlen.

Node-Tests decodieren die tatsächlich ausgelieferten Meshopt-Buffer mit demselben Decoder wie die Anwendung, prüfen sämtliche Dreiecksindizes, Texturformat, eingebettete Ressourcen, unveränderte Dreieckszahl und die Größenbegrenzung. Die bisherigen Browsertests prüfen echte Modellvorschau, Rotation, Ressourcenfreigabe, einmaligen Download, Fertigungsanimation, mobile Kameraausschnitte und dauerhaften Bildersatz bei Kontextverlust. Backendtests prüfen weiterhin die einheitlichen kleinen Bilder und unveränderte Original-Spielobjekte.
