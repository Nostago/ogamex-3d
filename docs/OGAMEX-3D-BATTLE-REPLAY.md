# Kampfreplay und eindeutige Bauwarteschlange

Entwicklungsbranch: `codex/ogamex-3d-battle-replay`, aufbauend auf `68a3106b` (Imperium/Flottenkommando). Kein produktives Deployment. Mit Codex umgesetzt.

## Kampfreplay

Im Nachrichtenbereich einen eigenen Kampfbericht über „Details“ öffnen, dann **„Kampf ansehen“**. Die 3D-Ansicht erscheint oberhalb des normalen Berichts im vorhandenen Nachrichtenlayer. Es gibt Abspielen/Pause, Anfang, einzelne Rundenschritte, eine direkt anwählbare Zeitleiste und 0,5×/1×/2×/4× Tempo. Die Anfangsaufstellung ist separat als Schritt 0 erreichbar. Im Hintergrund pausiert die Wiedergabe; Schließen oder Nachrichtenwechsel beendet die Wiedergabe und gibt die Grafikressourcen frei; verspätete Modell-Ladeergebnisse werden verworfen.

Quelle sind ausschließlich die gespeicherten Felder des Kampfberichts: Anfangseinheiten, Restbestände am Rundenende, Verluste dieser Runde, abgegebene Schüsse, Feuerkraft und absorbierter Schaden. Es wird kein Kampf neu berechnet und weder die PHP- noch die Rust-Kampfengine verändert. Expeditionen behalten die bereits im Bericht gespeicherte NPC-/Spieler-Seitenzuordnung; verbundene Flotten werden entsprechend der gespeicherten Daten je Seite zusammengefasst.

Die Berichte speichern keine einzelnen Schussziele, Flugbahnen oder verbleibenden Schilde pro Schiff. Positionen, Strahlen, Schutzfelder und Verlustpartikel sind ausdrücklich schematische Effekte. Ihre Aktivierung folgt den aufgezeichneten Schüssen, absorbiertem Schaden und Verlusten. Es werden keine Trefferchronologien, Schild-Prozentwerte oder zusätzlichen Kampfergebnisse erfunden. Effekte lassen sich abschalten und respektieren reduzierte Bewegung.

Ein Modell steht für einen Einheitentyp. Exakte Mengen und Verluste stehen daneben in Tabellen; große Flotten erzeugen keine Millionen Grafikobjekte. Je Seite werden höchstens vier Typen gleichzeitig geladen (acht insgesamt), weitere Typen sind unabhängig durchblätterbar. Schiffe verwenden die vorhandenen Upload-GLBs, Verteidigungen die bestehenden prozeduralen 3D-Modelle. Textberichte laden keine GLBs. Bei fehlendem WebGL bleiben Bilder, Tabellen, Zeitleiste und Rundenauswahl nutzbar.

Das Endergebnis zeigt die gespeicherten Rohstoffverluste, Beute und Trümmer. Reparierte Verteidigungen stehen separat nach dem Kampf und werden nicht zu den Überlebenden einer Kampfrunde hinzugerechnet. Nicht gespeicherte Werte bleiben „Nicht aufgezeichnet“; `rounds: null` wird von einem gültigen Bericht ohne Schusswechsel (`rounds: []`) unterschieden.

Zugriff: `GET /play-3d/messages/{messageId}/battle-replay` verlangt eine noch vorhandene eigene Nachricht vom Typ `battle_report`. Eine erratene Berichtsnummer oder die bloße Beteiligung am Kampf gewährt keinen Zugriff. Fremde, gelöschte und andersartige Nachrichten werden abgelehnt. Antworten sind privat und nicht cachebar. Das Replay ändert weder Bericht noch Lesestatus; das normale Öffnen der Nachricht verwendet weiterhin den vorhandenen Nachrichtenablauf.

## Bauanimation und Warteschlange

Ein Wechsel des Bauauftrags lädt dasselbe Schiffsmodell nicht mehr neu. Die bestehende 3D-Ansicht übernimmt den neuesten Auftrag unmittelbar; auch ein während des Downloads eingetroffener Auftrag bleibt erhalten. Queue-Updates und Refresh setzen die Ansicht nicht auf das statische Bild zurück.

Die Einheitenwarteschlange enthält jetzt ausdrücklich `active: true` nur für den obersten Auftrag. Im Baubereich stehen **„Wird gebaut“** und **„Wartet“** direkt an den Aufträgen. Ein ausgewählter wartender Schiffstyp erhält einen Hinweis, dass seine Animation erst beim tatsächlichen Start beginnt. Folgeaufträge zeigen ihre eigene voraussichtliche Baudauer als geplante Dauer statt eines scheinbar aktiven Baucountdowns. Auch Imperium und globale Auftragsliste verwenden diese Unterscheidung. Beim Nachrücken wird die Animation mit dem nächsten Server-Snapshot übernommen. Produktionsregeln und Ausführungszeiten bleiben unverändert.

## Validierung

- Rector, Pint und PHPStan erfolgreich. **107 JavaScript-Tests bestanden**, Frontend-Build erfolgreich. Vollständige PHP-Suite: **1.214 bestanden, 42 Hinweise, 27.638 Assertions**. Zusätzlich 16 gezielte Tests zu Replay, Warteschlange und vorhandener Oberfläche bestanden.
- PHP-Featuretests: Nachrichtenbesitz/gelöschte Verknüpfung, unveränderte Berichte, genaue Rundendaten, große Integerwerte, fehlende Daten, NPC-Seiten und Rückzug ohne Schusswechsel. Zusätzlich erste/folgende Bauaufträge und tatsächliches Nachrücken unter kontrollierter Testzeit.
- `tests/Frontend/live3d-battle-replay.browser.mjs`: echte gebaute Spieloberfläche mit Login, Kampfbericht im Nachrichtenlayer, verzögerter Modellstart, genaue Mengen/Verluste/Beute, Steuerung, Ende, mobile Breite, WebGL-Ausfall, Schließen/Wiederöffnen sowie echter Schiffsauftrag in der getrennten UI-Testdatenbank. Canvas-Identität bleibt beim Baubeginn und Refresh erhalten; Folgeauftrag ist eindeutig markiert.
- UI-Bilder: `/workspace/ogamex-cloud/battle-artifacts/`.

Ausschließlich separate Entwicklungsdatenbanken mit Präfix `ogamex_ship_model_checks_20261118` und `ogamex_ship_models_ui_20261118`. Keine neuen Migrationen oder Abhängigkeiten. Alle vorhandenen Schiffsmodelle, Bilder und Spielstände bleiben erhalten. Der bestehende Test-Updatehelfer kann den gebauten Stand übernehmen.
