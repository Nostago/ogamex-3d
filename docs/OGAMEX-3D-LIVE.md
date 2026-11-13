# Neue Oberfläche am vorhandenen OGameX-Backend

## Grundentscheidung

Die neue Spieloberfläche verwendet Laravel und die vorhandenen OGameX-Services
als verbindliche Instanz für Spielstände und Regeln. Produktion, Kosten, Bauzeit,
Voraussetzungen, Forschung, Warteschlangen, Flotten und Kampf werden nicht in
JavaScript nachgebaut. Die bisherige ZIP 0.13 bleibt eine separate Offline-Demo;
ihre lokale Simulation und ihr Browserspeicher werden in der Live-Ansicht nicht
importiert und verändern keinen echten Account.

## Im Browser öffnen

Eine laufende, bereits eingerichtete OGameX-Installation verwenden. Änderungen
dieses Entwicklungsbranches übernehmen, vorhandene Abhängigkeiten weiterverwenden
und bei eigener Entwicklung `npm run build` ausführen. Der Entwicklungsbranch enthält bereits gebaute Browserdateien; auf dem Testserver ist kein Node-Build nötig. Es gibt keine neuen Abhängigkeiten, Migrationen oder
Lockfile-Änderungen und keinen Wechsel des bestehenden Datenbanksystems.

Am OGameX-Server anmelden und oben in der Originaloberfläche **3D-Oberfläche**
anklicken. Alternativ auf derselben Serveradresse **`/play-3d`** öffnen.
Beispiel bei einer bereits erreichbaren Installation:
`https://dein-ogamex-server.example/play-3d`.

Die Serveradresse muss vom eigenen Rechner aus erreichbar sein. Das ist eine
Serveranwendung mit Anmeldung und Datenbank, keine per Doppelklick ausführbare
Live-ZIP. Die Cloud-interne Loopbackadresse ist keine Vorschauadresse für den
Benutzer. Es wird durch diesen Branch kein öffentlicher Server bereitgestellt.

## Umgesetzte Bereiche

- **Planet und Mond:** eigene Himmelskörper auswählen; echte Rohstoffbestände,
  Lagergrenzen, Produktionsraten, Energiewerte und Baufelder. Kolonie/Orbit,
  Maussteuerung, Zoom und Rotation der vorhandenen prozeduralen 3D-Szene.
- **Gebäude:** alle für den Himmelskörper gültigen Ressourcenanlagen,
  Einrichtungen und Verteidigungsobjekte aus dem vollständigen Originalkatalog.
  Kosten, Voraussetzungen, Bauzeit, Bestände und Aufträge stammen vom Server.
  Gebäudeausbau und Gebäudeabbruch werden an die Originalcontroller delegiert.
- **Forschung:** vollständiger Originalkatalog und globale Forschungswarteschlange,
  neue Forschung und Abbruch über die bestehenden Abläufe. Keine Demo-Stufengrenze.
- **Schiffe:** alle gültigen Originalschiffe, echte vorhandene Stückzahlen und
  serverseitig berechnete maximal baubare Mengen. Mengenaufträge verwenden den
  bestehenden Schiffsbau. Der Server arbeitet angenommene Warteschlangen automatisch
  ab; es gibt keine zusätzliche lokale Start-/Pause-/Erstattungslogik für Einheiten.
- **Galaxie:** eigene Systemübersicht im neuen Stil, Galaxie-/Systemeingabe,
  Vor-/Zurücknavigation, Heimatsystem, Planeten, Monde und Trümmerfelder.
  Sichtbarkeit und angebotene Missionen kommen vom originalen `GalaxyController`.
  Missionslinks öffnen die originale Flottenplanung mit vorausgefülltem Ziel;
  die Auswahl verschickt keine Flotte. Spezialaktionen (z. B. Phalanx, direktes
  Spionieren, Umsiedeln und Kolonisieren) bleiben über die vollständige Originalansicht erreichbar.
- **Flotten und Nachrichten:** vollständige angemeldete Originalansichten
  innerhalb desselben Oberflächenrahmens. Originales Dispatching, Missionen,
  Kampfberechnung, Berichte, Empfänger und Aktionen bleiben erhalten. Diese beiden
  Bereiche sind weiterhin Übergangsansichten mit einem Link zur separaten Originalseite.

## Etappe: Kommandooberfläche

Branch: `codex/ogamex-3d-command-interface` (Fortsetzung des bereits eingebundenen
Live-Backends, zusammenhängender Oberflächenumbau).

- Dunkler blau/türkiser Rahmen, klare Bereichsnavigation, Rohstoffleiste mit
  Beständen, Produktionsraten und Lagerinformationen im Tooltip.
- Interaktiver Planet mit lokal generierter, nahtloser Oberflächentextur und
  Wolkenschicht; keine fremden Bilddienste oder Downloads zur Laufzeit.
- Planetensteckbrief, Produktion/Lagerfüllung, echte Flottenslots, Verteidigung und
  ungelesene Nachrichten. Keine erfundenen Bevölkerungswerte oder zusätzlichen Währungen.
- Auftragsleiste auf der Übersicht: Bau, Forschung und Einheiten, Restzeiten,
  Fortschritt und direkter Sprung zum betreffenden Katalogobjekt. Der Server
  arbeitet Aufträge weiterhin nach den Originalregeln automatisch ab.
- Bebilderte Gebäude-, Forschungs- und Schiffskataloge mit Original-Assets,
  getrennten Kostenfeldern, Voraussetzungen, Mengenwahl und Mengen-Voreinstellungen.
  Ein Schiffstyp zeigt Bestand und noch ausstehende Produktionsmenge gemeinsam.
- Automatische Aktualisierung erhält eingegebene Mengen und Eingabefokus.
  Desktop und schmale Mobilansichten werden im Browser geprüft.

### Bestehenden nativen Testserver aktualisieren

Das Hilfsskript `scripts/codex/update-test-interface.sh` ist ausschließlich für
`/home/ogamedev/OGameX` auf dem bereits eingerichteten Testbranch vorgesehen. Erst
Branch/Commit von GitHub holen, dann die Skriptversion **aus genau diesem Commit**
mit dessen vollständiger SHA aufrufen. Das Skript verweigert `main`/`master`,
ungeprüfte lokale Änderungen und Mergekonflikte; es sichert Commit und gebaute
Assets vor dem Merge. Es installiert nichts, führt keine Migrationen aus und
startet keine Dienste neu. Der bestehende lokale Reverb-Commit bleibt beim Merge erhalten.

Bei einem Fehler nach dem Merge ist der letzte Commit unter dem ausgegebenen
Sicherungsverzeichnis in `commit.txt` dokumentiert, zusätzlich existiert ein
`backup/vor-command-interface-*`-Branch. Nicht blind zurücksetzen: erst Git-Status
und Fehlermeldung prüfen. Die gesicherten Browserdateien liegen in
`public-build.tar.gz`, eine vorhandene Vite-Hot-Datei gegebenenfalls unter `public-hot`.


Der Live-Bereich besitzt keine Demo-Zeitsprünge, Testbestandsknöpfe, lokalen
Rohstoffberechnungen oder Spielstandsresets. Die Browserspeicherstände der
Offline-Version werden nicht gelesen. Alle Aktionen betreffen den angemeldeten
OGameX-Account und werden nach dessen Universumseinstellungen verarbeitet.

Die 3D-Szene verwendet bisher nur die vorhandenen 15 Gebäudemodelle und drei
Schiffstypmodelle. Andere Anlagen und Schiffe bleiben vollständig in den Listen
verfügbar. Grafische Stufen werden auf acht begrenzt, Beschriftungen zeigen aber
den tatsächlichen Ausbaustand. Diese Begrenzung beeinflusst keine Spielregel.
Millionen Schiffe sind Zahlen mit höchstens zwölf repräsentativen Orbitmodellen.
Ein WebGL-Fehler blockiert weder die Listen noch die Spielaktionen.

## Schnittstelle und Verantwortlichkeiten

Die vier neuen Routen liegen in derselben Middlewaregruppe wie das Original:
`auth`, `banned`, `globalgame`, `locale`, `firstlogin`, zusätzlich Web-Sitzung/CSRF.

| Route | Aufgabe |
|---|---|
| `GET /play-3d` | Angemeldete Oberfläche und initialer eigener Spielstand |
| `GET /play-3d/state?planet=ID` | Server-Snapshot eines eigenen Planeten/Mondes |
| `GET /play-3d/galaxy?planet=ID&galaxy=G&system=S` | Originale Galaxiedaten im Kontext eines eigenen Planeten |
| `POST /play-3d/command` | Validierter Auftrag für einen ausdrücklich eigenen Himmelskörper |

`Live3dViewService` liefert ausschließlich ein Lesemodell aus `PlanetService`,
`PlayerService`, `ObjectService` und den bestehenden Queue-ViewModels. Preise,
Produktion und Zeiten werden aus deren Methoden übernommen. Keine neuen
Formeln, keine direkten Updates an Spieltabellen und keine neuen Queue-Worker.
Antworten mit Spielständen sind privat und nicht zwischenspeicherbar.

`Live3dController::command` prüft Sitzungstoken, Eigentum, Objekttyp und
Eingabeformen. Es reicht ausschließlich erlaubte Felder an die bestehenden
Controller weiter. Aktionen:

| Aktion | Originalablauf |
|---|---|
| `build` | `ResourcesController::addBuildRequest` (Gebäude/Einrichtungen) |
| `research` | `ResearchController::addBuildRequest` |
| `ship` | `ShipyardController::addBuildRequest` |
| `defense` | `DefenseController::addBuildRequest` |
| `cancel-building` | `ResourcesController::cancelBuildRequest` |
| `cancel-research` | `ResearchController::cancelBuildRequest` |

Body: `planet`, `action`, `technologyId`, `_token`; bei Einheiten `amount`,
bei Abbruch `listId`. Die Oberfläche sendet zusätzlich `X-CSRF-TOKEN` und
`Accept: application/json`. Einheitenmengen bleiben Eingabestrings; der Server
validiert sie. Originalregeln, etwa die Anpassung einer zu großen Bestellung an
den tatsächlich bezahlbaren Betrag, bleiben maßgeblich. Ein erfolgreicher Request
ist keine Zusage einer lokal angenommenen Menge: anschließend wird der tatsächliche
Spielstand neu geladen.

Jeder Auftrag bindet seinen eigenen Planeten ausdrücklich, unabhängig von der
aktuellen Auswahl in anderen Tabs. Fremde Planeten werden vor Delegation
abgewiesen. Client-gesteuerte Zusatzmodi wie `mode=3` werden nicht weitergereicht.
Der aktuelle Abbruch-/Erstattungsablauf sowie Urlaubsmodus und technische Sperren
bleiben im Original. Es gibt keinen neuen Dark-Matter-/Sofortfertig-Mechanismus.

`resources/js/live3d/client.js` kapselt HTTP, Sitzungsschutz und laufende Requests.
Späte Antworten einer vorherigen Planetenwahl werden verworfen. Doppelklicks
während eines laufenden Auftrags sind gesperrt. Schreibzugriffe werden bei
Verbindungsfehlern niemals automatisch wiederholt; der Spielstand wird abgeglichen.
Countdowns sind Anzeigeprojektionen, keine clientseitige Fertigstellung.

Die Aktualisierung erfolgt bei laufenden Warteschlangen alle fünf Sekunden,
sonst ungefähr alle fünfzehn Sekunden. Versteckte Tabs pausieren das Polling;
beim Wiederöffnen wird neu geladen. Für größere öffentliche Installationen sind
noch Lastmessungen und eine Aufteilung des vollständigen Katalog-Snapshots in
selten geänderte Metadaten und häufig geänderte Bestände sinnvoll. Die neue
Oberfläche ist ein opt-in Einstieg, kein Austausch aller Originalrouten.

`visualState.js` übersetzt Serverobjekte ausschließlich in begrenzte Geometrie.
Die Live-Entrydatei importiert weder `prototype3d/data.js` noch dessen
`economy.js`, `demoStorage.js`, `missions.js` oder lokale Spielsimulation.
`scene.js` und die prozeduralen Modell-/Layoutmodule werden gemeinsam genutzt.
Der Vite-Build erzeugt deshalb gemeinsame Chunks. Der Demo-Exporter bündelt seinen
Entry mit dem bereits vorhandenen Rolldown und sammelt gemeinsame CSS-Dateien,
damit der Offline-Export weiterhin ohne zusätzliche Installation funktioniert.
Bestehende veröffentlichte ZIP-Dateien werden nicht verändert.

Die eingebetteten Originalansichten sind gleich-origin und verwenden die normalen
OGameX-Seiten samt CSRF und Session. Nur ihre umgebende Darstellung wird angepasst;
ihre Controller, AJAX-Aktionen und Formulare werden nicht umgeschrieben. Ein spät
fertig geladener, inzwischen versteckter Frame darf die äußere Navigation oder
Planetenwahl nicht zurücksetzen.

## Tests

```sh
node --test tests/Frontend/*.test.mjs
sh scripts/codex/compose.sh exec -T ogamex-app composer run rector
sh scripts/codex/compose.sh exec -T ogamex-app composer run cs
sh scripts/codex/compose.sh exec -T ogamex-app composer run stan
sh scripts/codex/compose.sh exec -T ogamex-app composer run tests -- --processes=2 --filter 'Live3dTest|Prototype3dTest|Http200Test|RustFfiTest|UnitQueueTest|ResearchQueueTest|PlanetFieldRestrictionTest|MessagesTest|GalaxyTest'
npm run build
```

`Live3dTest` verwendet isolierte Originalaccounts mit Datenbanktransaktionen:
Anmeldung/Eigentum, CSRF, vollständiger Katalog, Stufen über acht, Millionenbestand,
explizite Planetenbindung, Eingabevalidierung, Urlaubsmodus, echte Bau-/Forschungs-
und Schiffsaufträge, Zeitfortschritt sowie Originalabbruch. Zusätzlich: Original-Assets,
Dashboard-Zähler und Eigentums-/Koordinatenprüfung der Galaxiedaten. Die übrigen Tests
prüfen die weiterhin verwendeten Originalabläufe. Frontendtests decken verspätete
Antworten, Sitzungsausfall, Mehrfachklicks, fehlende automatische Schreibwiederholung
und begrenzte Geometrie bei unveränderten Servermengen ab.

Der tatsächliche Browserlauf benötigt ein ausschließlich zum Testen angelegtes
Konto auf der laufenden Installation. `LIVE_ACCOUNT_FILE` ist eine lokal
bereitgestellte, private JSON-Datei mit `email` und `password`; keine Zugangsdaten
ins Repository oder in Konsolenausgaben schreiben. Der Test erteilt echte Bau-,
Forschungs- und Schiffsaufträge und ist deshalb für ein isoliertes Testkonto gedacht.

```sh
PLAYWRIGHT_MODULE=/workspace/ogamex-cloud/browser-tools/node_modules/playwright \
LIVE_BASE_URL=http://127.0.0.1 \
LIVE_ACCOUNT_FILE=/pfad/zur/privaten/testkonto.json \
ARTIFACT_DIR=/workspace/ogamex-cloud/live-artifacts \
node tests/Frontend/live3d.browser.mjs
```

Die Loopbackadresse hier ist ausschließlich die Ausführungsadresse des
Browser-Testprozesses auf dem Server, kein Benutzerlink. Der Lauf prüft echte
Anmeldung, Darstellung und Aufträge gegen Laravel, Abbruch, Planetenwechsel,
Originalansichten, native Galaxienavigation, Bestands-/Produktionsanzeigen,
Auftragsleiste, Erhalt von Mengen und Eingabefokus, alle sieben mobilen Bereiche und serverseitigen Fortbestand
nach Neuladen. Temporäre Testaccounts werden nach der Prüfung wieder entfernt.
Die vorhandenen Race-Condition-Tests für Erteilung und Abarbeitung von Unitqueues
werden unverändert gegen den lokalen Docker-Webserver ausgeführt. Bei gesetztem
Container-Proxy kann für diesen internen Host dessen Name an die bestehende
`NO_PROXY`-/`no_proxy`-Liste des einzelnen Testbefehls angehängt werden; externe
Proxy-Einstellungen bleiben erhalten.

### Beobachtung am unveränderten alten CLI-Prüfer

`ogamex:test:race-condition-unitqueue-creation` besteht: über fünf Durchläufe mit
je zehn parallelen Requests wird jeweils nur der bezahlbare Auftrag angelegt.
Der separate, bereits vorhandene Prüfer `ogamex:test:race-condition-unitqueue`
meldet dagegen im aktuellen Stand null statt zehn erwarteter Jäger. Nach dem
Lauf gab es für seinen eigenen Testaccount keine Unitqueue-Einträge. Der Lauf
verwendet die klassischen `/overview`-Requests, nicht die neue Schnittstelle.
Dieses Ergebnis belegt damit noch keine Race Condition der neuen Oberfläche;
das alte Testsetup muss separat untersucht werden. Der Prüfer und die originale
Spiellogik wurden in diesem Branch nicht verändert. Die regulären Queue-Tests
sowie der neue Live-Test mit echter serverseitiger Fertigstellung bestehen.

## Gestaltungsrichtung

Die beiden vom Benutzer gezeigten Referenzen sind das visuelle Ziel: dunkler,
ruhiger Weltraum-Hintergrund, große interaktive Planetenübersicht, kompakte
Rohstoffzeile oben, klare Hauptnavigation links, transparente blaue Informations-
felder und feine cyanfarbene Leuchtkanten. Die Kolonie darf wärmere Beleuchtung
verwenden; die übergreifende Navigation bleibt einheitlich. Unterseiten behalten
klare Tabellen, Auswahlfelder und gezielte Eingaben statt einer dominierenden Szene.

Höherer Detailgrad benötigt eigene Modelle, Materialien, Texturen und Beleuchtung;
die Vorlagen werden nicht als statische Spieloberfläche eingesetzt. Anzeigen wie
Bevölkerung, Zufriedenheit oder zusätzliche Währungen werden nur übernommen,
wenn das vorhandene OGameX dafür tatsächlich Daten und Regeln bereitstellt.


### Ergebnis der Kommandoetappe

Rector, Pint und PHPStan: erfolgreich. PHP-Auswahl: **68 Tests, 1.229 Assertions**.
Frontend-Logik: **69 Tests**. Browserprüfungen gegen echte Laravel-Testkonten
umfassen die oben beschriebenen Abläufe; kein echter Spieleraccount wird dafür verwendet.
Die vorhandene Offline-Demo wird zusätzlich exportiert und im Browser auf
Kompatibilität der gemeinsamen 3D-Module geprüft; veröffentlichte ZIP-Dateien bleiben unverändert.
