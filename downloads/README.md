# OGameX-3D als lokale Demo

## Aktuelle Version 0.8

[OGameX-3D-0.8.zip direkt herunterladen](https://github.com/Nostago/ogamex-3d/raw/refs/heads/codex/ogamex-3d-v0.8/downloads/OGameX-3D-0.8.zip),
entpacken und `OGameX-3D-0.8.html` in Safari, Chrome, Firefox oder Edge öffnen.
Keine Installation, kein Server, keine Laufzeit-Downloads. JavaScript und WebGL
müssen aktiv sein; nach dem Download funktioniert die Demo offline.

Neu ist die getrennte Navigation mit vier Arbeitsbereichen:

- **Planet:** große 3D-Kolonie, Baufelder, Beispielproduktion und Direktzugriff.
- **Gebäude:** Suche und Kategorien, Details, Ausbau und automatischer Neubau.
- **Schiffe:** Schiffstyp und Stückzahl, Mengenaufträge und Baufortschritt.
- **Flotten:** Bestandstabelle, vorgemerkte Mengen, Details und Beispielbestände.

Die Hauptnavigation steht links, auf kleinen Bildschirmen fest unten. Die große
3D-Ansicht gehört zur Planetenübersicht. Auf Unterseiten lässt sich eine kleine
3D-Vorschau öffnen und schließen; Formulare und Tabellen haben Vorrang.
Gebäudeklicks auf dem Planeten öffnen die passende Gebäudeseite samt Vorschau.
Dieselbe WebGL-Szene bleibt erhalten; geschlossenes Rendering pausiert.

Eingaben, Suche und Auswahl bleiben beim Navigieren erhalten. Laufende Vorgänge
laufen beim Seitenwechsel weiter, ohne am Ende automatisch die Seite zu wechseln.
„Vorgang unterbrechen“ stoppt ausdrücklich; ein Schiffsauftrag bleibt vorgemerkt.
Planetenwechsel und Reset unterbrechen ebenfalls. Reset betrifft nur den aktuellen
Planeten, Neuladen alle. Die vier Seiten sind per URL-Fragment und Zurück/Vorwärts
erreichbar, z. B. `#ships`.

Unter **Schiffe** Typ und Menge eingeben, „Mengenauftrag vormerken“ und danach
„Nächsten Demo-Auftrag ausführen“ wählen. Unter **Flotten** kann die Großflotte
mit 1.100.000 Schiffen geladen werden. Maximal zwölf Orbitmodelle stehen für den
gesamten Bestand. Drei Planeten, 15 Gebäudetypen, Terraformer, Betriebsanimationen,
Verteidigung, Infrastruktur und die bisherigen Mengenaufträge bleiben erhalten.

Weiterhin Beispieldaten, ohne produktive Kosten, Bauzeiten, Missionen oder Kämpfe.
Keine Verbindung zu echten Spielständen. Die ZIP enthält eine Anleitung, die HTML
enthält die Three.js-MIT-Lizenz. Produktive Spiellogik und Abhängigkeiten bleiben
unverändert.

SHA-256:

```text
7296a5cd0d2210c8a7971fd5a7588dc81b83ac204cd0f849b385d58a175bd75e
```

Weitere Details: [Dokumentation](../docs/OGAMEX-3D.md).

## Frühere Versionen

- [Version 0.7](OGameX-3D-0.7.zip)
- [Version 0.6](OGameX-3D-0.6.zip)
- [Version 0.5](OGameX-3D-0.5.zip)
- [Version 0.4](OGameX-3D-0.4.zip)
- [Version 0.3](OGameX-3D-0.3.zip)
- [Version 0.2](OGameX-3D-0.2.zip)
- [Version 0.1](OGameX-3D-0.1.zip)

Die älteren Pakete bleiben unverändert erhalten.
