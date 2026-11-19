# Botstrategie in der Verwaltung steuern

Unter **Verwaltung → Autonome Bots** lässt sich eine eigene Strategie je Bot
aktivieren. Die drei Gewichtungen steuern Flottenbau, Wirtschaft und Forschung.
Die Oberfläche berechnet unmittelbar die entsprechenden Prozentanteile.
Beispielsweise bedeuten `2 : 1 : 1` und `50 : 25 : 25` jeweils 50 % Flottenbau,
25 % Wirtschaft und 25 % Forschung.

Zusätzlich sind einstellbar:

- **Ziele alle … Entscheidungen prüfen:** 1 bis 12 Botentscheidungen. Bei einem
  Entscheidungsabstand von 120 Sekunden bedeutet der Wert 3 ungefähr sechs Minuten
  zwischen Zielprüfungen. Ein freier Flottenslot, Treibstoff, geeignete Ziele und
  aktivierte Raids sind weiterhin erforderlich.
- **Erforderlicher Stärkevorteil:** 1,0- bis 10,0-fach, in Schritten von 0,1.
  Dieser Faktor gilt gleichzeitig für Feuerkraft und Hüllen-/Schildstärke.
  Er ist keine Prozentwahrscheinlichkeit für einen Sieg. Der bisherige
  Standardfaktor ist 3,0.

## Sammeländerung und Rückkehr zu Vorgaben

Der aufklappbare Bereich **Strategie für alle Bots** enthält eine Vorlage für
eine Sammeländerung. **Strategie auf alle Bots anwenden** ersetzt nach Bestätigung
nur die Strategiewerte aller vorhandenen Bots, einschließlich pausierter Bots.
Namen, Profile, Automatikschalter, Zyklen, Rohstoffe und Schiffsbestände bleiben
erhalten. Bei einer einheitlichen gespeicherten Strategie liest die Sammelvorlage
deren Werte nach einem Seitenreload wieder ein.

Anschließend können einzelne Bots abweichend eingestellt werden. Das Abschalten
von **Eigene Strategie verwenden** stellt diesen Bot auf seine Profilvorgaben
zurück. **Alle auf Profilvorgaben zurücksetzen** entfernt nach Bestätigung sämtliche
individuellen Strategien.

Ohne eigene Strategie bleibt der bisherige Entscheidungsablauf unverändert:
Ausgewogene und Entdecker-Bots mit Raids bevorzugen standardmäßig die Flotte in
zwei von vier Strategieentscheidungen. Ohne Raids beziehungsweise im Wirtschafts-
profil gelten die bisherigen zurückhaltenden Vorgaben. Das Wirtschaftsprofil
greift weiterhin nur unbewachte Ziele an; das wird durch einen anderen
Stärkefaktor nicht aufgehoben.

## Bedeutung der Gewichtungen

Die Gewichte liegen jeweils zwischen 0 und 100; mindestens eines muss positiv
sein. Es sind Verhältnisse, keine Zufallswahrscheinlichkeiten und keine zwingende
Summe von 100. Eigene Prioritäten werden deterministisch und gleichmäßig über
Zyklen verteilt. Eine unreduzierte Eingabe erzeugt somit keine langen Blöcke von
50 Flottenentscheidungen vor dem ersten Wirtschaftszug.

Ein Gewicht von null bedeutet keine bevorzugten Züge für diesen Bereich. Es
deaktiviert weder den Automatikschalter noch erforderliche Voraussetzungen oder
den vorhandenen Wirtschaftsausbau als Ausweichaktion. Fehlende Rohstoffe, laufende
Aufträge, Forschungsvoraussetzungen, Expeditionen, Flottensicherung und erfolgreiche
Flottenstarts können die tatsächlich ausgeführten Anteile verändern.

Die Einstellungen wirken bei der nächsten Botentscheidung. Es werden durch das
Speichern keine Bauaufträge oder Missionen ausgeführt und keine pausierten Bots
aktiviert. Alte API-Clients, die `strategy` nicht mitsenden, überschreiben eine
bereits gespeicherte Strategie nicht.

## Speicherung, Zugriff und Validierung

Die additive Migration
`2026_11_19_010000_add_strategy_to_autonomous_bots_table.php` ergänzt eine nullable
JSON-Spalte. `null` bedeutet Profilvorgabe. Bestehende Bots bleiben unverändert;
es gibt keinen Datenreset und keine Neuanlage von Botkonten. Das vorhandene
Testupdate-Skript führt die neue benannte Migration automatisch aus.

Lesen und Schreiben der Strategie sind Administratoren vorbehalten. Schreibzugriffe
prüfen das CSRF-Token. Unbekannte Schlüssel, unvollständige Strategien, Gewichte
außerhalb 0–100, ausschließlich nullgewichtete Prioritäten und ungültige Prüf-
abstände oder Stärkefaktoren werden zurückgewiesen. Sammeländerungen laufen in
einer Transaktion mit denselben Botsperren wie reguläre Entscheidungen.

Kampfformeln, Produktionsregeln, Modelle und Spielstände werden nicht geändert.
Insbesondere bleiben unbekannte Feindkräfte unbekannt und aktive menschliche
Spieler von der bisherigen Bot-Zielauswahl ausgeschlossen.

## Prüfungen

Unit-Tests prüfen äquivalente Verhältnisse, gleichmäßige Verteilung und Nullgewichte.
Backendtests prüfen Rollen, CSRF, Validierung, Einzel- und Sammelspeicherung,
Profilreset, Kompatibilität alter Clients und die tatsächliche Auswirkung auf
Forschungs-, Bau- und Angriffsentscheidungen. Der Browsercheck
`tests/Frontend/live3d-bot-strategy.browser.mjs` prüft die echte Oberfläche bei
115 % Schriftgröße, Prozentvorschau, Neuladen, Sammeländerung, Einzelabweichung,
Reset und mobile Darstellung.

Der Browsercheck benötigt `LIVE_BASE_URL`, `LIVE_ACCOUNT_FILE`,
`PLAYWRIGHT_MODULE` und die isolierten Bot-IDs aus
`storage/app/bot-aggression-ui-fixture.json`. Er ändert Strategien aller Bots
seiner Entwicklungsdatenbank und darf ausschließlich auf Testdaten ausgeführt
werden.

Ergebnisse: Rector, Pint und PHPStan erfolgreich; 29 gezielte Bot-Tests und die
vollständige PHP-Suite mit 1.239 Tests und 28.184 Assertions bestanden
(42 bestehende Hinweise). Die 110 JavaScript-Tests, der Build und der Browsercheck
bestehen ebenfalls. Der zusätzliche Flotten-Paralleltest besteht in fünf
Durchläufen. Der bereits zuvor fehlschlagende separate Produktions-Paralleltest
hat weiterhin denselben Vorbereitungsfehler: Vor seinen HTTP-Anfragen existiert
kein Bauauftrag, anschließend werden null statt zehn Jäger geprüft.

Kein produktives Deployment wurde durchgeführt.
