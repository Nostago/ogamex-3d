# Schiffsgutschriften durch die Verwaltung

Unter **Verwaltung → Schiffe erstatten** kann ein Administrator Schiffe auf einem
beliebigen bestehenden Spielerplaneten oder Mond hinzufügen:

1. Spieler über Namen oder Spieler-ID suchen und auswählen.
2. Zielplanet oder Zielmond ausdrücklich auswählen. Name, Koordinaten und
   Empfänger werden vor der Gutschrift angezeigt.
3. Schiffstyp und positive Menge wählen; optional einen Grund eintragen.
4. Vorschau mit bisherigem und anschließendem Bestand prüfen und
   **Schiffe gutschreiben** betätigen.

Die Menge wird addiert. Bereits vorhandene Schiffe, laufende Bauaufträge,
Rohstoffe und Flotten bleiben bestehen. Der Administrator bleibt auf seinem
eigenen ausgewählten Planeten. Für Ersatzleistungen werden keine Rohstoffe
abgezogen und keine Forschungs- oder Bauvoraussetzungen verlangt. Einschränkungen
des Himmelskörpers gelten weiterhin, beispielsweise Crawler nur auf Planeten.

Nach erfolgreicher Gutschrift erscheint ein Beleg. Eine weitere Gutschrift muss
über **Neue Gutschrift vorbereiten** ausdrücklich begonnen werden. Bei verloren
gegangener Rückmeldung prüft **Gutschrift erneut prüfen** denselben Auftrag.
Der offene Auftrag bleibt im aktuellen Browser-Tab auch nach dem Neuladen erhalten.
Die letzten zehn Gutschriften des ausgewählten Spielers werden darunter angezeigt.

## Zugriff und Speicherung

Alle drei Endpunkte erfordern eine angemeldete Person mit Administratorrolle.
Schreibzugriffe prüfen zusätzlich das CSRF-Token. Zielbesitzer, Planetentyp,
Zerstörungsstatus, Schiffstyp, Menge und Bestandsobergrenze werden vor dem
Schreibzugriff geprüft. Der Einzelauftrag ist auf eine Milliarde Schiffe begrenzt;
der Gesamtbestand darf die bestehende vorzeichenbehaftete 32-Bit-Spalte nicht
überschreiten.

Eine Transaktion sperrt die betroffenen Datensätze und erhöht ausschließlich die
gewählte Schiffsspalte atomar. Das Protokoll enthält Administrator, Empfänger,
Ziel, Schiffstyp, Menge, Vorher-/Nachherbestand, Zeitpunkt und optionalen Grund.
Eine eindeutige Auftragskennung verhindert doppelte Gutschriften bei wiederholten
Anfragen. Dieselbe Kennung mit anderem Inhalt wird zurückgewiesen.

Neue additive Migration:

`database/migrations/2026_11_18_230000_create_admin_ship_grants_table.php`

Sie legt nur die Belegtabelle an; bestehende Spielstände und Schiffsmengen werden
nicht verändert. Das bestehende Testupdate-Skript führt diese benannte Migration
aus. Schiffsmodelle und Vorschaubilder sind unverändert.

## Validierung

- Rector, Pint und PHPStan erfolgreich.
- PHP-Suite: 1.219 Tests bestanden, 27.714 Assertions; 42 bestehende Hinweise.
- JavaScript-Suite: 108 Tests bestanden; Frontend-Build erfolgreich.
- Browserprüfung mit isolierter Entwicklungsdatenbank: fremder Planet und Mond,
  korrekte Addition und Belege, unveränderter eigener Bestand, wiederholte sowie
  echte parallele HTTP-Anfragen, verlorene Antwort mit Wiederaufnahme nach
  Neuladen, mobile Darstellung und keine JavaScript-Fehler.
- Bestehender Flotten-Paralleltest: fünf Durchläufe erfolgreich.
- Einschränkung des zusätzlichen bestehenden Produktions-Paralleltests: Er
  bereitet hier keinen Bauauftrag vor (vor den HTTP-Anfragen bereits null
  Queueeinträge) und scheitert anschließend mit null statt zehn Jägern.
  Produktions- und Flottenmechanik wurden für diese Funktion nicht geändert.

Browsercheck: `tests/Frontend/live3d-ship-grants.browser.mjs`. Er benötigt einen
laufenden Entwicklungsserver, `LIVE_BASE_URL`, `LIVE_ACCOUNT_FILE`,
`PLAYWRIGHT_MODULE` und isolierte Empfänger-Fixtures in
`storage/app/shipgrant-ui-fixture.json` (`user`, `world`, `moon`). Dieser Test
schreibt Schiffsgutschriften und darf nur auf Testdaten laufen.

Es wurde kein produktives Deployment durchgeführt.
