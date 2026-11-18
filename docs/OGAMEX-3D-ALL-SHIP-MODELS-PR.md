**Crawler und Bomber sind aus den neu bereitgestellten Originalen neu reduziert und als v3 eingebunden.** Keine herausragenden Flächen; vollständige, deutlich größere Miniaturen. Beide GLBs bleiben unter 1 MB. Originalvergleich und Regressionstests: [Neuaufbereitung](docs/OGAMEX-3D-SHIP-REPAIR.md).

**Noch offen:** Solarsatellit, Reaper und kleiner Transporter. Ihre Originaluploads überschreiten die 32-MiB-Transfergrenze der Arbeitsumgebung; benötigt werden ZIP-/Teilarchive.

Die Schiffsdetailseiten zeigen alle 17 Upload-Modelle automatisch beim Öffnen bzw. Auswählen eines Schiffes, ohne Bildklick. Die 13 zusätzlichen GLBs, WebP-Vorschaubilder und JSON-Berichte sind vollständig enthalten; ihre Modelldateien belegen nach der Kompression zusammen 10,23 MiB. Die bisherigen vier Modelle und Bilder sind per SHA-256 unverändert.

Der Modelllader behebt einen `ReferenceError`, schützt schnelle Auswahlwechsel und begrenzt den Cache auf vier dekodierte Modelle. Während des Ladens und bei WebGL-Ausfall bleibt das passende Bild sichtbar. Alle 17 Thumbnail-Zuordnungen sind auch serverseitig registriert; Bildlisten lösen keine GLB-Downloads aus.

Der Branch enthält außerdem den vom Nutzer gemeldeten bisherigen UI-Stand `2563ce3c`. Dessen Händler-/Notizenansicht und Auftragszeitanzeige bleiben erhalten. Konflikte mit den zuvor separat gebauten Frontend-Dateien wurden durch einen gemeinsamen Neubau gelöst, damit der bestehende Git-Updatehelfer die Modelle übernehmen kann.

Validierung:

- JavaScript: 103 Tests bestanden, keine Fehler oder übersprungenen Tests.
- Vollständige PHP-Suite: 1.204 Tests bestanden, 42 Hinweise; separate Testdatenbanken.
- Rector, Pint, PHPStan und Frontend-Build erfolgreich; Build-Dateien enthalten.
- Chromium: alle 17 Modelle mit echtem GLB-Decoding in der Vorschau-Komponente geprüft. Automatischer Erstaufruf, Refresh, schnelle Wechsel, Drehung, mobile Darstellung, stabile GPU-Ressourcenzahlen und WebGL-Fallback geprüft. Flottenansicht lädt ausschließlich Vorschaubilder. Todesstern, Solarsatellit und Spionagesonde zusätzlich visuell geprüft.

Keine bestehenden Spielstände, Spielregeln, Datenbankschemata oder Abhängigkeiten verändert. Kein produktives Deployment und kein Merge.

Details und Dateizuordnungen: [Integrationsdokumentation](docs/OGAMEX-3D-ALL-SHIP-MODELS.md). Mit Codex umgesetzt und geprüft.
