# OGameX-3D als lokale Demo

Die neue Anbindung an echte Laravel-Spielstände ist unter [Live-Oberfläche](../docs/OGAMEX-3D-LIVE.md) dokumentiert. Die ZIP bleibt die separate Offline-Demo.

## Aktuelle Version 0.13

[OGameX-3D-0.13.zip direkt herunterladen](https://github.com/Nostago/ogamex-3d/raw/refs/heads/codex/ogamex-3d-v0.13/downloads/OGameX-3D-0.13.zip),
entpacken und `OGameX-3D-0.13.html` im Browser öffnen. Kein Server und keine
Installation nötig. Nach dem Download vollständig offline nutzbar.
JavaScript und WebGL müssen aktiv sein.

Neu in 0.13:

- **Produktion nach OGameX-Formeln:** 1× Wirtschaft mit Grundproduktion,
  Temperatur, Positionsbonus, Energiequote und Lagergrenzen. Kepler IX startet
  mit 253 Metall / 95 Kristall / 31 Deuterium pro Stunde.
- **Bezahlte Zeitaufträge:** Kosten, Voraussetzungen und Bauzeit für neue Gebäude,
  Ausbau und Schiffe. Schiffe werden schrittweise fertig. „Alle Aufträge
  abarbeiten“ startet die Warteliste; Pausieren und Fortsetzen sind möglich.
- **Forschung:** eigener Menüpunkt, sechs Technologien mit Freischaltungen,
  gemeinsam für alle Kolonien. Ein Forschungsauftrag gleichzeitig.
- **Lokaler Spielstand:** automatische Speicherung im Browser, wenn verfügbar,
  einschließlich Produktion und fälliger Aufträge nach erneutem Öffnen.
- **Demozeit vorspulen:** +1 Minute / +1 Stunde für die gesamte Simulation,
  ohne die angezeigten Produktionsmengen bei 1× zu verändern.

Ausprobieren: Gebäude → Metallmine ausbauen, dann Demozeit vorspulen.
Forschung → Energietechnik 1, danach Verbrennungstriebwerk 1. Unter Schiffe einen
Leichten Jäger vormerken und die Auftragsliste starten. Pausieren, neu öffnen
und fortsetzen. Bestand und Produktionswerte oben bzw. unter Planet prüfen.

Startbestände und Kolonien bleiben Beispieldaten (je 5.000 Metall, 5.000 Kristall,
2.000 Deuterium). Keine Offiziers-/Klassen-/Itemboni. Gebäude maximal Stufe 8,
Forschung maximal Stufe 12. Hohe Voraussetzungen sind teilweise noch unerreichbar.
Die kostenlose Großflotten-Modellprobe bleibt ein ausdrücklich separater
Beispielbestand. Flugzeiten von Verlegungen/Transporten bleiben kurze Demowerte;
Forschungsboni auf Antriebe und Laderaum sowie Kampf folgen später.

Der Speicherhinweis zeigt, ob Fortschritt gesichert werden kann. Browser
behandeln lokale Dateien unterschiedlich: denselben Dateipfad und Browser
verwenden. Privatmodus, Umbenennen oder Verschieben kann einen anderen Speicher
verwenden. Ohne Browserspeicher gilt der Fortschritt nur für diese Sitzung.
„Gesamte Demo zurücksetzen“ beginnt nach Bestätigung neu. Frühere ZIP-Versionen
hatten keinen kompatiblen Wirtschaftsspielstand und werden nicht importiert.

Die ZIP enthält eine deutsche Anleitung und die HTML-Datei mit Three.js-MIT-Lizenz.
Keine Verbindung zu echten Spielständen. Hauptbranch, Abhängigkeiten und Lockfiles
bleiben unverändert.

SHA-256:

```text
77473b168bd6e658175562a6bf294d474c6c2a75ba5d006f1675adddaa3acea7
```

[Formeln, Einschränkungen, Architektur und Testbefehle](../docs/OGAMEX-3D.md).

## Frühere Versionen

- [Version 0.12](OGameX-3D-0.12.zip)

- [Version 0.11](OGameX-3D-0.11.zip)

- [Version 0.10](OGameX-3D-0.10.zip)

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
