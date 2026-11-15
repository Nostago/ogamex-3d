# Planeten, Bodentransporte und einheitliche Seitenwechsel

Branch: `codex/ogamex-3d-planet-navigation-fixes`, aufbauend auf dem zuletzt ausgelieferten Flotten-/Bot-Stand. Hauptbranch, OGameX-Spielregeln, Abhängigkeiten, Lockfiles und die bestehende Reverb-Anpassung bleiben unverändert.

## Änderungen

- Jeder Planet erhält eine eigene, aus seiner ID dauerhaft abgeleitete Oberflächenfarbe. Neu laden oder zwischen Planeten wechseln würfelt die Farbe nicht erneut. Die Live-Ansicht lädt weder den gemeinsamen Erdatlas noch Wolken-/Kontinentbilder. Die Kugel wird direkt beleuchtet; beim Nahzoom kann daher keine Bildtextur verschwimmen. Der Kompatibilitätsrenderer verwendet dieselbe Farbe.
- Die Gebäude der Live-Kolonie stehen ohne die erhöhten Modellplattformen auf abgeflachten Flächen in Planetenfarbe. Deren Ränder gehen in die Kugel über. Die detaillierten Katalogmodelle bleiben erhalten.
- Kleine gesicherte Transportkisten ersetzen die Fahrzeuge. Straßen und Pakete verwenden dieselbe Höhenkurve, einschließlich der abgeflachten Bauflächen. Die Wege führen zu den Grundstücksrändern statt durch Gebäudezentren. Geometrie und Objektzahl bleiben begrenzt; reduzierte Bewegung wird berücksichtigt.
- Freie Galaxiepositionen bieten in „Weitere Aktionen“ ausdrücklich **Neue Kolonie gründen** an. Verfügbarkeit und Sperrgründe kommen vom Original. Die Planung übernimmt die Zielkoordinaten und wählt ein verfügbares Kolonieschiff vor. Erst der bestätigte Flottenstart versendet ein Schiff; die Kolonie entsteht durch die ursprüngliche Kolonisationsmission nach der Ankunft.
- Originalbereiche wie Allianz, Nachrichten, Händler und Optionen erhalten das neue Stylesheet bereits im HTML-Kopf, vor dem ersten Rendern. Während einer Navigation zeigt die Oberfläche einen Ladezustand; alte Dokumente bleiben verdeckt. Verzögerte Antworten wechseln weder den aktuellen Bereich noch den gewählten Planeten zurück. Wiederholen ist bei Ladefehlern möglich.
- Allianz- und Nachrichtenreiter verwenden Textschaltflächen und die aktuellen Formularstile. Der irrtümlich aktivierte alte Demo-Nachrichtenrahmen entfällt. Die Originalformulare und ihr JavaScript laufen weiterhin in einem isolierten Inhaltsfenster; es wurde keine zweite Allianz-/Nachrichtenlogik geschrieben. Normale OGameX-Seiten ohne `ui=live3d` bleiben unverändert.

## Bestehende Testinstallation aktualisieren

Auf dem bestehenden Testbranch auf dem OGameX-Rechner:

```bash
cd /home/ogamedev/OGameX
git fetch https://github.com/Nostago/ogamex-3d.git codex/ogamex-3d-planet-navigation-fixes
release=$(git rev-parse FETCH_HEAD)
git show "$release:scripts/codex/update-test-interface.sh" > /tmp/ogamex-3d-update.sh
bash /tmp/ogamex-3d-update.sh "$release"
```

Für einen festgelegten Stand den veröffentlichten vollständigen Commit aus der Übergabe verwenden. Danach `/play-3d` neu laden. Der vorhandene Helfer sichert den bisherigen Stand und führt den Merge auf dem Testbranch aus. Es sind keine neue Migration, Neuinstallation oder Dienstneustarts nötig; bereits bekannte additive Migrationen erkennt Laravel als ausgeführt. Kompilierte Browserdateien werden mitgeliefert.

## Prüfung

```bash
sh scripts/codex/compose.sh exec -T ogamex-app composer run rector
sh scripts/codex/compose.sh exec -T ogamex-app composer run cs
sh scripts/codex/compose.sh exec -T ogamex-app composer run stan
sh scripts/codex/compose.sh exec -T ogamex-app composer run tests -- --filter='Live3d|Commerce'
node --test tests/Frontend/Live3d.test.mjs tests/Frontend/BuildingModels.test.mjs
umask 022
npm run build
```

Der neue Browserablauf `tests/Frontend/live3d-planet-navigation.browser.mjs` verwendet einen isolierten Testaccount mit zwei Planeten und Kolonieschiff. Er prüft Farben nach Wechsel/Neuladen, fehlende Erdatlas-Anfragen, Nahzoom, Bodentransporte, Kolonisationsplanung ohne unbeabsichtigten Start, langsame und schnelle Navigation sowie Darstellung ohne JavaScript. Der vorhandene Shop-/Offiziersablauf und die Kompatibilitätsansicht dienen zusätzlich als Regressionstests.

Ergebnis: Rector, Pint und PHPStan bestanden; 33 gezielte Backendtests (5.452 Assertions) und 13 JavaScript-/Geometrietests bestanden. Der Browser prüfte zusätzlich den neuen Ablauf, den ursprünglichen Shop-/Händler-/Offiziersablauf und die Kompatibilitätsansicht bei fehlender GPU beziehungsweise fehlendem 3D-Modul. Testkonten wurden nach der Prüfung entfernt.
