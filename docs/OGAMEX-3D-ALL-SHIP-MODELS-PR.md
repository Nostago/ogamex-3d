Die Schiffsdetailseiten zeigen jetzt alle 17 Upload-Modelle automatisch beim Öffnen oder Auswählen eines Schiffes. Die 13 zusätzlichen GLBs, WebP-Vorschaubilder und Bearbeitungsberichte sind vollständig eingebunden. Crawler, Bomber, Reaper, Solarsatellit und kleiner Transporter wurden nach dem Befund beschädigter Geometrie aus den Originalen neu reduziert und visuell verglichen.

Alle neuen Miniaturen zeigen das ganze Modell mit wenig Leerraum. Im Baukatalog haben sämtliche Schiffe dieselben Bildfelder wie leichter und schwerer Jäger: 96×72 px, mobil 72×54 px. Der Browser prüft die Größen auch ohne optionale Modellklasse. Die 13 GLBs benötigen zusammen 9,93 MiB statt 33,22 MiB. Die bisherigen vier Modelle, Bilder und Berichte bleiben per SHA-256 unverändert.

Der Lader schützt schnelle Auswahlwechsel, begrenzt den Cache auf vier Modelle und gibt GPU-Ressourcen frei. Während des Ladens oder bei WebGL-Ausfall bleibt das passende Bild sichtbar. Katalog und Flottenlisten laden keine GLBs.

Der Branch enthält den gemeldeten bisherigen UI-Stand `2563ce3c`; dessen Händler-/Notizenansicht und Auftragszeitanzeige bleiben erhalten. Gemeinsame Build-Dateien vermeiden die vorherigen Konflikte beim Git-Update der Testinstallation.

Validierung:

- 103 JavaScript-Tests bestanden; vollständige PHP-Suite: 1.204 bestanden, 42 Hinweise; separate Entwicklungsdatenbanken.
- Rector, Pint, PHPStan und Frontend-Build erfolgreich; Build-Dateien enthalten.
- Chromium prüft alle 17 Modelle in Komponente und vollständiger gebauter Spieloberfläche: automatischer Erstaufruf, Refresh, Wechsel, Drehung, mobile Darstellung, Bildfelder, GPU-Ressourcen und Fallback.
- Alle 13 neuen Miniaturen: Bildfüllung und freier Rand. Fünf reparierte Modelle: Quellhashes, tatsächliche decodierte Grenzen und Original-Konturvergleich (99,10–99,76 %).

Keine Spielregeln, Spielstände, Datenbankschemata oder Abhängigkeiten verändert. Kein produktives Deployment und kein Merge in main.

Details: [Integrationsdokumentation](docs/OGAMEX-3D-ALL-SHIP-MODELS.md) und [Neuaufbereitung](docs/OGAMEX-3D-SHIP-REPAIR.md). Mit Codex umgesetzt und geprüft.
