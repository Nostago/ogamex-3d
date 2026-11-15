# Planetenname, getrennte Schriftgrößen und stabile Scrollposition

Branch: `codex/ogamex-3d-ui-controls-scroll`.

## Eigene Planeten und Monde umbenennen

In **Planet / Mond** steht neben dem Namen **Planet / Mond umbenennen**. Der Dialog zeigt Name und Koordinate des ausgewählten Körpers. Speichern verwendet die vorhandene OGameX-Namensprüfung und Umbenennung. Die Aktion enthält die ausdrückliche eigene Planeten-/Mond-ID und den Sitzungstoken; ein anderer Browser-Tab darf das Ziel nicht verändern. Fremde Planeten sind nicht umbenennbar.

Namen unterliegen den Originalregeln, insbesondere 2–20 Zeichen und lateinische Buchstaben, Ziffern sowie zulässige Leerzeichen, Bindestriche und Unterstriche. Fehler erscheinen im Dialog. Nach Erfolg werden Auswahl, Planetenüberschrift und Systemkarte aktualisiert. Keine neue Umbenennungslogik oder Datenbankmigration.

## Lesbarkeit

Unter **Einstellungen → Lesbarkeit** gibt es getrennte Zahlenfelder für **Beschreibungen und Bedienelemente** sowie **Überschriften**. Beide erlauben 80–160 % in 1-%-Schritten, auch über die Pfeiltasten. Zurücksetzen setzt beide auf 100 %.

Bei 100 % sind Überschriften um 20 % kleiner als bisher. Die Text-Grundgröße bleibt erhalten. Eine Änderung der Textgröße beeinflusst die Überschriften nicht und umgekehrt. Die Einstellungen gelten auch in den eingebetteten Spielbereichen und werden pro Gerät im Browser gespeichert. Vorhandene Einstellungen mit 100/115/130/150 % werden als Textgröße übernommen; die neue unabhängige Überschriftengröße beginnt bei 100 %.

## Scrollen

Die natürliche Höhe der eingebetteten Spielseiten wird weiterhin gemessen, damit Nachrichten, Shop und andere Bereiche mit der ganzen Seite wachsen. Während des kurzen Messens wird der Platz im äußeren Dokument reserviert. Die äußere Scrollposition bleibt erhalten. Damit verkleinern periodische Aktualisierungen die gesamte Seite nicht vorübergehend bis zum oberen Rand.

## Prüfung und Update

- Backend: Umbenennen auf einem ausdrücklich ausgewählten eigenen Planeten und Mond, persistierter Name, Originalfehler bei ungültigen Namen, Ablehnung fremder IDs und ungültiger Sitzungstoken.
- Browser: echter Dialog, Fehleranzeige, Schutz vor doppeltem Absenden, Namenspersistenz nach Neuladen und Anzeige im Planetenselektor; mobiler Dialog.
- Browser: gemessene unabhängige Schriftgrößen, 20 % kleinere Standardüberschrift, 1-%-Schritte, Übernahme alter Einstellungen und Persistenz.
- Scrollprüfung auf tatsächlichen Nachrichten-, Highscore-, Shop- und Einstellungsseiten über mehrere HUD-Aktualisierungen und wiederholte Inhaltsänderungen. Bei kurzen lokalen Seiten verlängert ein ausschließlich im Test eingeblendeter Block den Inhalt, damit wirklich gescrollt werden kann.

Die gebauten Browserdateien sind enthalten. Den vorhandenen Updatehelfer mit dem veröffentlichten vollständigen Commit-SHA aufrufen und anschließend `/play-3d` neu laden. `main`, Abhängigkeiten und Lockfiles bleiben unverändert.
