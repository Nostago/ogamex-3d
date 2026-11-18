# Imperium und Flottenkommando

Stand: 18.11.2026. Eigener Entwicklungsbranch `codex/ogamex-3d-imperium-fleet-command`, aufbauend auf dem fertigen Schiffstand `cdd3d3c9`. Die neuen Funktionen sind vom Schiffsmodell-PR getrennt; kein weiterer PR und kein produktives Deployment wurden ausgeführt.

## Bedienung

- **Spielermenü:** Beim Benutzernamen stehen Einstellungen, die ursprüngliche Oberfläche und Abmelden. Abmelden bleibt ein POST mit CSRF-Schutz. Der externe Wechselbutton entfällt aus der rechten Kopfzeile.
- **Imperium:** Neuer Navigationspunkt nach Planet/Mond. Eigene Planeten und Monde zeigen Rohstoffbestand, Lagerkapazität, Stundenproduktion, Energie und alle dortigen laufenden/geplanten Aufträge. Lager ab 90 % werden markiert; volle Lager und Energiemangel haben Text und kontrastreiche Farben. Planet- und Auftragsbuttons wechseln den ausgewählten Himmelskörper. Periodische Updates ersetzen keine fokussierten Auftragsbuttons und setzen die Scrollposition nicht zurück.
- **Flottenvorlagen:** Vorhandene Vorlagen bleiben erhalten. Neue Vorlagen speichern zusätzlich Mission, Zieltyp, Geschwindigkeit und Haltezeit. Laden begrenzt die Schiffsmengen auf den verfügbaren Bestand; Zielkoordinaten und Fracht bleiben beim Benutzer. Eine geladene Vorlage lässt sich überschreiben oder als neue Vorlage speichern. Der bestehende Grenzwert von zehn Vorlagen bleibt bestehen. Ein Vorlagenaufruf verschickt keine Flotte; die vorhandene Flugprüfung und der Startbutton bleiben erforderlich.
- **3D-Flottenaufstellung:** In der Flottenplanung zunächst Schiffe wählen, dann „Aufstellung anzeigen“. Echte Upload-Modelle zeigen jeweils einen Repräsentanten pro Schiffstyp; die Legende nennt die ausgewählten Mengen. Maximal sechs Typen pro Ansicht, weitere über Vor/Zurück. Drehen mit Ziehen oder Pfeiltasten; Reset setzt die Kamera zurück. Erst beim bewussten Öffnen werden GLBs geladen. Schließen/Seitenwechsel gibt GPU-Ressourcen frei. Bei WebGL-Ausfall bleiben Vorschaubilder und Mengen nutzbar.
- **Kartenereignisse:** Bestätigte Bau-/Forschungsabschlüsse und erhaltene Spionageberichte der letzten fünf Minuten erscheinen an der betreffenden Position und in einer klickbaren Liste. Sichtbare Flotten mit Ankunft in der nächsten Minute heißen ausdrücklich „Ankunft erwartet“; ein Countdown wird nicht als bestätigte Lieferung ausgegeben. Abgebrochene Aufträge sind keine Fertigmeldungen. Berichte über inzwischen anders besetzte oder zerstörte Welten erscheinen nicht erneut. Ereignisanimationen sind abschaltbar, werden lokal gespeichert und respektieren reduzierte Bewegung.

## Daten und Migration

Die Imperiumsprojektion verwendet ausschließlich eigene Welten und die bestehende globale Auftragsliste. Es gibt keine neuen Bau-, Kampf-, Produktions- oder Flugregeln. Die Karte verwendet nur die bereits vom Backend freigegebenen Flotten und Spionageberichte. Es werden keine fremden Flottenbestände abgefragt.

Neue additive Migration: `2026_11_18_200000_add_settings_to_fleet_templates.php`. Sie ergänzt lediglich die nullable JSON-Spalte `settings`; bisherige Namen und Schiffsmengen bleiben erhalten. Der bestehende Test-Updatehelfer führt diese benannte Migration zusätzlich aus. Keine Abhängigkeiten oder Lock-Dateien geändert. Alle 17 Modell- und Bilddateien bleiben bytegleich zum vorherigen Stand.

## Prüfung

- Rector, Pint und PHPStan.
- JavaScript: 105 Tests, einschließlich Lagergrenzen, Ereignisablauf und ungültig gewordener Spionageberichte.
- PHP: eigene Featuretests für Imperium/Planetentrennung, persistente Vorlagen, Fremdzugriff, ungültige Einstellungen/CSRF und bestätigte Kartenereignisse; außerdem vollständige Suite mit **1.209 bestandenen Tests, 42 Hinweisen** (27.417 Assertions).
- `npm run build`, fertige Dateien unter `public/build`.
- `tests/Frontend/live3d-command.browser.mjs`: vollständige gebaute Oberfläche mit Login, zwei Testkolonien, Fokus bei Polling, Planetenwechsel, Vorlagen speichern/laden/überschreiben/löschen, sechs 3D-Typen plus Folgeseite, Rotation, Schließen, mobile Ansicht und WebGL-Ausfall. Es werden keine Bau- oder Flottenbefehle ausgelöst. Nur separate Testdatenbanken (`ogamex_ship_model_checks_20261118*` und `ogamex_ship_models_ui_20261118`).

Mit Codex umgesetzt. Abschluss: Alle Prüfungen erfolgreich. Der Browserdurchlauf bestätigt alle genannten Abläufe ohne JavaScript-Fehler; 20 gezielte PHP-Tests für neue Funktionen und bisherige Vorlagen bestehen zusätzlich. Bildschirmaufnahmen wurden in der Cloud unter `/workspace/ogamex-cloud/command-artifacts/` gespeichert.
