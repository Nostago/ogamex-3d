# Alle 13 neuen GLB-Schiffsmodelle – Integration mit Sofortladen

## Abschlussprüfung vom 18.11.2026: unvollständig – Asset-ZIP noch zu importieren

Die unten beschriebene ZIP ist in dieser Codex-Sitzung nicht angehängt und liegt weder im Repository noch in den verfügbaren Upload-Verzeichnissen. Es fehlen weiterhin **39 Dateien: 13 GLBs, 13 JSON-Berichte und 13 WebP-Vorschaubilder**. Die früher genannten Optimierungsergebnisse beschreiben die vorherige Verarbeitung; sie konnten für die fehlenden Dateien hier nicht erneut geprüft werden. PR #3 bleibt daher unvollständig.

Bereits im Branch ergänzt und geprüft:

- Alle 17 Thumbnail-Zuordnungen sind auch im PHP-Artwork-Resolver registriert. Die ursprünglichen vier GLBs, vier Berichte und vier WebPs sind per SHA-256 unverändert.
- Ein `ReferenceError` im Modelllader ist behoben: `loadShipPreview()` liest die Asset-Metadaten nun selbst. Die Auswahl öffnet die echte GLB-Vorschau automatisch und behält das Bild während des Ladens als Fallback.
- Veraltete asynchrone Auswahlen starten nach einem Schiffswechsel keinen verspäteten Download. Der gemeinsame Cache hält höchstens vier fertig dekodierte Modelle. Ein fehlendes Modell deaktiviert nicht die Vorschau anderer Schiffe.
- Der Browsercheck `tests/Frontend/all-ship-models.browser.mjs` prüft standardmäßig alle 17 Modelle. Mit expliziter Auswahl der vier vorhandenen Modelle bestanden Sofortladen ohne Bildklick, Refresh, Tastaturdrehung, schnelle Wechsel, stabile GPU-Ressourcenzahlen, mobile Breite, WebGL-Ausfall und Downloads ausschließlich ausgewählter Schiffe. Dies ist ein Test der echten Vorschau-Komponente in Chromium; die vollständige Spieloberfläche mit allen 17 Modellen bleibt nach dem ZIP-Import zu prüfen.
- Frontend-Build, Rector, Pint und PHPStan erfolgreich. Vollständige PHP-Suite: **1.201 bestanden, 42 Hinweise, 27.181 Assertions**. Eine veraltete Händler-UI-Erwartung im Expeditionstest wurde an die bereits vorhandene Oberfläche angepasst; keine Spielmechanik geändert.
- JavaScript-Suite: **90 bestanden, 13 fehlgeschlagen**. Die 13 Fehler sind fehlende neue GLB-Dateien (`ENOENT`); diese Tests werden bewusst nicht übersprungen. GLB-Struktur, Indizes, Berichte und WebP-Dateien werden nach dem Import geprüft.
- PHP-Tests liefen ausschließlich in separaten Datenbanken mit dem Präfix `ogamex_ship_model_checks_20261118`. Keine bestehenden Spielstände verändert, keine neuen Migrationen oder Abhängigkeitsänderungen, kein produktives Deployment.

Nach Bereitstellung von `OGameX-3D-13-Schiffsmodelle-Web.zip` die 39 Dateien wie unten beschrieben importieren und die vollständigen Asset- und Browserchecks erneut ausführen. Der GitHub-API-Zugriff auf PR #3 wird in dieser Umgebung mit HTTP 403 abgewiesen; der Git-Zugriff auf den Branch funktioniert.

## Ziel und Herkunft

Nutzer hat am 18.11.2026 das ZIP `Archiv(2).zip` mit 13 weiteren GLB-Schiffsmodellen hochgeladen und **ausdrücklich festgelegt**: Das 3D-Modell soll automatisch beim Öffnen der Detailansicht des jeweiligen Schiffes geladen werden, nicht erst nach einem Klick auf das Bild.

Basierend auf `codex/ogamex-3d-message-selection` (mit den bisherigen vier optimierten Modellen). Dieses Feature ersetzt **nur die Darstellung**, niemals OGameX-Kosten, Flotten, Spielerdaten oder Produktionsregeln.

## Übergabestand vor dieser Abschlussprüfung

- 13 Modelle wurden aus dem Upload lokal gelesen, auf jeweils maximal ungefähr 65.000 Dreiecke reduziert (falls zuvor größer), und eingebettete Texturen auf maximal 1024 px begrenzt. Ihre zusammengefasste GLB-Größe sank von **463.857.308 Bytes auf 34.837.244 Bytes** (ca. 92,5 % Reduktion).
- Pro Modell wurde ein JPEG/PNG-texturiertes Standard-GLB ohne verpflichtende externe Kompressions-Extensions erstellt. Zusätzlich entstanden jeweils ein transparentfreies WebP-Vorschaubild im OGameX-Weltraum-Stil und ein JSON-Bearbeitungsbericht mit ursprünglichem SHA-256.
- **Die 13 binären Webdateien und Vorschaubilder liegen noch NICHT auf GitHub.** Der erzeugte Upload als ZIP wurde dem Benutzer im Chat angeboten: `OGameX-3D-13-Schiffsmodelle-Web.zip` (etwa 25 MB). Dieses ZIP muss **zuerst in die Codex-Arbeitsumgebung übertragen und seine `public/`-Dateien müssen dem Branch hinzugefügt werden**, bevor deployt wird.
- Die GitHub-Codeänderungen dieses Branchs registrieren die neuen Dateipfade in `shipAssets.js`, verwenden zusätzlich `preloadShipPreview` (gemeinsamer Lade-Cache) und starten den Download direkt beim Aufrufen der Schiffsdetailseite über `objectArtwork.js`. Die GLB-Vorschau besitzt weiterhin Fallback-Bild und wird nach dem Import vom bereits vorhandenen Three.js-Renderer übernommen.
- Zwei vorher nicht als 3D-fähig registrierte Schiffstypen (`crawler`, `solar_satellite`) werden nun explizit als vorhandene Upload-Modelle akzeptiert. Die vier bisherigen Modelle bleiben unverändert.
- Bisher nur lokale GLB-2.0-Struktur, Material-/Texturparsing, Dreiecksindizes, WebP-Format und Einzel-Renderings geprüft. **Noch keine echte Browserprobe, kein npm-Build, kein GitHub-CI-Erfolg und kein Server-Deployment**. Diese Tests durch Codex vor Merge ergänzen.

## Zuordnung neuer Assets

| OGameX-Machine-Key | Neue Modelldatei | Neues Vorschaubild |
|---|---|---|
| `bomber` | `public/models/live3d/bomber-v1.glb` | `public/img/live3d/ships/bomber-35-v1.webp` |
| `crawler` | `public/models/live3d/crawler-v1.glb` | `public/img/live3d/ships/crawler-35-v1.webp` |
| `small_cargo` | `public/models/live3d/small_cargo-v1.glb` | `public/img/live3d/ships/small_cargo-35-v1.webp` |
| `cruiser` | `public/models/live3d/cruiser-v1.glb` | `public/img/live3d/ships/cruiser-35-v1.webp` |
| `pathfinder` | `public/models/live3d/pathfinder-v1.glb` | `public/img/live3d/ships/pathfinder-35-v1.webp` |
| `reaper` | `public/models/live3d/reaper-v1.glb` | `public/img/live3d/ships/reaper-35-v1.webp` |
| `recycler` | `public/models/live3d/recycler-v1.glb` | `public/img/live3d/ships/recycler-35-v1.webp` |
| `battlecruiser` | `public/models/live3d/battlecruiser-v1.glb` | `public/img/live3d/ships/battlecruiser-35-v1.webp` |
| `battle_ship` | `public/models/live3d/battle_ship-v1.glb` | `public/img/live3d/ships/battle_ship-35-v1.webp` |
| `solar_satellite` | `public/models/live3d/solar_satellite-v1.glb` | `public/img/live3d/ships/solar_satellite-35-v1.webp` |
| `espionage_probe` | `public/models/live3d/espionage_probe-v1.glb` | `public/img/live3d/ships/espionage_probe-35-v1.webp` |
| `deathstar` | `public/models/live3d/deathstar-v1.glb` | `public/img/live3d/ships/deathstar-35-v1.webp` |
| `destroyer` | `public/models/live3d/destroyer-v1.glb` | `public/img/live3d/ships/destroyer-35-v1.webp` |

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
