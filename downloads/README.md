# OGameX-3D als lokale Demo

## Aktuelle Version 0.10

[OGameX-3D-0.10.zip direkt herunterladen](https://github.com/Nostago/ogamex-3d/raw/refs/heads/codex/ogamex-3d-v0.10/downloads/OGameX-3D-0.10.zip),
entpacken und `OGameX-3D-0.10.html` mit Safari, Chrome, Firefox oder Edge öffnen.
Kein Server und keine Installation nötig. JavaScript und WebGL müssen aktiv sein.
Nach dem Download funktioniert die Demo ohne Internet.

Neu in 0.10:

- **Verlegungsmissionen:** bestehende Flotte und Zielplanet wählen, Zusammensetzung
  und Demo-Flugzeit prüfen und starten. Fortschritt und Ankunft stehen unter Flotten.
- **Korrekte Bestände:** unterwegs sind die Schiffe gebunden. Bei Ankunft wird die
  Flotte samt Stückzahlen genau einmal zum Ziel übertragen und wieder freigegeben.
  Keine verlorenen oder doppelt gezählten Schiffe; Bearbeiten und Auflösen sind
  während des Flugs gesperrt.
- **Nachrichten:** neue Hauptseite mit den Kategorien und Unterkategorien des
  Originals, Ungelesenzählern, Nachrichtendetails, Löschen und Zehner-Pagination.
  Demo-Ankünfte erzeugen einen Bericht unter Flotten → Sonstiges.
- **Originalpostfach:** im Laravel-Projekt ist über `/messages?prototype3d=1`
  eine optionale neue Gestaltung verfügbar. Die bisherigen Controller, Services,
  Berichte, Berechtigungsprüfungen und AJAX-Aktionen bleiben erhalten. In der ZIP
  sind ausschließlich lokale Beispielnachrichten enthalten.

Ausprobieren: Unter Schiffe den Großflotten-Beispielbestand laden. Unter Flotten
einen Verband anlegen, einen anderen Planeten wählen und „Verlegung bestätigen
und starten“ drücken. Nach 15 Sekunden Demo-Flugzeit den Zielplaneten öffnen.
Unter Nachrichten → Flotten → Sonstiges den Ankunftsbericht lesen.

Die Flugzeit ist frei gewählt und bildet keine echte OGame-Berechnung ab.
Keine echten Treibstoffkosten, Transporte oder Kämpfe. Die Zeit läuft bei
Seitenwechsel weiter; nach Rückkehr aus einem Hintergrundtab werden fällige
Ankünfte nachgeholt. Alle Mengen bleiben Zahlen, mit höchstens zwölf Orbitmodellen.
Reset stoppt betroffene Flüge sicher; Neuladen setzt alle Demodaten zurück.
Historische Nachrichten sind planetenübergreifend und bleiben bei lokalem Reset
bestehen. Es werden keine Nachrichten an andere Spieler gesendet.

Die ZIP enthält eine Anleitung und die HTML-Datei die Three.js-MIT-Lizenz.
Kein Zugriff auf echte Spielstände. Der angemeldete Server-Link zum Originalpostfach
ist im Offline-Export entfernt. Abhängigkeiten und Lockfiles bleiben unverändert.

SHA-256:

```text
b69a2e88b029588faa68e89650523df5d15cfa06a9744f1c7ea3533cbb7401e2
```

[Dokumentation und Testbefehle](../docs/OGAMEX-3D.md).

## Frühere Versionen

- [Version 0.9](OGameX-3D-0.9.zip)
- [Version 0.8](OGameX-3D-0.8.zip)
- [Version 0.7](OGameX-3D-0.7.zip)
- [Version 0.6](OGameX-3D-0.6.zip)
- [Version 0.5](OGameX-3D-0.5.zip)
- [Version 0.4](OGameX-3D-0.4.zip)
- [Version 0.3](OGameX-3D-0.3.zip)
- [Version 0.2](OGameX-3D-0.2.zip)
- [Version 0.1](OGameX-3D-0.1.zip)

Alle älteren Pakete bleiben unverändert erhalten.
