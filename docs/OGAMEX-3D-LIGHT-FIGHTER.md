# Leichter Jäger: GLB-Testintegration

Stand der ersten Integration. Aktuelle, deutlich kleinere Modelle und Ladezeitmessungen: [Optimierung aller vier Schiffe](OGAMEX-3D-SHIP-LOADING.md).

Branch: `codex/ogamex-3d-light-fighter-glb`.

Der vom Nutzer gelieferte „Leichte Jäger“ ersetzt im Baufenster der Seite **Schiffe** das bisherige Vorschau-Modell. Das Modell lässt sich per Ziehen und Pfeiltasten drehen. Perspektive: 35° schräg von vorn, 22° Höhenwinkel. Die Kamera passt den tatsächlichen Rumpf ins Vorschaufenster ein, auch beim Drehen und auf schmalen Bildschirmen.

## Aufbereitung

| Eigenschaft | Gelieferte Datei | Web-Fassung |
| --- | ---: | ---: |
| GLB | 29.738.756 Bytes | 1.820.228 Bytes |
| Dreiecke | 996.802 | 49.840 |
| Farbtextur | 2048 × 2048 | 1024 × 1024 |

Die GLB ist damit rund 94 % kleiner. Geometrie wurde reduziert; die vorhandenen UVs und das Material bleiben erhalten. Standard-glTF 2.0, eine eingebettete JPEG-Textur, keine externen Dateien oder Laufzeit-Dekompressionsbibliotheken. Die Quelldatei wird weder überschrieben noch öffentlich ausgeliefert.

Web-Dateien:

- `public/models/live3d/light-fighter-v1.glb`
- `public/img/live3d/ships/light-fighter-35-v1.webp` – transparentes 512×384-Bild, 16.934 Bytes
- `public/models/live3d/light-fighter-v1.json` – Kennzahlen und SHA-256 der Quelldatei

Das Vorschaubild stammt aus einem tatsächlichen Rendering des reduzierten Modells. Es wird in Objektlisten, Flottenauswahl, Schnellplanung, Auftragskarten und entsprechenden eingebetteten Originalansichten verwendet. Die Classic-Oberfläche behält ihre Originalbilder. Die abstrakte Orbitdarstellung bleibt bei ihrer bisherigen begrenzten Darstellung; sie lädt die große GLB nicht.

## Laden und Ressourcen

Die GLB samt Loader wird erst geladen, wenn die 3D-Bauvorschau des Leichten Jägers benötigt wird. Die übrigen Anzeigen laden das kleine WebP. Innerhalb einer Seitensitzung wird die GLB einmal geladen; jede sichtbare Vorschau besitzt eigene freigebbare GPU-Ressourcen. Ein verspätet fertig geladenes Modell darf eine zwischenzeitlich ausgewählte andere Schiffsklasse nicht ersetzen.

Die Vorschau ist von der tatsächlichen Schiffsmenge unabhängig: Auch eine Million Schiffe erzeugt keine Million GLB-Instanzen. Bau-/Fertigungsanimationen bleiben vorhanden. Bei WebGL-Ausfall erscheint das neue Schiffsbild als Ersatz.

Verwendet wird der zu Three.js 0.160.1 passende GLTFLoader unter der vorhandenen MIT-Lizenz. Der Loader und sein Hilfsmodul wurden aus derselben npm-Version entnommen; nur die Importpfade wurden auf die bereits eingebundene Three.js-Datei umgestellt. Keine neuen npm-Abhängigkeiten oder Lockfile-Änderungen.

## Reproduktion der Aufbereitung

Nur auf dem Entwicklungsrechner mit Blender 4.3+, nicht auf dem Spielserver erforderlich:

```bash
blender -b -t 6 --python scripts/assets/prepare-light-fighter.py -- input.glb output-directory
```

Das Skript erzeugt reduzierte GLB, Textur, 1024×768-Rendering und Kennzahlen. Das veröffentlichte WebP wurde aus dem Rendering auf 512×384 verkleinert und mit Qualität 88 gespeichert. Versionsnummern in Modell/Bild/Asset-Zuordnung bei einem Austausch erhöhen, damit bestehende Browser-Caches aktualisiert werden.

## Prüfung und Bereitstellung

Backendtests prüfen die einheitliche Bildzuordnung in Katalog, Flotten und Fertigung sowie unveränderte Original-Schiffsdaten. Node-Tests prüfen GLB-Struktur, Größe, eingebettete Ressourcen, sämtliche Dreiecksindizes und Bildformat. Der Browser prüft tatsächliches Laden, Maus-/Tastaturrotation, verspätete Antworten beim Objektwechsel, einmaligen Download, stabile Ressourcen nach mehrmaligem Wechsel, Produktionsanimation, Auftragsbild, mobiles Framing und Bildersatz bei Kontextverlust.

Gebautes Frontend, Modell und Vorschaubild sind enthalten. Auf der bestehenden Testinstallation genügt der gewohnte Updatehelfer und anschließendes Neuladen von `/play-3d`. Keine Installation von Blender oder Node auf dem VPS erforderlich, keine Änderungen an Preisen, Voraussetzungen, Flugzeiten oder Kampfwerten. `main` bleibt unverändert.
