# Drei weitere Schiffe als GLB

Stand der ersten Integration. Aktuelle, deutlich kleinere Modelle und Ladezeitmessungen: [Optimierung aller vier Schiffe](OGAMEX-3D-SHIP-LOADING.md).

Branch: `codex/ogamex-3d-three-ship-models`.

Großer Transporter, Kolonieschiff und Schwerer Jäger verwenden die vom Nutzer gelieferten Modelle. Wie beim [Leichten Jäger](OGAMEX-3D-LIGHT-FIGHTER.md) lädt nur die drehbare Bauvorschau die GLB. Listen, Flottenauswahl, Schnellplanung, Auftragskarten und entsprechende Originalansichten innerhalb der neuen Oberfläche verwenden ein kleines transparentes WebP. Die Classic-Oberfläche behält ihre bisherigen Bilder.

## Aufbereitung

| Schiff | Original | Optimierte GLB | Dreiecke | Vorschaubild |
| --- | ---: | ---: | ---: | ---: |
| Großer Transporter | 29.843.976 Bytes | 1.894.440 Bytes | 49.257 | 19.556 Bytes |
| Kolonieschiff | 29.534.064 Bytes | 1.954.084 Bytes | 47.991 | 25.856 Bytes |
| Schwerer Jäger | 29.270.900 Bytes | 1.815.592 Bytes | 49.052 | 16.324 Bytes |

Die GLBs sind rund 93–94 % kleiner. Eine eingebettete JPEG-Farbtextur mit 1024×1024 Pixeln, erhaltene UVs, Standard-glTF 2.0 ohne externe Dateien oder zusätzliche Dekompressionsbibliotheken. Die gelieferten Originaldateien bleiben außerhalb des öffentlich ausgelieferten Verzeichnisses.

Alle drei Originale zeigen mit der Nase entlang der glTF-Z-Achse. Die Aufbereitung richtet sie einheitlich aus (`--yaw 90`, Blender-Z-Achse). Bilder und Bauvorschau zeigen dieselbe Vorderseite: 35° schräg von vorn, 22° Höhenwinkel. Der Renderer berechnet den Bildausschnitt aus den projizierten Rumpfpunkten und lässt 10 % Abstand, damit auch breitere Schiffe vollständig sichtbar bleiben. Die bestehende Leichter-Jäger-Datei wurde nicht verändert.

Dateien je Schiff:

- `public/models/live3d/{large-cargo,colony-ship,heavy-fighter}-v1.glb`
- `public/models/live3d/{large-cargo,colony-ship,heavy-fighter}-v1.json` – Kennzahlen und SHA-256 des Originals
- `public/img/live3d/ships/{large-cargo,colony-ship,heavy-fighter}-35-v1.webp` – transparent, 512×384 Pixel

Beispiel mit Blender 4.3+ auf dem Entwicklungsrechner:

```bash
blender -b -t 2 --python scripts/assets/prepare-light-fighter.py -- \
  'Großer Transporter.glb' output-directory \
  --slug large-cargo --name 'Large Cargo' --yaw 90
```

Das Skript erzeugt GLB, Textur, 1024×768-PNG und Kennzahlen. Das veröffentlichte WebP entsteht daraus mit Lanczos-Verkleinerung auf 512×384 und Qualität 88. Für die anderen Modelle lauten Slug/Name `colony-ship`/`Colony Ship` und `heavy-fighter`/`Heavy Fighter`.

## Verhalten und Prüfung

Die vorhandene Vorschau übernimmt Rotation mit Maus und Pfeiltasten, passende Kamera bei Fenstergrößenwechseln, Produktionsanimation und Bildersatz bei WebGL-Ausfall. Jedes Modell wird pro Seitensitzung höchstens einmal heruntergeladen; sichtbare Instanzen geben ihre GPU-Ressourcen beim Wechsel frei. Millionen Schiffe führen weiterhin zu einer einzigen Vorschau. Die begrenzte abstrakte Orbitdarstellung bleibt bei ihren bisherigen Modellen.

Nach einem WebGL-Kontextverlust bleibt die betroffene Vorschau bis zum Neuladen bei ihrem Bildersatz. Hintergrundaktualisierungen und die Auswahl eines anderen Schiffs dürfen keinen neuen Renderer in die fehlgeschlagene Vorschau einsetzen. Auch verspätete Modellantworten werden verworfen.

Backendtests prüfen die Bildzuordnung aller vier importierten Schiffstypen in Katalog, Flotten und Produktionsaufträgen. Node-Tests prüfen GLB-Struktur, eingebettete Ressourcen, Dreiecksindizes, Größen und WebP-Format. Browsertests prüfen alle drei tatsächlichen Vorschauen, Drehung, einmaligen Download, Produktionsbilder, mobile Ausschnitte und Ersatzbilder bei Kontextverlust. Der Leichter-Jäger-Browsertest wechselt für seine generische Ersatzvorschau nun zum weiterhin prozeduralen Kreuzer.

Gebautes Frontend und alle Dateien sind enthalten. Auf dem VPS genügt der vorhandene Updatehelfer; dort müssen weder Blender noch Node installiert werden. Schiffskosten, Voraussetzungen, Kolonisation, Flüge, Kampfwerte und Bots werden durch diese Etappe nicht verändert. Der Hauptbranch bleibt unverändert.
