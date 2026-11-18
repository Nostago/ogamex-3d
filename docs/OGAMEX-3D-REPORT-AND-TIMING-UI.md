# Flottenzeiten und Kampfbericht-Details

## Flottenzeiten unter Verwaltung

Die Flottenzeiten-Verwaltung verwendet im neuen UI eine native, deutschsprachige
Ansicht mit einer Karte pro Auftrag. Start, Ziel, Abflug, Ankunft und verbleibende
Flugzeit sind getrennt beschriftet. Die Restzeit zeigt Tage, Stunden, Minuten und
Sekunden in vier Feldern und wird ohne Seitenreload aktualisiert.

Das Minutenfeld passt sich der Schriftgröße an und bietet Platz für den gesamten
gültigen Wertebereich von 1 bis 10.000 Minuten einschließlich der Pfeiltasten.
Die alte Breite von 40 Pixeln konnte bei gleichzeitigem Innenabstand den Text
vollständig verdecken. Die native Ansicht erhält keine zusätzliche alte
13-Pixel-Thematisierung mehr und übernimmt die Lesbarkeitseinstellungen.

Filter, Seitengröße, Pagination und die bestehenden Verwaltungsaktionen bleiben
verfügbar. Die Aktion für alle gefilterten Aufträge befindet sich in einem
aufklappbaren Bereich und verlangt weiterhin eine Bestätigung. Beschriftungen,
Missionsnamen, Fehlermeldungen und Erfolgsrückmeldungen verwenden Übersetzungen.
Die Berechnung der Ankunftsverkürzung und die Zugriffsrechte wurden nicht geändert.

## Kampfbericht im Nachrichten-Layer

Die Detailansicht im neuen UI rendert einen eigenen Bericht aus dem gespeicherten
Kampfbericht und derselben Datenprojektion wie das vorhandene 3D-Replay. Die alte
Detailvorlage mit Editor-Werkzeugen, Gegenstandslisten, Beispieldaten und externen
Beispielaktionen wird dort nicht mehr eingebunden.

- Kampfergebnis und Rohstoffverlust je Seite stehen am Anfang.
- Beute und entstandene Trümmer haben ausdrücklich benannte Rohstoffspalten.
- Die Flottentabellen zeigen nur beteiligte Einheitentypen mit **Zu Beginn**,
  **Nach dem Kampf** und **Im Kampf verloren**.
- Klassen und Forschungsboni stammen aus dem Bericht; Klassen werden übersetzt.
- Jede gespeicherte Runde lässt sich öffnen und zeigt vorherige und verbleibende
  Einheiten, Rundenverluste, Schüsse, Feuerkraft und absorbierten Schildschaden.
- Reparierte Verteidigung, eigene geborgene Einheiten, Reaper-Sammlung und
  Mondentstehung werden bei vorhandenen Daten getrennt aufgeführt.
- Fehlende historische Angaben heißen **Nicht aufgezeichnet**. Ohne gespeicherte
  Runden wird kein Endbestand aus dem Anfangsbestand erfunden.

Verbundene Flotten bleiben wie im gespeicherten Bericht je Seite zusammengefasst.
Das vorhandene 3D-Replay und die Nachrichtenaktionen im äußeren Layer bleiben
bedienbar. Das Öffnen der Textdetails lädt keine GLB-Dateien.

## Prüfung und Grenzen

Rector, Pint und PHPStan sind erfolgreich. Die vollständige PHP-Suite besteht
mit 1.223 Tests und 28.010 Assertions (42 bereits vorhandene Hinweise).
Die 108 JavaScript-Tests und der Frontend-Build sind ebenfalls erfolgreich.
Der Browsercheck `tests/Frontend/live3d-report-timing.browser.mjs` prüft im echten
UI bei 115 % Textgröße das fünfstellige Minutenfeld, eine tatsächliche Verkürzung,
deutsche Rückmeldungen, gespeicherte Kampfzahlen, Runden, fehlenden Editorinhalt
und mobile Darstellung. Er benötigt eine isolierte Entwicklungsdatenbank,
`LIVE_BASE_URL`, `LIVE_ACCOUNT_FILE`, `PLAYWRIGHT_MODULE` und eine Fixturedatei
`storage/app/report-timing-ui-fixture.json` mit eigenen IDs `message` und `mission`.
Der Check verändert die Flugzeit seines Testauftrags und ist nur für Testdaten
geeignet.

Der bestehende 3D-Replay-Browsercheck besteht ebenfalls: Aufruf im Nachrichten-
Layer, Modelle erst bei Bedarf, Rundenzahlen, Steuerung, Ende, mobile Ansicht,
WebGL-Ersatzansicht und Freigabe der Grafikressourcen. Sein Screenshotcheck
berücksichtigt, dass langsames Software-Rendering länger als die Animation dauern
kann, und startet eine bereits beendete Animation beim Prüfen von Pause nicht neu.

Es gibt keine neue Migration und keine Änderungen an Kampfberechnung, gespeicherten
Berichten, Schiffsmodellen oder Spielständen. Kein produktives Deployment.
