# Nachrichtendetails, Fortschrittsanzeige und DETROID

Branch: `codex/ogamex-3d-message-dialogs`.

## Nachrichten

Detailberichte öffnen als modaler Layer im äußeren neuen UI. Sie werden nicht mehr als altes Dialogfenster an das Ende des eingebetteten Nachrichtenbereichs angehängt. Der Layer unterstützt Blättern, Schließen mit Escape, Rückgabe des Fokus, mobile Breiten und einen sichtbaren Löschen-Button. Verspätete Antworten werden nach Schließen oder einem weiteren Bericht verworfen.

Spionageberichte haben eine native Darstellung mit Rohstoffkarten, lesbaren Objektlisten und den vorhandenen kleinen Schiffsabbildungen. Flotte, Verteidigung, Gebäude und Forschung bleiben getrennt. Ein unbekannter Scanabschnitt wird ausdrücklich als unbekannt angezeigt; eine tatsächlich gescannte leere Liste wird als leer dargestellt. Angreifen und Spionieren öffnen die vorhandene native Flottenplanung mit den Koordinaten und dem Planet-/Mondtyp des Berichts. Es wird dabei keine Mission automatisch versendet.

Kampfberichte verwenden weiterhin die Originaldaten und die vorhandene Berichtsvorlage innerhalb des neuen Layers, mit lesbarer Schrift und neutralen Tabellen. Alte Platzhalter-Aktionen für nicht implementierte API-/Teilen-Funktionen werden im Layer nicht als scheinbar bedienbare Buttons angeboten. Berichtsskripte werden nicht im äußeren UI ausgeführt. Die klassische Ansicht bleibt verfügbar.

Jede Nachricht besitzt einen sichtbaren Löschen-Button in der Liste. Zusätzlich gibt es „Gelesene Nachrichten dieser Seite löschen“. Letzteres löscht nur ausdrücklich übergebene IDs, die dem angemeldeten Spieler gehören und bereits als gelesen gespeichert sind. Ungelesene Nachrichten, Nachrichten anderer Spieler und nicht ausgewählte Seiten bleiben erhalten. Es gibt eine Bestätigung vor dem Löschen. Der Sammelbutton ist während einer leeren oder noch ladenden Liste deaktiviert. Die vorhandenen Nachrichten-Endpunkte, Lesestatus- und Berechtigungsregeln bleiben die Grundlage; Löschanfragen prüfen zusätzlich ausdrücklich den CSRF-Token.

## Fortschrittsfenster

Die alte einzeilige Restzeitanzeige über der Bau-/Produktionsvorschau ist durch vier kompakte Felder für Tage, Stunden, Minuten und Sekunden ersetzt. Der Prozentwert bleibt daneben sichtbar. Das vorhandene `renderDuration` erzeugt dieselbe Feldstruktur wie bei den Flotten-Tooltips, mit kleineren Abständen und Schriftgrößen für das Vorschaufenster. Eine begrenzte Skalierung hält die Felder auch auf schmalen Geräten lesbar. Bauanimation und Modellrotation bleiben erhalten; Zeit- und Bestandsentscheidungen kommen weiterhin ausschließlich aus dem Backend.

## DETROID und alte Werftaufträge

Reine Raketenwerfer-Aufträge wurden mit Bronze-, Silber- und Gold-DETROID sowie teilweise fertigen großen Aufträgen geprüft. Die normale Bauzeit pro einzelner Einheit ändert sich durch DETROID nicht. Stattdessen wird die vorhandene Werftwarteschlange vorgezogen und bereits fertige Stückzahlen werden ausgegeben.

Zusätzlich wurde ein Fehler bei alten Sofortabschluss-Datensätzen behoben: Ein Auftrag konnte ein bereits abgelaufenes Enddatum haben, obwohl sein ursprünglicher Start noch in der Zukunft lag. Die Einheitenverarbeitung berücksichtigt jetzt auch solche bereits fälligen Endtermine. Vollständig ausgegebene Datensätze werden als verarbeitet abgeschlossen, ohne Einheiten erneut zu vergeben. Ein DETROID ohne mögliche Zeitverkürzung wird nicht verbraucht.

Nach jeder neuen Shop-Aktivierung zeigt die Bestätigung nun das tatsächliche Ziel, die wirklich angerechnete Zeit, die Zahl abgeschlossener Aufträge und die Zahl fertiggestellter Schiffe/Verteidigungseinheiten. Die JSON-Antwort enthält dieselben Zahlen unter `effect`. Eine Wiederholung derselben Aktivierungsanfrage meldet die bereits erfolgte Aktivierung, ohne nochmals einen Gegenstand zu verbrauchen. Dafür ist keine Datenbankmigration nötig.

Die genaue Ursache der gemeldeten fehlenden Wirkung auf dem VPS konnte ohne dessen Warteschlangendaten nicht direkt festgestellt werden. Der lokale End-to-End-Test mit 100 Raketenwerfern weist für Bronze-DETROID 1.800 Sekunden und zwei fertiggestellte Raketenwerfer im getesteten Aufbau nach. Die neue Bestätigung macht die tatsächliche Wirkung auch dort überprüfbar.

## Prüfungen und Bereitstellung

- Rector, Pint und PHPStan.
- Backendtests für Nachrichteneigentum, Lesestatus, Löschen, CSRF, Spionage- und Kampfberichte, reine Verteidigungswarteschlangen, alte Sofortabschluss-Einträge und doppelte Aktivierungen; außerdem die vorhandenen Live-UI-, Nachrichten-, Shop- und Werfttests.
- Node-Tests der bestehenden Modelle, Karten, Kamera- und Zeitfunktionen.
- Browsertest `live3d-message-dialogs.browser.mjs`: Layer, Berichtsdaten, Navigation, echte Flottenaktionen ohne Start, mobile Ansicht, Escape, Einzel- und Sammellöschen, DETROID-Kauf und -Aktivierung sowie kompakte Countdown-Felder bei 100 % und 160 % Textgröße.
- Bestehende parallele Werft- und Flottenmissionstests mit jeweils fünf Durchläufen.

Das gebaute Frontend ist enthalten. Der gewohnte Updatehelfer aktualisiert die bestehende Testinstallation und leert die kompilierten Ansichten. Keine neuen Abhängigkeiten, Migrationen oder Dienstneustarts. `main` bleibt unverändert.
