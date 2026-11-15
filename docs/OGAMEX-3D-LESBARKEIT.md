# Lesbarkeit, Kolonisation und bodennahe Kolonie

Branch: `codex/ogamex-3d-readability-colonisation`.

## Kolonisieren

Die originale Zielprüfung gab die Warnung „Zum Besiedeln muss ein Kolonieschiff
versendet werden“ für jede freie Planetenposition aus, auch wenn ein Kolonieschiff
ausgewählt war. Die Warnung erscheint jetzt nur bei tatsächlich fehlendem Kolonieschiff.
Die Live-Vorschau zeigt bei einem unzulässigen Ziel den Grund der gewählten
Originalmission, beispielsweise unzureichende Astrophysik. Mengenprüfung, Kosten,
Flugzeit, Koloniegrenze und Missionsverarbeitung bleiben bei OGameX.

Der neue Backendtest prüft nicht nur die Vorauswahl: Er verschickt ein Kolonieschiff,
setzt die Testzeit auf die Ankunft und lässt die originale Kolonisationsmission eine
weitere Kolonie gründen. Der Browser prüft zusätzlich den tatsächlichen Schnellversand.

## Schrift und Flugzeiten

Unter **Einstellungen → Lesbarkeit** stehen 100 %, 115 %, 130 % und 150 % zur Wahl.
Bereits die Standardeinstellung verwendet für normalen Text überwiegend 18–22 Pixel.
Die Einstellung vergrößert Schrift und Bedienelemente und wird auf dem jeweiligen
Gerät im Browser gespeichert. Eingebettete Spielbereiche übernehmen die Auswahl;
Spielregeln und Benutzerprofil werden dadurch nicht verändert. Die Zurücksetzen-Taste
stellt die gut lesbare Standardgröße wieder her.

Produktionstabellen, Flottenplanung und Flottenbewegungen sind größer beschriftet.
Die Produktion verwendet lesbare native Prozent-Auswahlen und weiterhin das originale
Speicherformular. Flugzeiten in Radar, Hover-Fenster, Kontaktdetails und laufenden
Flotten sind in vier eigene Felder für Tage, Stunden, Minuten und Sekunden aufgeteilt.
Beschriftung, Rahmen und unterschiedliche Akzentfarben trennen die Werte. Für
Screenreader bleibt eine zusammenhängende Zeitbeschreibung verfügbar. Überlappende
Radarzeichen erhalten etwas Abstand, damit jede Mission einzeln erreichbar bleibt.

## 3D-Kolonie

Die erhöhten Geländeplatten unter den Gebäuden entfallen vollständig aus der
Live-Kolonie. Die unteren Modellbereiche werden an die Kugeloberfläche angepasst;
die oberen Gebäudeteile bleiben unverformt. Straßen und Transportwege folgen derselben
Planetenkugel. Die Pakete sind größer und orange-weiß, mit einem kleinen blauen Licht,
statt die dunkle Straßenfarbe zu übernehmen. Die ursprünglichen Gebäudestufen und
Modelle bleiben erhalten; es entstehen keine zusätzlichen Geländehügel.

## Spielbereiche

- **Freundschaftsanfragen:** eindeutige, beschriftete Buttons „✓ Annehmen“ und
  „✕ Ablehnen“ mit unterschiedlichen Farben. Beide behalten die originalen Aktionen.
- **Technik:** eine einzige Seite mit Objektauswahl, Beschreibung, einer Tabelle der
  vorhandenen/benötigten Stufen und klar gekennzeichneten erfüllten bzw. fehlenden
  Voraussetzungen. Technische Daten und Anwendungen verwenden die Originaldaten.
  Es öffnet sich kein zweiter Technikdialog über der Seite.
- **Notizen:** Dialoge und iframe-Höhe passen sich dem gesamten Inhalt an. Betreff,
  Textfeld, Priorität und Speichern bleiben vollständig erreichbar; das originale
  Notizformular speichert die Einträge. Späte Höhenmessungen eines verlassenen
  Dokuments dürfen die nächste Ansicht nicht mehr verkleinern.
- **Belohnungen:** sieben deutsche Vorschaukarten mit vorhandenen OGameX-Motiven.
  Der fest eingetragene Beispielspieler entfällt. Das Original enthält an dieser
  Stelle bislang eine statische Vorschau und keine Einlösefunktion; deshalb weist
  die Seite ausdrücklich darauf hin, dass die Belohnungen noch nicht einlösbar sind.
  Es werden keine erfundenen Belohnungen oder Gutschriften erzeugt.

## Prüfung und Bereitstellung

Die neue Browserprüfung `tests/Frontend/live3d-readability.browser.mjs` deckt alle
oben genannten Abläufe ab, einschließlich eines echten Kolonieschiffstarts,
wechselnder und gespeicherter Schriftgröße, geänderter Produktionsprozente,
Techniknavigation, gespeicherter Notiz, geladener Belohnungsbilder sowie tatsächlichem
Annehmen und Ablehnen zweier Freundschaftsanfragen. Geometrietests prüfen bodennahe
Gebäudefüße, kugelförmige Straßen und kontrastierende Pakete. Backendtests sichern
Kolonisation und die ursprünglichen Spielbereiche ab.

Der Branch setzt `c4d8bbeef8cd514fb49d06fc004743daeebff6c2` fort. Die gebauten
Browserdateien sind enthalten. Keine neuen Abhängigkeiten, Lockfiles oder
Datenbankschemaänderungen. Auf dem Zielrechner genügt der vorhandene Updatehelfer;
anschließend `/play-3d` vollständig neu laden. `main` bleibt unverändert.

Ergebnis: Rector, Pint und PHPStan bestanden; 43 gezielte Backendtests mit 5.743
Assertions und 18 JavaScript-/Geometrietests bestanden. Die neue Browserprüfung
und die vorhandenen Schnellversand-, Systemkarten-, Navigations- und
Kompatibilitätsprüfungen bestanden. Temporäre Konten, Notizen,
Freundschaftsanfragen, Flotten und Aufklärungsberichte wurden entfernt.
