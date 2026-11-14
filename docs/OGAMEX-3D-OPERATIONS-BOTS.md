# Native Flotten, Galaxieaktionen und autonome NPCs

Branch: `codex/ogamex-3d-fleet-galaxy-bots`, aufbauend auf dem zuvor ausgelieferten Shop-/Offiziersstand. Der Hauptbranch und bestehende Abhängigkeiten/Lockfiles bleiben unverändert.

## Im Browser

Nach dem Update die bestehende Installation unter `/play-3d` neu laden.

- **Flotten:** Schiffe aus dem verfügbaren Bestand wählen, eigenes Ziel übernehmen oder Koordinaten eingeben, Zieltyp/Mission/Geschwindigkeit/Fracht festlegen. Die Flugprüfung verwendet die ursprünglichen OGameX-Dienste für Missionen, Flugzeit, Treibstoff und Kapazität. Erst „Flotte verbindlich starten“ startet eine Mission. Keine automatische Wiederholung von Schreibzugriffen. Zusammenstellungen lassen sich als Vorlagen speichern, laden und löschen; Vorlagen reservieren keine Schiffe. Auch Millionenbestände bleiben Mengenangaben.
- **Flottenbewegungen:** Eigene und ankommende Missionen, Rückkehrzeiten, eigene Zusammensetzung und zulässiger Rückruf. Kampfverbände werden über die Originalaktion angelegt/eingeladen und können in der Planung ausgewählt werden. Taktischer Rückzug verwendet ebenfalls die Originaleinstellungen einschließlich Admiralvoraussetzung.
- **Galaxie:** Koordinatenänderungen laden unmittelbar das neue System. „Weitere Aktionen“ öffnet eine positionsbezogene Karte innerhalb der Galaxie, statt über die alte Galaxieseite zurückzuspringen. Planet, Mond und Trümmerfeld haben getrennte Missionsziele. Kolonisieren, Spionieren und andere Flottenaktionen führen in die native Planung; ein Klick sendet noch keine Flotte. Phalanx und Raketenangriff verwenden die vorhandenen Prüfungen und Kosten. Nachrichten, Freundschaftsanfragen, Allianz und Highscore bleiben mit den bestehenden Diensten verbunden. Eine Umsiedlung einer freien Position verwendet den ursprünglichen kostenpflichtigen Ablauf.
- **Aktuelle Aufträge:** Alle laufenden und vorgemerkten Gebäude-, Forschungs- und Einheitenaufträge aller eigenen Planeten und Monde, mit Herkunft und Zielstufe/Menge. Anklicken wechselt bei Bedarf zuerst zum betroffenen Himmelskörper. Wartende Gebäude/Forschungen haben im Original noch keine verbindliche Bauzeit; dies wird ausdrücklich angezeigt. Begonnene und bereits terminierte Einheitenaufträge haben einen Countdown.
- **Zeitformat:** `Tage: 1 Stunden: 2 Minuten: 3 Sekunden: 4` für Produktionsdauer, Restzeiten, Flotten und 3D-Fertigungsanzeige.
- **Voraussetzungen:** Grün mit ✓ und „Erfüllt“, rot mit ✕ und „Fehlt“, jeweils vorhandene/benötigte Stufe. Geplante Stufen gelten in dieser Statusanzeige noch nicht als vorhanden. Dass OGameX Bauaufträge mit vorgemerkten Voraussetzungen zulassen kann, bleibt unverändert. Auch die technische Voraussetzungsliste wurde ergänzt.

## Bots in der Verwaltung

Unter **Verwaltung → Autonome Bots** stehen folgende Einstellungen bereit:

1. Neuen NPC mit eindeutigem Namen `BOT-Name` anlegen. Das erzeugt ein eigenes normales Spielerprofil, Forschung und Planeten über die vorhandene Initialisierung. Bestehende Spieler werden nicht umgewandelt. Das zufällige Anmeldepasswort wird nicht ausgegeben.
2. Verhalten wählen: **Wirtschaft**, **Ausgewogen** oder **Entdecker**. Alle Profile bauen; ausgewogene Bots und Entdecker erschließen zusätzlich Forschung und Schiffsproduktion. Entdecker schicken vorhandene kleine Transporter auf originale Expeditionen, maximal eine gleichzeitig.
3. Entscheidungsabstand (60–3600 Sekunden), Höchststufe (1–30), Bestandsziel je Schiffstyp/Planet (0–10.000) und Einheiten je Auftrag (1–100) einstellen.
4. **Autonom aktiv** aktivieren oder zum Pausieren deaktivieren und speichern. Neue Bots sind im Formular zunächst pausiert.
5. Optional einmalig Testrohstoffe bei der Erstellung vergeben (0 = normaler Start). Es gibt keine laufenden Gratisressourcen, verkürzten Bauzeiten oder automatischen DM-Käufe. Ein einzelner manueller Entscheidungsschritt ist bei aktiven Bots möglich.

Jeder Entscheidungsschritt stellt höchstens **einen** neuen Auftrag oder eine Expedition ein. Die Verarbeitung wechselt zwischen eigenen Kolonien und aktualisiert deren Originalproduktion. Rohstoffe, Bauplätze, Voraussetzungen, Warteschlangen, Schiffsklassen und Flüge bleiben in OGameX. Bei fehlenden Mitteln wartet der Bot; Urlaub/Adminrolle deaktivieren ihn. Menschliche Spieler werden nicht autonom angegriffen oder angeschrieben. Automatische Kampf-, Handels- oder Kolonisationsstrategien sind in diesem ersten NPC-Modul nicht enthalten.

Dies ist ein **eigenes, in OGameX integriertes NPC-Modul**. Die früher erwähnte GitHub-Erweiterung wurde mangels Repository-Adresse nicht importiert. Sie kann nach eindeutiger Zuordnung geprüft und gegebenenfalls angebunden werden.

### Regelmäßige Ausführung

Der Laravel-Scheduler enthält:

```sh
php artisan ogamex:bots:tick --limit=20
```

Die Anweisung läuft jede Minute; pro Aufruf maximal 20 fällige NPCs, maximal 100 verwaltete NPCs. Ein Cache-Lock und eine erneute Prüfung unter Datenbanksperre verhindern gleichzeitige Entscheidungen desselben Bots. Ein Fehler löst eine Wartezeit von fünf Minuten aus; Details stehen im Laravel-Protokoll. Die Adminansicht zeigt die letzte Entscheidung und den zuletzt beobachteten Takt.

Bei der nativen Testinstallation richtet der Updatehelfer zusätzlich einen eigenen Cron-Eintrag für den aufrufenden Benutzer ein. Vorhandene Einträge bleiben erhalten; wiederholte Aufrufe erzeugen keine Duplikate. Falls der reguläre Laravel-Scheduler bereits läuft, verhindern die Sperren/das Fälligkeitsdatum doppelte Bot-Entscheidungen. Es werden keine Dienste neu gestartet und keine Pakete installiert.

Bei Bedarf separat aus dem Projektverzeichnis:

```sh
bash scripts/codex/enable-bots-cron.sh
```

Fehlt `crontab`, muss der bereits vorhandene Laravel-Scheduler jede Minute `php artisan schedule:run` ausführen. Ohne Taktgeber funktioniert weiterhin der manuelle Entscheidungsschritt. In der vorbereiteten Codex-Docker-Umgebung ist der Laravel-Scheduler bereits vorhanden.

## Bestehende Testinstallation aktualisieren

Keine Neuinstallation und kein zweites Spiel erforderlich. Auf dem bestehenden Testbranch in `/home/ogamedev/OGameX` arbeiten. Der Updatehelfer lehnt `main`/`master`, lokale Änderungen und Mergekonflikte ab und legt vor dem Merge einen Sicherungsbranch sowie eine Sicherung von `public/build` an.

```sh
cd /home/ogamedev/OGameX
git fetch https://github.com/Nostago/ogamex-3d.git codex/ogamex-3d-fleet-galaxy-bots
release=$(git rev-parse FETCH_HEAD)
git show "$release:scripts/codex/update-test-interface.sh" > /tmp/ogamex-3d-update.sh
bash /tmp/ogamex-3d-update.sh "$release"
```

Für einen reproduzierbaren Stand kann statt des ermittelten `release` der vollständig veröffentlichte Commit aus der Übergabe verwendet werden. Nach dem Merge aktualisiert der Helfer nur den Autoloader, die ausdrücklich benannten additiven Premium-/NPC-Migrationen sowie Route-/View-Cache und richtet den Bot-Takt ein. Keine `composer install`, `composer update`, `npm install` oder Containerneustarts. Die kompilierten Browserdateien liegen im Repository. Die lokale Reverb-Anpassung der bestehenden Installation wird nicht verändert.

Neue Migration: `database/migrations/2026_11_14_160000_create_autonomous_bots_table.php`. Eine Rückkehr zum Sicherungsbranch stellt den vorherigen Code wieder her. Zuerst Bots pausieren; den mit `ogamex-autonomous-bots:` markierten Cron-Eintrag bei einem vollständigen Rückbau entfernen. Die zusätzliche Tabelle darf als Datensicherung bestehen bleiben; keine bestehenden Spieltabellen werden zurückgesetzt.

## Prüfung

Aus der vorbereiteten Cloud-Umgebung:

```sh
sh scripts/codex/compose.sh exec -T ogamex-app composer run rector
sh scripts/codex/compose.sh exec -T ogamex-app composer run cs
sh scripts/codex/compose.sh exec -T ogamex-app composer run stan
sh scripts/codex/compose.sh exec -T ogamex-app composer run tests -- --filter='Live3d|AutonomousBots|Commerce'
node --test tests/Frontend/Live3d.test.mjs
umask 022
npm run build
```

Featuretests prüfen unter anderem globale Aufträge, tatsächliche Voraussetzungsebenen, verfügbaren Millionenbestand, native Flugprüfung/Start/Rückruf, fremde Planeten/ungültige Tokens, originale Raketen-/Phalanxaktionen und -kosten, NPC-Kosten, Forschung/Produktion/Expeditionen, Intervalle und Pause.

`tests/Frontend/live3d-operations.browser.mjs` prüft am echten Browser Flottenstart/Rückruf, Galaxiekarten ohne Rücksprung, Kolonisationsplanung, Voraussetzungshinweise, alle Auftragstypen, Zeitformat, NPC-Erstellung/Entscheidung/Pause und Mobilansicht. Es benötigt einen **isolierten vorbereiteten Admin-Testaccount** mit zwei Planeten; keine produktiven Spieler verwenden. Die Testdaten sind anschließend zu entfernen.

Ergebnis dieser Etappe: Rector, Pint, PHPStan, 36 Featuretests (5.432 Assertions), 7 JavaScript-Tests und der Browserablauf bestanden. Zwei gleichzeitig gestartete NPC-Ticks erzeugten genau eine Entscheidung und einen Bauauftrag. Die originalen Parallelitätstests für Einheiten und Missionen bestanden jeweils fünf Durchläufe mit zehn parallelen Anfragen. Für den Einheitentest wurden vorübergehend zwei Registrierungsplaneten verwendet und danach die Einstellung wiederhergestellt: Bei nur einem Startplaneten behält dessen unveränderter Testhelfer nach Erzeugung des zweiten Planeten einen veralteten PlanetService. Containerinterne HTTP-Aufrufe mussten außerdem ohne den Cloud-Ausgangsproxy erfolgen.
