# Dreifache Koloniekapazität durch Astrophysik

Auf Wunsch des Betreibers gilt eine eigene Universumsregel: Jeder bisherige
Astrophysik-Schritt erlaubt drei statt einer Kolonie. Die Berechnung lautet
`3 * round(level / 2)`; der Heimatplanet kommt anschließend einmal hinzu.

| Astrophysik | Kolonien | Planeten insgesamt |
| --- | ---: | ---: |
| 0 | 0 | 1 |
| 1–2 | 3 | 4 |
| 3–4 | 6 | 7 |
| 5–6 | 9 | 10 |
| 7–8 | 12 | 13 |
| 9–10 | 15 | 16 |
| 11–12 | 18 | 19 |

Die zentrale Berechnung in `ResearchObjects` versorgt sowohl
`PlayerService::getMaxPlanetAmount()` und die Prüfung bei der Ankunft eines
Kolonieschiffs als auch die Techniktabelle. Deutsch- und englischsprachige
Beschreibungen wurden an die eigene Universumsregel angepasst.

Expeditionsslots, Forschungskosten und Forschungszeiten, Positionsvoraussetzungen
und der Ablauf von Kolonisierungsmissionen bleiben unverändert. Die Änderung
legt keine Planeten an und benötigt keine Migration oder Bearbeitung bestehender
Spielstände. Vorhandene zusätzliche Startplaneten zählen wie bisher als Kolonien.

## Prüfung

- Rector, Pint und PHPStan erfolgreich.
- 42 gezielte Tests mit 568 Assertions erfolgreich: Kolonisierungsmissionen,
  Positionsvoraussetzungen, Techniktabelle, Flotten-UI und die Kapazitätsberechnung.
- Der Missions-Grenztest beginnt mit Heimatplanet und einer Kolonie. Bei
  Astrophysik 5 gelingen acht weitere Kolonien; drei weitere Ankünfte werden
  abgewiesen. Ein zweiter Test füllt die Kapazität bei Stufe 2 und schließt vor
  Ankunft des nächsten Kolonieschiffs die reguläre Forschung auf Stufe 3 ab.
- Die Grenzwerte 0 bis 10 sowie 25 und die unveränderten Expeditionsslots werden
  geprüft.
- 110 Frontend-Tests und Frontend-Build erfolgreich. Keine kompilierten Assets
  wurden geändert.
- Browserprüfung auf separater Entwicklungsdatenbank: Forschungsdetail und
  Techniktabelle zeigen die neuen Beschreibungen und Kapazitäten an. Die Tabelle
  zeigt weiterhin die bisherigen Expeditionsslots und Positionsanforderungen;
  keine JavaScript-Fehler.
- Vollständige PHP-Suite: 1.240 Tests und 28.303 Assertions erfolgreich;
  42 bestehende Notices, keine fehlgeschlagenen Tests (5 parallele Prozesse).
- Der gezielte Patch für die drei Laufzeitdateien lässt sich auch auf den
  geprüften Bot-Fix-Stand `6e6fdfb1` von PR #4 anwenden (`git apply --check`).

Kein produktives Deployment ausgeführt. Die Änderung stammt aus einer
KI-unterstützten Umsetzung und wurde im laufenden Entwicklungsspiel geprüft.
