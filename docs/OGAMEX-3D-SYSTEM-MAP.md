# Systemkarte auf Planet / Mond

Branch: `codex/ogamex-3d-galaxy-overview`.

Auf **Planet / Mond** ist die neue **Sonnensystem**-Ansicht standardmäßig aktiv.
Sie zeigt ausschließlich die 15 Planetenpositionen des Sonnensystems der aktuell
gewählten eigenen Welt. Beim Planeten- oder Mondwechsel folgt die Karte automatisch.
Der eigene Standort steht mittig. Feine gestrichelte Orientierungslinien verbinden
die Positionen; sie stellen keine Flugentfernungen dar. Belegte
Positionen, Monde, Trümmerfelder und verfügbare Aktionen kommen aus dem ursprünglichen
`GalaxyController`; es werden keine Beispielwelten oder erfundenen Flugrouten ergänzt.

- **Aktueller Standort:** hervorgehoben und beschriftet; eigene Welten zusätzlich
  durch „Eigene Welt“ gekennzeichnet. Freie Positionen haben einen gestrichelten Kreis.
- **Position anklicken:** ein Aktionsfenster mit Koordinaten und Originalaktionen
  öffnen. Eigene Planeten und Monde lassen sich dort direkt auswählen. Das Fenster
  funktioniert auch per Tastatur; Escape schließt es und gibt den Fokus zurück.
- **Mission auswählen:** der vorhandene native Flottenplaner erscheint auf derselben
  Planetenseite unter der Karte. Ziel und Mission sind vorausgefüllt; bei
  Kolonisation wird ein verfügbares Kolonieschiff ausgewählt. Erst die ausdrückliche
  Startbestätigung verschickt eine Flotte, nach der Originalprüfung durch OGameX.
  „Zurück zur Systemkarte“ schließt die Planung. In „Flotten“ steht derselbe Planer
  weiterhin zur Verfügung.
- **Spezialaktionen:** vorhandene Phalanx-, Raketen-, Umsiedlungs- und Kontaktaktionen
  verwenden dieselben Komponenten und geprüften Endpunkte wie die Galaxietabelle.
  Verfügbarkeit und Kosten richten sich weiterhin nach den Originalregeln.
- **3D:** unten bleiben Übersicht, Kolonie und Orbit auswählbar. Der 3D-Code lädt
  erst bei Auswahl einer 3D-Ansicht; die Systemkarte benötigt kein WebGL. Die
  prozeduralen Gebäude, Wege und Pakettransporte aus der vorherigen Etappe bleiben
  erhalten. Der separate Navigationspunkt „Galaxie“ bietet weiterhin seine Tabelle
  mit frei wählbaren Galaxie-/Systemkoordinaten.

Die Infokarten für Planetendaten, Kommandostatus, Produktion, Aufträge und
Flottenoperationen sind deutlich größer beschriftet: reguläre Zeilen 20 Pixel,
Werte 22 Pixel statt bisher 10–11 Pixel. Diese Karten stehen unter der Ansicht,
damit ihre größere Darstellung die Karte und die 3D-Szene nicht verdeckt. Die ganze
Seite wächst nach unten. Auf schmalen Bildschirmen verwendet die Karte zwei
Spalten; sämtliche Positionen bleiben ohne horizontales Scrollen erreichbar.
Das Aktionsfenster kann bei sehr langen Inhalten innerhalb des Bildschirms scrollen.

## Radar und Aufklärung

Das Flottenradar zeigt ausschließlich die eigenen Missionen und die im Originalspiel
sichtbaren anfliegenden Missionen. Die Position bewegt sich anhand der ursprünglichen
Abflug-/Ankunftszeiten entlang einer schematischen Linie. Ein Klick öffnet Mission,
Ziel, Restzeit und bei eigenen Flotten die Schiffszahl. Millionen Schiffe bleiben
**ein Kontakt pro Mission**, keine Millionen 3D-Objekte. Maximal 60 Kontakte werden
auf der Karte dargestellt; bei mehr Missionen weist sie auf die vollständige
Flottenübersicht hin. Flotten außerhalb des Systems werden nur dargestellt, wenn
ihr Start oder Ziel im aktuellen System liegt. Auf dem Handy ersetzt die lesbare
Kontaktliste die räumlichen Radarzeichen.

Hin- und Rückflüge nutzen die gespeicherten Originalmissionen. Dabei korrigiert der
Kartenadapter ausschließlich die Darstellung einer doppelten Vertauschung der
Rückflugkoordinaten in der alten Bewegungsansicht; die Mission selbst bleibt gleich.

Die Aufklärung verwendet je Planet bzw. Mond den neuesten **noch aufbewahrten**
Spionagebericht aus den Nachrichten des angemeldeten Spielers. Kein fremder Bericht
und kein aktueller fremder Rohstoff-, Forschungs- oder Schiffsbestand wird abgefragt.
Ein alter Bericht über einen früheren Besitzer gilt nicht als Aufklärung des neuen
Besitzers. Rohstoffe, Trümmer, Schiffe, Verteidigung, Gebäude und Forschung bleiben
getrennt: `null` bedeutet „nicht aufgeklärt“, ein leeres aufgedecktes Feld bedeutet
„keine Einträge“. Ein neuer unvollständiger Bericht erhält keine verdeckten Werte
von einem älteren Bericht.

Die Karte meldet bekannte Militärpräsenz, fehlende Bewaffnung **im Bericht** oder
unvollständige bzw. unbekannte Aufklärung. Eine grüne Kennzeichnung ist keine
Kampfprognose. Datum und Uhrzeit stehen im Fenster; ab 24 Stunden wird der Bericht
zusätzlich als veraltet markiert. Diese Einordnung ist eine UI-Hilfe und verändert
keine Spielregeln. Radar und Aufklärung aktualisieren sich bei sichtbarer Karte
regelmäßig. Bei Ladefehlern erscheint „nicht verfügbar“ statt einer Entwarnung.

## Bereitstellung

Die gebauten Browserdateien sind enthalten. Es werden keine neuen Abhängigkeiten,
Lockfile- oder Datenbankschemaänderungen benötigt. Der Entwicklungsbranch setzt die
zuvor ausgelieferte Etappe `030b7feb8a015b0667d7d25509b46a80e2382250` fort;
`main` bleibt unverändert. Der bestehende Updatehelfer kann den konkreten neuen
Commit auf der Testinstallation übernehmen und erhält den separaten Reverb-Patch.
Nach dem Update `/play-3d` öffnen und die Browserseite vollständig neu laden.

## Prüfung

Der neue Browserablauf `tests/Frontend/live3d-system-map.browser.mjs` verwendet ein
isoliertes Konto mit zwei eigenen Planeten, Rohstoffen und Kolonieschiff. Er prüft:
Standardansicht mit genau 15 Positionen und echten Koordinaten; keinen 3D-Download
vor Auswahl; Tastaturbedienung des Aktionsfensters; eigene Welt über die Karte
wechseln; Kolonisationsplanung auf derselben Seite ohne unbeabsichtigten Start;
verzögerte Antworten beim Planetenwechsel; Schriftgrößen; sämtliche 3D-Modi;
reguläre Flottennavigation nach der Inline-Planung und mobile Darstellung.

Zusätzlich werden der vorherige Planeten-/Nachrichtenablauf, fehlende GPU bzw.
fehlendes 3D-Modul und die bestehende Galaxie-/Flottenlogik überprüft. Der Browser prüft zusätzlich echte, ausdrücklich gestartete und wieder zurückgerufene
Testflüge, zentrierte Positionen und gestrichelte Verbindungen sowie einen historischen
Spionagebericht mit Militärpräsenz, Alterswarnung und nicht aufgedeckter Forschung.
Backendtests sichern Empfängerrechte, gelöschte Berichte, unvollständige Aufklärung,
verborgene Fremdflotten, ausgeblendete feindliche Schiffszahlen und Rückflugrichtung ab.
JavaScript-Tests prüfen Koordinaten und Flugfortschritt sowie Besitzerwechsel.

Rector, Pint und PHPStan bestanden; 40 gezielte Backendtests (5.609 Assertions) und
16 JavaScript-/Geometrietests bestanden. Die Browserprüfung umfasst Systemkarte,
Planeten-/Nachrichtenregression und Kompatibilitätsansicht ohne GPU bzw. 3D-Modul.
Temporäre Testkonten und ihre Aufklärungsdaten werden anschließend entfernt.
