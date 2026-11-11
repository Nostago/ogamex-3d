# OGameX-3D als lokale Demo

## Aktuelle Version 0.5

[OGameX-3D-0.5.zip direkt herunterladen](https://github.com/Nostago/ogamex-3d/raw/refs/heads/codex/ogamex-3d-v0.5/downloads/OGameX-3D-0.5.zip),
entpacken und `OGameX-3D-0.5.html` mit Safari, Chrome, Firefox oder Edge öffnen.
Keine Installation und kein Server erforderlich. JavaScript und WebGL müssen
aktiv sein. Nach dem Download funktioniert die Demo ohne Internet.

Neu sind drei unterschiedlich große Demo-Planeten, automatische stabile
Gebäudestandorte und der Terraformer. Die Anzeige trennt Durchmesser,
belegte/maximale Baufelder, freie Kapazität und Terraformer-Bonus.
Jede Gebäudestufe verbraucht ein Feld, Verteidigungsmodelle keine. Ein voller
Planet blockiert feldverbrauchende Bauten; auch der Terraformer braucht für seine
eigene Stufe zuerst ein freies Feld. Seine Kapazitätserweiterung verändert nicht
den Durchmesser. Die gewählten Planetendurchmesser und Basisfelder sind Demodaten.

Alle 13 Anlagentypen, Stufenmodelle, Betriebsanimationen, Straßen,
Versorgungstrassen, Transportfahrzeuge, Kamerafokus, Bauanimation und Orbit
bleiben verfügbar. Im Baumenü genügt die Wahl eines Anlagentyps. Es gibt keine
manuelle Flächenwahl. Verteidigung ist mehrfach baubar; das separate Grafiklimit
begrenzt die Modellanzahl für die Performance, nicht die Spiel-Baufelder.

Planetenwechsel, Orbit und Reset brechen laufende Bauten ohne Zustandsänderung
ab. „Diesen Planeten zurücksetzen“ setzt nur den ausgewählten Planeten zurück;
Neuladen setzt alle zurück. Alle Werte sind Beispieldaten, ohne echte Kosten,
Bauvoraussetzungen oder Verbindung zu Spielständen. Keine Schiffsproduktion,
Forschung oder Kämpfe. Die ZIP enthält eine Anleitung und die HTML-Datei die
Three.js-MIT-Lizenz. Texturen und Modelle benötigen keine Netzwerkzugriffe.

SHA-256:

```text
b9ac8db35c23eb14cd5b20f948e0da1530cb3f90703e789937759244a17f0f9d
```

Bedienung, Feldregeln, Provider-Vertrag und Testbefehle:
[Dokumentation](../docs/OGAMEX-3D.md).

## Frühere Versionen

- [Version 0.4](OGameX-3D-0.4.zip)
- [Version 0.3](OGameX-3D-0.3.zip)
- [Version 0.2](OGameX-3D-0.2.zip)
- [Version 0.1](OGameX-3D-0.1.zip)

Die älteren Pakete bleiben unverändert erhalten.
