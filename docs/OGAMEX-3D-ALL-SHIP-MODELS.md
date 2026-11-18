# Alle 13 neuen GLB-Schiffsmodelle – Integration mit Sofortladen

## Aktuelle Qualitätskorrektur

Die Integration und Qualitätskorrektur sind vollständig. **Crawler, Bomber, Reaper, Solarsatellit und kleiner Transporter sind aus den Originalen repariert und als v3 eingebunden.** Alle 13 zusätzlichen Schiffe haben größere vollständige Miniaturen; alle 17 Katalog-Bildfelder entsprechen leichtem und schwerem Jäger (96×72 px, mobil 72×54 px). Die aktuellen 13 GLBs benötigen zusammen 10.408.516 Bytes. Die bisherigen vier Modelle, Bilder und Berichte bleiben bytegleich. Details: [Neuaufbereitung und Bildausschnitt](OGAMEX-3D-SHIP-REPAIR.md); frühere Ladezeitmessungen: [Kompression](OGAMEX-3D-SHIP-QUALITY.md).

Die nachfolgenden Angaben dokumentieren die ursprüngliche Integration; aktuelle Dateipfade stehen in `shipAssets.js` und `Live3dArtworkService.php`.

## Stand der ursprünglichen Integration vom 18.11.2026

Die ZIP `OGameX-3D-13-Schiffsmodelle-Web.zip` wurde importiert. Alle **39 benötigten Dateien** sind im Branch enthalten: 13 GLBs, 13 JSON-Bearbeitungsberichte und 13 WebP-Vorschaubilder. Die zusätzliche Testgrafik aus der ZIP und enthaltene Hilfsskripte gehören nicht zu den Spielassets und wurden nicht übernommen.

ZIP-SHA-256: `d4fb7916a75615c184acabe92dfafc1a0bd44e51c3f7b7c9e5c4ef5f72fb732a`.

Die 13 GLBs belegen zusammen **34.837.244 Bytes (33,22 MiB)** statt ursprünglich 463.857.308 Bytes. Einzeldateien liegen zwischen 612.936 und 4.230.876 Bytes, haben maximal 65.000 Dreiecke und eingebettete JPEG-/PNG-Texturen bis 1024 px. Struktur, Dreiecksindizes, tatsächliche Texturgrößen und Übereinstimmung mit den Bearbeitungsberichten wurden geprüft. Keine verpflichtenden externen Kompressionsdecoder für die neuen Modelle.

Die ursprünglichen vier Modelle (`light_fighter`, `heavy_fighter`, `large_cargo`, `colony_ship`) behalten ihre bisherigen Pfade. Ihre vier GLBs, vier JSON-Berichte und vier WebP-Bilder wurden per SHA-256 als unverändert bestätigt. Der Branch wurde zunächst auf `codex/ogamex-3d-message-selection` erstellt und anschließend mit dem gemeldeten Serverstand `2563ce3c698c128e90d73bf3f51b2378d8018a94` zusammengeführt. Dessen Händler-/Notizenoberfläche und neue Auftragszeitanzeige bleiben dadurch erhalten.

## Übernahme auf der bestehenden Testinstallation

Der Nutzer meldete als Server-HEAD `ea3c36b1` auf `test/live-3d-20261113T190640Z`, einen lokalen Merge des UI-Stands `2563ce3c`. Der neue Modellcommit war dort nicht enthalten; Kreuzer-GLB und Vorschaubild fehlten. `public/hot` existierte ebenfalls nicht. Ein vorheriges `git fetch` hatte die Assets lediglich in Git heruntergeladen und noch nicht in das laufende Arbeitsverzeichnis übernommen.

Die lokale Prüfung des Zusammenführens von `2563ce3c` mit dem ursprünglichen Modellabschluss `e09e07a7` zeigte Konflikte ausschließlich in generierten Frontend-Dateien und im Build-Manifest. Der bisherige Updatehelfer hätte bei seiner Konfliktprüfung vor dem Merge abgebrochen. Der Modellbranch enthält deshalb nun den bekannten Serverstand; das Frontend wurde aus den gemeinsam übernommenen Quellen vollständig neu gebaut. Der private Server-Mergecommit selbst liegt nicht in der Cloud vor; zusätzliche lokale Änderungen werden weiterhin vom Helfer geschützt.

Der bestehende Updateweg benötigt weder `gh` noch neue Pakete auf dem VPS:

```bash
cd /home/ogamedev/OGameX
git fetch https://github.com/Nostago/ogamex-3d.git codex/ogamex-3d-all-ship-models
release=$(git rev-parse FETCH_HEAD)
git show "$release:scripts/codex/update-test-interface.sh" > /tmp/ogamex-3d-update.sh
bash /tmp/ogamex-3d-update.sh "$release"
```

Für einen reproduzierbaren Stand den vollständig veröffentlichten Commit aus der Übergabe als `release` verwenden. Der unveränderte Helfer sichert Code und Build, prüft lokale Änderungen und Mergekonflikte, übernimmt die Dateien und leert Route-/View-Caches. Er enthält weiterhin die bereits früher verwendeten benannten additiven Migrationen sowie Bot-Auffüllung und Cron-Einrichtung. Er setzt keine Spieltabellen zurück. Dieser Ablauf wurde nicht von der Cloud aus auf dem VPS ausgeführt; die SSH-Befehle richten sich ausschließlich an die vorhandene Testinstallation.

## Verhalten der Oberfläche

- **17 von 17 Schiffstypen** verwenden das zugeordnete Upload-Modell. Das Öffnen der Schiffsseite bzw. Auswählen eines Schiffes startet die 3D-Vorschau automatisch, ohne Bildklick. Während des Ladens bleibt das passende Vorschaubild sichtbar.
- Der Modelllader liest seine Asset-Metadaten selbst; der zuvor vorhandene `ReferenceError` ist behoben. Veraltete asynchrone Auswahlen können die neue Auswahl nicht überschreiben oder nach einem Wechsel verspätet einen neuen Download starten.
- Der gemeinsame Cache hält höchstens vier fertig dekodierte Modelle. Sichtbare Vorschauen besitzen getrennte GPU-Ressourcen und geben diese beim Wechsel frei. Fehler eines einzelnen Modells sperren andere Modelle nicht. Bei WebGL-Ausfall bleibt das Bild nutzbar.
- Modelle sind frei drehbar; die Kamera orientiert sich an ihren tatsächlichen Abmessungen. Todesstern, Solarsatellit und Spionagesonde wurden zusätzlich anhand der Browseraufnahmen visuell geprüft.
- JS- und PHP-Artwork-Resolver verwenden alle 17 Thumbnail-Zuordnungen. Schiffskatalog, Flottenauswahl und bereits angebundene Auftragslisten bleiben Bildansichten; diese Listen laden keine GLBs. Auch Crawler und Solarsatellit sind registriert.
- Keine Änderungen an Kosten, Flotten, Produktionsregeln oder Spielerdaten. Keine neuen Migrationen oder Abhängigkeitsänderungen. **Kein produktives Deployment.**

## Validierung

- `node --test tests/Frontend/*.test.mjs`: **103 bestanden, 0 fehlgeschlagen, 0 übersprungen**. Die Assettests prüfen alle 17 Zuordnungen, bestehende Meshopt-Modelle sowie neue GLBs, Indizes, WebP-Bilder, Ursprungs-Hashes und passende Dateigrößen/Dreieckszahlen der JSON-Berichte.
- `npm run build`: erfolgreich. Kompilierte Dateien und Manifest sind im Branch enthalten.
- `composer run rector`, `composer run cs`, `composer run stan`: erfolgreich.
- Vollständiges `composer run tests` nach dem UI-Abgleich (mit `COMPOSER_PROCESS_TIMEOUT=0`): **1.204 bestanden, 42 Hinweise, 27.294 Assertions**. Eine veraltete Händler-UI-Erwartung im Expeditionstest wurde bereits im vorbereitenden Commit an die vorhandene Oberfläche angepasst; keine Spielmechanik geändert.
- `tests/Frontend/all-ship-models.browser.mjs`: **17/17 erfolgreich** mit echtem GLB-Decoding in Chromium. Geprüft: Sofortladen ohne Bildklick, Refresh, Drehen, schnelle Wechsel, stabile GPU-Ressourcenzahlen, mobile Breite, WebGL-Ausfall und Downloads ausschließlich ausgewählter Schiffe.
- `tests/Frontend/all-ship-models.ingame.browser.mjs`: zusätzlicher Check derselben 17 Modelle in der vollständigen gebauten Spieloberfläche mit Login, passenden Katalog-/Flottenbildern und automatischem Erstaufruf/Refresh. Benötigt `LIVE_BASE_URL`, `LIVE_ACCOUNT_FILE` und Playwright; ausschließlich mit einem separaten Entwicklungskonto ausführen. Es werden keine Bau- oder Flottenaufträge ausgelöst.

PHP-Tests verwendeten ausschließlich Datenbanken mit Präfix `ogamex_ship_model_checks_20261118`; der Spieloberflächencheck verwendete `ogamex_ship_models_ui_20261118`. Bestehende Accounts und Spielstände wurden nicht verändert.

## Pull Request #3

Die vollständigen Assets, Implementierung und Testergebnisse gehören zum bestehenden Branch `codex/ogamex-3d-all-ship-models` und damit zu PR #3. Die frühere Markierung „Asset-ZIP fehlt“ ist fachlich erledigt.

Das Bearbeiten von PR-Beschreibung und Draft-Status ist in dieser Umgebung weiterhin blockiert: Verbindungen zu `api.github.com` scheitern bereits am Cloud-Proxy mit HTTP 403 (auch außerhalb des normalen Command-Sandboxes). Git-Zugriff auf den Branch funktioniert. Eine gewünschte fertige PR-Beschreibung liegt in `docs/OGAMEX-3D-ALL-SHIP-MODELS-PR.md`; eine Aktualisierung des Draft-Status kann daher nicht bestätigt werden.

## Aktuelle Zuordnung neuer Assets

| OGameX-Machine-Key | Neue Modelldatei | Neues Vorschaubild |
|---|---|---|
| `bomber` | `public/models/live3d/bomber-v3.glb` | `public/img/live3d/ships/bomber-35-v3.webp` |
| `crawler` | `public/models/live3d/crawler-v3.glb` | `public/img/live3d/ships/crawler-35-v3.webp` |
| `small_cargo` | `public/models/live3d/small_cargo-v3.glb` | `public/img/live3d/ships/small_cargo-35-v3.webp` |
| `cruiser` | `public/models/live3d/cruiser-v2.glb` | `public/img/live3d/ships/cruiser-35-v3.webp` |
| `pathfinder` | `public/models/live3d/pathfinder-v2.glb` | `public/img/live3d/ships/pathfinder-35-v2.webp` |
| `reaper` | `public/models/live3d/reaper-v3.glb` | `public/img/live3d/ships/reaper-35-v3.webp` |
| `recycler` | `public/models/live3d/recycler-v2.glb` | `public/img/live3d/ships/recycler-35-v3.webp` |
| `battlecruiser` | `public/models/live3d/battlecruiser-v2.glb` | `public/img/live3d/ships/battlecruiser-35-v3.webp` |
| `battle_ship` | `public/models/live3d/battle_ship-v2.glb` | `public/img/live3d/ships/battle_ship-35-v3.webp` |
| `solar_satellite` | `public/models/live3d/solar_satellite-v3.glb` | `public/img/live3d/ships/solar_satellite-35-v3.webp` |
| `espionage_probe` | `public/models/live3d/espionage_probe-v2.glb` | `public/img/live3d/ships/espionage_probe-35-v2.webp` |
| `deathstar` | `public/models/live3d/deathstar-v2.glb` | `public/img/live3d/ships/deathstar-35-v3.webp` |
| `destroyer` | `public/models/live3d/destroyer-v2.glb` | `public/img/live3d/ships/destroyer-35-v3.webp` |

Datei `Zerstörer.glb` trug eine beschädigt decodierte ZIP-Kodierung; Zuordnung über Unicode-normalisierten Namen `destroyer` geprüft.

## Vollständiger Codex-Abschlussauftrag (ohne weitere Nutzerfreigaben für Entwicklungsarbeit)

1. ZIP `OGameX-3D-13-Schiffsmodelle-Web.zip` aus dieser Unterhaltung als Entwicklungsasset empfangen und `ogamex-3d-ships/public/` ins Repo übernehmen. Originaldateien nicht überschreiben; erste vier Schiffe bleiben.
2. Alle neuen Modelle/JSONs/WebPs vollständig einchecken. Bei GitHub-Dateigrößen oder Artefaktfragen auf standardmäßiges Git-Repository bzw. externe Assets mit versionierter URL zurückgreifen; hier ist jedes GLB nur ca. 0,6–4,3 MB.
3. Den bestehenden JS-Code des Branchs validieren: kein Modellnetzwerkaufruf für nicht ausgewählte Schiffe, Laden startet *beim Öffnen/Auswählen des Schiffes* (auch initiale Auswahl beim Eintritt in den Menüpunkt Schiffe), 3D-Canvas erscheint ohne Klick, vorheriges Bild als Fallback bis GLB fertig ist. Bei schnellem Wechsel dürfen alte Promise-Ergebnisse nicht das neue Schiff überschreiben.
4. Das 3D-Modell muss frei drehbar bleiben und die vorhandene Detailvorschau-Kamera an die tatsächliche Bounding Box angepasst sein; besonders Todesstern, Solarsatellit sowie dünne/kleine Objekte manuell prüfen.
5. Bilder in Schiffskatalog, Flottenlisten und anderen bereits benutzten Thumbnail-Bereichen konsistent verwenden, wo die bestehenden Asset-Resolver darauf zurückgreifen; keine erzwungenen 3D-Downloads in Listen, Galaxie oder Orbit.
6. Für die neuen Dateinamen saubere GLB-/WebP-/Mapping-Unit-Tests, Browser-Ladeprobe einschließlich Erstaufruf, Refresh, schnellem Wechsel, GPU-Ausfall, mobil und Ressourcennutzung ergänzen. `npm run build` und relevante OGameX-PHP-/JS-Tests erfolgreich absolvieren.
7. Keine neuen Datenbankmigrationen, keine Eingriffe in Live-Accounts oder Spielmechanik. Bei echtem VPS-Update zunächst Backup und ein gesondert freigegebener sicherer Deployment-Ablauf.
8. Erst nach vollständiger Übertragung von Dateien und erfolgreichem Test diesen Draft-PR als fertig melden. Bis dahin ausdrücklich als **unvollständig – Asset ZIP noch zu importieren** kennzeichnen.

**Ziel: 17 von 17 Modellzuordnungen, jedes ausgewählte Schiff sofort beim Öffnen seiner Detailseite als echtes GLB, mit sichtbarem Fallback während des Ladens.**
