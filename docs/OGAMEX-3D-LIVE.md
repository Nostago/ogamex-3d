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

## Aktuelle Etappe: deutsche Spielbereiche vervollständigen

Branch: `codex/ogamex-3d-complete-interface`.

Die linke Navigation enthält jetzt auch Offiziere, Shop, Händler, Notizen,
Freunde, Einstellungen und Rangliste. Allianz, Nachrichten und Flotten sowie
alle neuen Bereiche verwenden weiterhin die originalen angemeldeten Seiten,
Formulare, AJAX-Aktionen und Controller innerhalb des neuen Rahmens. Die
Darstellung dieser Seiten ist dunkel/cyan, alte doppelte Navigation und große
Kopfbilder sind ausgeblendet. Flottenplanung und Flottenbewegungen sowie
Nachrichten/Chat und Händler/Rohstoffmarkt sind über eigene Bereichsschalter
erreichbar. Weitere Galaxieaktionen öffnen die vollständigen Originalwerkzeuge
im selben Rahmen. Einrichtungen wie Sprungtor, Silo und Raumdock bleiben über
die jeweilige Detailansicht erreichbar.

- **Bauanimationen:** Der Modellbereich des ausgewählten Gebäudes zeigt einen
  Aufbau mit Gerüst und Scanebene, solange sein echter bezahlter Serverauftrag
  aktiv ist. Bei Schiffen/Verteidigung wird nur der gerade abgearbeitete erste
  Einheitenauftrag animiert; die Einzelbauzeit kommt vom Server. Reihenfolge,
  Bezahlung und Fertigstellung bleiben beim Original. Andere Modelle stehen
  still, reduzierte Bewegung wird berücksichtigt. Forschungsobjekte verwenden
  weiterhin technische Darstellungen statt erfundener Gebäude.
- **Galaxie:** Kolonisieren erscheint auch an freien Positionen. Der originale
  Server entscheidet, ob die Aktion verfügbar ist; andernfalls erklärt ein
  Hinweis den Grund. Eine Auswahl öffnet ausschließlich die Flottenplanung mit
  Zielkoordinaten. Die Spalten haben passende Mindestbreiten; „Unbesetzt“ und
  Koordinaten werden nicht mitten im Wort umgebrochen. Schmale Geräte scrollen
  die Tabelle horizontal. Spielernamen werden als Text angezeigt.
- **Verwaltung:** Die Speichern-Schaltfläche liegt außerhalb überdeckender
  Dekorationen und ist über ihre gesamte Breite klickbar. Das Originalformular
  samt versteckten Einstellungen bleibt erhalten. Außerdem wird der bereits
  angebotene Universumsname nun vom Originalcontroller gespeichert; zuvor fehlte
  genau dieses Feld in dessen Speichermethode.
- **Kopfzeile und Hilfen:** Echte Dunkle Materie ergänzt die Rohstoffanzeige.
  Das Planetenvorschaubild verwendet die vorhandene Planetenatlas-Grafik.
  Jeder Hauptbereich hat einen Hilfedialog; Objektinformationen und
  Technologiebaum öffnen die Originalberechnungen im selben Dialog.
- **Deutsch:** Die neue Oberfläche und ihre eingebetteten Originalseiten
  erhalten einen Anfragekontext `ui=live3d`. Er setzt die Sprache nur für diese
  Anfrage und verändert keine gespeicherte Spracheinstellung. Alle vorhandenen
  englischen PHP-Übersetzungsschlüssel sind auch auf Deutsch abgedeckt;
  Platzhalter werden geprüft. Maschinell erstellte Übersetzungen sind als solche
  gekennzeichnet. Historische gespeicherte Nachrichten und eigene Spielernamen
  werden nicht nachträglich übersetzt. Literal-Schlüssel aus alten Templates
  sind zusätzlich in `de.json` übersetzt; diese Datei erlaubt keine Kommentare.
- **Rangliste:** Administratoren sind im neuen Anfragekontext ausgeschlossen,
  unabhängig von der ursprünglichen Serveroption. Die separate Originalansicht
  behält ihre bisherige Option. Berechnung und Statistikdaten bleiben original.
- **Mobil:** Die erweiterte Hauptnavigation lässt sich horizontal scrollen;
  die Einträge überdecken sich nicht.

### Grenzen des vorhandenen Originals

Offiziersrekrutierung und Shopkäufe sind im untersuchten OGameX-Stand noch keine
vollständigen Spielfunktionen: Die Offiziersabfragen im `PlayerService` liefern
als TODO `false`; der Shop besitzt einen Katalog, aber keine Kauf-/Inventar-
Endpunkte. Diese Originalseiten sind integriert, werden aber ausdrücklich als
noch nicht verfügbare Funktionen gekennzeichnet. Die Oberfläche erzeugt keine
lokalen Scheinkäufe oder Bonuswirkungen. Auch weitere vorhandene Platzhalter in
diesen Originalseiten werden durch eine neue Darstellung nicht zu fertigen
Backendfunktionen. Eine vollständige Premium-Implementierung wäre ein eigener
Auftrag an die Spiellogik. Die Bot-Erweiterung ist in dieser Etappe noch nicht
integriert.

### Prüfung dieser Etappe

- Rector, Pint und PHPStan sowie der Produktionsbuild bestehen.
- 81 ausgewählte PHP-Tests bestehen mit 6.011 Assertions, darunter deutsche
  Sprachabdeckung, originale Aufträge, Rechteprüfung und Ranglistenkontext.
- 76 Frontend-Logiktests bestehen.
- `tests/Frontend/live3d-interface.browser.mjs` prüft zehn Originalbereiche,
  gespeicherte Notizen, originale Technikinformationen, Kolonisationsziel,
  tatsächlichen Transport und Rückruf sowie echte Gebäude-/Schiffsaufträge mit
  Modellanimation und kompakte mobile Navigation.
- `tests/Frontend/live3d-admin.browser.mjs` prüft zusätzlich die komplette
  Trefferfläche der Speichern-Schaltfläche und speichert einen geänderten
  Universumsnamen tatsächlich, bevor der alte Wert wiederhergestellt wird.

Die Interface-Browserprüfung braucht ein isoliertes Testkonto mit zwei eigenen
Planeten, einem verfügbaren kleinen Transporter, Kolonieschiff und den originalen
Voraussetzungen für deren Nutzung. Die Verwaltungsprüfung braucht ein separates
isoliertes Administratorkonto. Beide verwenden `PLAYWRIGHT_MODULE`,
`LIVE_BASE_URL`, `LIVE_ACCOUNT_FILE` und `ARTIFACT_DIR` wie im allgemeinen
Testabschnitt. Sie erteilen echte Aufträge; keine normalen Spielerkonten dafür
verwenden. Zugangsdaten liegen außerhalb des Repositorys. Die in der Cloud
verwendeten Testkonten werden nach der Prüfung gelöscht.

Die nachfolgend dokumentierten Koloniemodelle bleiben erhalten. Diese Etappe
ersetzt weder Gebäudemodelle noch Spielregeln erneut.

## Vorherige Etappe: Neubau der Koloniearchitektur

Branch: `codex/ogamex-3d-colony-rebuild`.

Die bisherige Gebäudebibliothek ist ersetzt. Alle **19 Originalgebäude und
10 Verteidigungstypen** haben nun eine Modellzuordnung. Dazu gehören auch
Allianzdepot, Raketensilo, Raumdock, Mondbasis, Sensorphalanx und Sprungtor.
Wiederverwendete Komponenten sorgen für eine gemeinsame Architektur; verwandte
Anlagen teilen bestimmte Grundformen. Es werden nur tatsächlich vorhandene
Spielobjekte als Gebäude auf dem Planeten angeordnet.

- Rechteckige, abgestufte Industrieflächen ersetzen die alten runden Sockel.
- Minen haben Fördergerüste, Verarbeitungshallen und Förderstrecken; die Werft
  erhält einen Trockendock mit Portalkränen und Serviceanlagen.
- Forschung, Robotik, Speicher, Energietechnik, Mondanlagen und Verteidigung
  verwenden passende Silhouetten, Fenster, Rohrleitungen, Geländer, Lüftung,
  Antennen und Betriebsbeleuchtung.
- Vier visuelle Ausbaustufen ergänzen Module und verändern die Gebäudeform.
  Die tatsächliche Spielstufe bleibt unverändert sichtbar; höhere Spielstufen
  erzeugen keine unbegrenzt wachsende Geometrie.
- Wege und Versorgungsleitungen bleiben in **Übersicht, Kolonie und Orbit**
  sichtbar. Straßenmarkierungen folgen der Kugeloberfläche; Servicefahrzeuge
  fahren auf vorhandenen Verbindungen. Auch leere Kolonien und die ersten
  ein bis drei Gebäude können ohne Grafikfehler dargestellt werden.
- Die Gebäude werden beim Wechsel in den Orbit nicht mehr verkleinert.
  **Kolonie** rahmt die Siedlung näher ein. Maus, Zoom und Gebäudeauswahl bleiben
  erhalten; die Kamera wird außerhalb der Planetenoberfläche gehalten.
- Detailansichten verwenden dieselben Modelle mit eigener Beleuchtung und
  Schatten. Die Katalogvorschaubilder werden aus dieser Bibliothek gerendert
  (256 × 192 Pixel, repräsentative Modellstufe 5); die früheren 40-Pixel-
  Gebäudebilder werden dort ersetzt. Die interaktiven Detail- und Planetenmodelle
  folgen dem tatsächlichen Ausbau innerhalb der vier visuellen Stufen.
  Forschung behält das klar beschriftete Schema. Der CPU-Grafikfallback bleibt
  eine vereinfachte Darstellung für Geräte ohne funktionsfähiges WebGL.

Statische Gebäudeteile werden nach Material zusammengefasst. Die Prüfungen
begrenzen Modelle auf maximal 20 Zeichnungsgruppen und 20.000 Dreiecke.
Das feste Flottenbudget von zwölf repräsentativen Schiffsmodellen bleibt erhalten.
Der visuelle Mindestradius von 8 und 32 Bauplätze sorgen dafür, dass sämtliche
Objekttypen auch auf kleinen Monden Platz finden. Dies verändert weder Durchmesser,
Baufelder noch andere Werte im Backend. Die bestehende Offline-Demo verwendet
über dieselbe Bibliothek ebenfalls die neuen Modelle.

Vorschaubilder bei Modelländerungen regenerieren (nur Entwicklungswerkzeug;
Playwright und Chromium müssen bereits verfügbar sein):

```sh
PLAYWRIGHT_MODULE=/pfad/zu/playwright node scripts/codex/render-building-thumbnails.mjs
npm run build
```

Die WebP-Dateien und Browser-Builds sind eingecheckt; der Testserver benötigt
keine neuen Pakete und keine Installation. Das Referenzbild bleibt die gestalterische
Richtung. Diese prozeduralen Modelle ersetzen keine filmreifen, individuell
texturierten Hochdetail-Assets; ein gleichwertiger Fotorealismus wird nicht behauptet.

**Stand der Bots:** Es existiert noch kein autonomer KI-Spieler-Dienst mit
Kolonieausbau, eigener Wirtschaft und Flottenentscheidungen. Die vorhandenen
`NPCFleetGeneratorService`, `NPCPlayerService` und `NPCPlanetService` stellen
Piraten-/Aliengegner für die originalen Expeditionskämpfe bereit. Die originale
Bot-/Multiaccount-Erkennung ist ebenfalls vorhanden. Sie ist keine spielende KI.
Diese Etappe ändert weder diese Dienste noch die originale Spielmechanik.

Prüfungen: Rector, Pint, PHPStan; 74 PHP-Tests mit 1.268 Assertions und
76 Frontendtests, einschließlich Kamerabegrenzungen, Geometriebudgets, aller Modelltypen und
Straßennetzen mit 0/1/2/3/4/19/29 Gebäuden. Browser: Kolonie-Nahansicht,
Modellrevision in den Details, Verwaltung, Spielaufträge, mobile Oberflächen,
Grafik-Fallbacks und Verträglichkeit mit der bestehenden Offline-Demo.

## Etappe: Lesbare Verwaltung und scharfe Modellansichten

Branch: `codex/ogamex-3d-visual-clarity`.

Die Verwaltung hat links die Hauptbereiche und darüber einen Abschnittswähler.
In langen Originalformularen ist jeweils eine Werkzeuggruppe sichtbar. Die alten
festen Schaltflächenbreiten entfallen; Beschriftungen umbrechen vollständig.
Der eingebettete klassische Kopf und die zusätzliche innere Navigationsleiste
entfallen. Die Höhe passt sich dem ausgewählten Abschnitt an.

Die ursprünglichen Formulare behalten alle Felder, Namen, Werte, Actions und
CSRF-Tokens. Ausgeblendete Gruppen bleiben Bestandteil des Speichervorgangs.
Der Speichern-Knopf bleibt erreichbar, Validierungsfehler öffnen die passende
Gruppe, und Rückmeldungen erscheinen kompakt über dem Formular. Bei einem
Original-POST bleibt der ausgewählte Werkzeugabschnitt erhalten.

Die Originalbilder im Katalog sind nur **40 × 40 Pixel** groß. Sie bleiben als
kleine Symbole erhalten und werden nicht mehr als großes unscharfes Detailbild
verwendet. Gebäude und flugfähige Schiffe mit vorhandenen Modellen erhalten im
Detail eine scharfe, drehbare 3D-Modellansicht (Maus oder Pfeiltasten). Forschung,
weitere Objekte und Geräte ohne verfügbare WebGL-Grafik erhalten eine klare
Vektorskizze. Diese ist ausdrücklich als Schema beschriftet. Es wird jeweils nur
ein Detailrenderer wiederverwendet; ohne Interaktion läuft keine Endlosschleife.

Die Hauptszene erhält feinere Wolken, zurückhaltendere Beleuchtung, kleinere
Gebäude in der Übersicht und lichtabhängige Stadtlichter auf Landflächen.
Die Nahansicht **Kolonie** behält die größere Modelldarstellung. Abstände großer
Schiffsmodelle berücksichtigen deren tatsächliche Ausdehnung. Das verbessert
Lesbarkeit und Größenverhältnisse, erreicht aber noch nicht den filmischen
Detailgrad des Referenzbildes. Die Darstellung bleibt echtes interaktives 3D.

Spielregeln, Datenbank, Abhängigkeiten und Lockfiles sind unverändert. Die gebauten
Browserdateien sind enthalten; auf dem vorhandenen Testserver genügt der bisherige
Updatehelfer. Es ist keine erneute Installation nötig.

Geprüft: Rector, Pint, PHPStan; **74 PHP-Tests (1.268 Assertions)** und
**72 Frontendtests**. Browserprüfungen umfassen scharfe Solarkraftwerk-Modelle,
alle Adminbereiche, unveränderte vollständige Einstellungsdaten beim Gruppenwechsel,
den echten Original-POST zum Hinzufügen von Einheiten sowie mobile Ansichten.

## Etappe: Verwaltung und sichtbare Kolonie

Branch: `codex/ogamex-3d-admin-colony`.

Die Übersicht startet jetzt mit **Kolonie und Orbit gemeinsam**. Die vorhandenen
Gebäude bleiben auch beim Wechsel in den Orbit sichtbar; Kolonie bietet weiterhin
die nähere Kamera. Der bisherige Standard-Orbit hatte sie ausgeblendet – sie wurden
nicht gelöscht und ihre Modelle nicht neu begonnen.

Die Kugel erhält eine eigens generierte Oberflächentextur, die Werft zusätzliche
Geometriedetails und die Übersicht einen lokal erzeugten Weltraumhintergrund.
Die Szene bleibt vollständig interaktiv. Fünfzehn flugfähige Original-Schiffstypen
haben nun visuelle Repräsentationen, darunter Kreuzer, Schlachtschiffe, Zerstörer,
Transporter und Todesstern. Insgesamt werden höchstens zwölf Modelle gleichzeitig
gezeichnet; vollständige Bestände bleiben in den Katalogen sichtbar. Crawler und
Solarsatelliten werden nicht als fliegende Schiffe dargestellt.

**Galaxie:** Koordinatenänderungen laden automatisch (350 ms Schreibpause,
Auswahländerungen unmittelbar). Kein „System anzeigen“-Knopf. Ungültige oder
unvollständige Werte werden nicht angefragt. Alte Antworten werden verworfen;
Heimatsystem/Vor/Zurück löschen auch noch ausstehende Eingabetimer.

### Testen ohne Rohstoffmangel

Als bestehender OGameX-Administrator unter `/play-3d#admin` **Verwaltung →
Testwerkzeuge** öffnen. Oben den eigenen Zielplaneten oder Mond auswählen.
**Rohstoffe hinzufügen** vergibt standardmäßig jeweils 10 Millionen Metall,
Kristall und Deuterium; alternativ 1/10/100 Millionen als Vorgabe oder eigene Werte.
Es wird zum vorhandenen Bestand addiert. Die Änderung liegt wirklich im Backend
und bleibt nach Neuladen erhalten. Die UI kann außerdem Gebäude-/Forschungsstufen
setzen und Schiffe/Verteidigung hinzufügen. Einheiten werden addiert, Stufen gesetzt.

Der Zugang verwendet ausschließlich die originale **admin**-Rolle. Fehlt der Menüpunkt,
kann der Betreiber auf seinem Testserver den vorhandenen OGameX-Befehl verwenden:

```sh
cd /home/ogamedev/OGameX
php artisan ogamex:admin:assign-role "DEIN_SPIELERNAME"
```

Den tatsächlichen Spielnamen aus der Kopfzeile einsetzen, anschließend neu laden.
Es gibt keine automatische Rechtevergabe und keine Rohstoffknöpfe für normale Spieler.

### Umfang der Verwaltung

- **Testwerkzeuge:** native, übersichtliche Rohstoff- und Objektformulare für eigene Himmelskörper.
- **Universum & Expeditionen:** alle originalen Geschwindigkeiten, Grundproduktion,
  Trümmerfelder, Expeditionen, Klassen und weiteren Universumseinstellungen.
- **Spieler & Sicherheit:** originale Sperren, Bot-/Multiaccount-Erkennung,
  Angriffssperren, Cache- und Missionsverwaltung.
- **Spielregeln & Rechtliches:** die vorhandenen Text- und Regelwerkzeuge.
- **Flottenzeiten:** die bestehende Verwaltungsansicht und ihre Aktionen.
- **Erweiterte Werkzeuge:** alle originalen Entwicklerfunktionen, fremde Koordinaten,
  Monde, Dunkle Materie und weitere Werkzeuge.

Die fünf umfangreichen Originalbereiche behalten ihre vollständigen Formulare,
Actions, CSRF-Tokens und Skripte. Sie erhalten eine einheitliche Gestaltung und bei
langen Formularen eine Abschnittsnavigation. Die explizite Planeten-ID wird an
Formulare gebunden. Es werden keine unvollständigen Einstellungsformulare nachgebaut,
die beim Speichern andere Werte versehentlich leeren könnten.

`POST /play-3d/admin/command` prüft serverseitig Rolle, Sitzungstoken, Eigentum,
Objekt-ID und Wertebereiche. Er delegiert an `DeveloperShortcutsController::updateResources`
oder `::update` und ersetzt die Eingabe durch die benötigten Originalfelder. Preise,
Forschung, Produktion, Missionen und Kämpfe werden nicht neu implementiert.

**Bots:** Das vorhandene Projekt enthält Erkennung automatisierter Aktivitäten,
aber keinen eigenständig spielenden NPC-Botdienst. Die Erkennung ist integriert;
eine NPC-Simulation wird nicht als angeblich vorhandene Originalfunktion ausgegeben.

Prüfstand dieser Etappe: Rector/Pint/PHPStan erfolgreich; **74 PHP-Tests mit
1.268 Assertions**, **72 Frontendtests**. Browser: automatische Koordinaten,
Kolonie mit Gebäuden und geladener Textur, Rohstoffvergabe aus einem zunächst
rohstofflosen isolierten Admin-Testkonto, Stufenänderung, Millionenbestand an Kreuzern,
alle fünf Original-Adminbereiche, CSRF/Planetenbindung und mobile Bedienung.
Grafikausfälle und die vorhandene Offline-Demo werden separat geprüft.

## Etappe: Orbital Command

Branch: `codex/ogamex-3d-orbital-command`, aufbauend auf der bereits getesteten
Kommandooberfläche. Der Hauptbranch und die vorhandenen Spielregeln bleiben unverändert.

Die Planetenübersicht verwendet nun die Bildvorlage als Layout: große durchgehende
interaktive Szene, schmale Navigation mit eigenen SVG-Symbolen, Rohstoffleiste oben,
schwebende Informationsfelder links/rechts und Kolonie-/Orbitsteuerung unten.
Unterseiten bleiben getrennte Arbeitsflächen. Verteidigung hat einen eigenen Bereich;
die vollständige originale Allianzansicht ist im Rahmen erreichbar.

Im Orbit erscheint die detailliertere Werftplattform nur bei tatsächlich vorhandener
Schiffswerft. Die grafische Plattform und Oberflächenlichter sind illustrative Modelle,
keine neuen Spielobjekte. Schiffsverbände repräsentieren weiterhin die echten Bestände
mit höchstens zwölf Modellen. Die Flottenseite zeigt zusätzlich den tatsächlichen
Schiffsbestand am ausgewählten Himmelskörper; die originale Planung bleibt darunter erhalten.
Das Flottenstatusfeld bezieht freundliche/neutrale/feindliche Ereignisse und die nächste
Restzeit aus dem originalen `FleetEventsController`, einschließlich dessen Halte-/Rückflugregeln.

### Reparatur leerer 3D-Ansichten

Ein reproduzierbarer Fehler: `visualState()` verlangte 48 Modellplätze selbst bei
kleinen Himmelskörpern (visueller Radius 6 bis 6,5). Die Abstandsprüfung in `createLayout()`
konnte diese Zahl nicht erfüllen und warf eine Ausnahme vor Abschluss der Initialisierung.
Es werden nun 24 Plätze angelegt; alle 15 unterstützten Gebäudemodelle passen auch auf
den kleinsten visuellen Himmelskörper. Tatsächliche Baufelder und Spielregeln ändern sich nicht.
Ein Regressionstest prüft kleine Planeten, Monde und hohe Ausbaustufen.

Zusätzlich wird das Three.js-Modul separat geladen. Fehler beim Laden, Shadern,
GPU-Kontextverlust oder ein ausbleibender erster Renderframe aktivieren eine lokale
CPU-Ansicht mit echter sphärischer Projektion, Rotation, Zoom und anklickbaren
Gebäuden. Sie hat weniger Details und ist als Kompatibilitätsmodus gekennzeichnet.
Ein Knopf startet den WebGL-Versuch erneut; die Diagnose zeigt nur Renderer,
Fehlerkategorie, Abmessungen und Framezahl, keine Accountdaten oder Tokens.
Nach Wiederherstellung aus dem Browser-Verlauf (bfcache, besonders relevant bei Safari)
bleiben die Szene und ihre Listener erhalten. Nicht zwischengespeicherte Seiten werden
weiterhin vollständig aufgeräumt.

Die Cloud darf den Testserver-Host derzeit nicht direkt per HTTPS erreichen; die
konkrete serverseitige Browsersitzung wurde daher nicht ausgelesen. Reproduktion und
Tests laufen auf derselben Laravel-Anwendung mit einem isolierten Testkonto.

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

Die 3D-Szene verwendet die vorhandenen 15 Gebäudemodelle und zusätzliche
Schiffsmodelle für die fünfzehn flugfähigen Originaltypen. Andere Anlagen und Schiffe bleiben vollständig in den Listen
verfügbar. Grafische Stufen werden auf acht begrenzt, Beschriftungen zeigen aber
den tatsächlichen Ausbaustand. Diese Begrenzung beeinflusst keine Spielregel.
Millionen Schiffe sind Zahlen mit höchstens zwölf repräsentativen Orbitmodellen.
Ein WebGL-Fehler blockiert weder die Listen noch die Spielaktionen.

## Schnittstelle und Verantwortlichkeiten

Die fünf neuen Routen liegen in derselben Middlewaregruppe wie das Original:
`auth`, `banned`, `globalgame`, `locale`, `firstlogin`, zusätzlich Web-Sitzung/CSRF.

| Route | Aufgabe |
|---|---|
| `GET /play-3d` | Angemeldete Oberfläche und initialer eigener Spielstand |
| `GET /play-3d/state?planet=ID` | Server-Snapshot eines eigenen Planeten/Mondes |
| `GET /play-3d/galaxy?planet=ID&galaxy=G&system=S` | Originale Galaxiedaten im Kontext eines eigenen Planeten |
| `POST /play-3d/admin/command` | Originale Testwerkzeuge, ausschließlich für bestehende Administratoren |
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
sh scripts/codex/compose.sh exec -T ogamex-app composer run tests -- --processes=2 --filter 'Live3dInterfaceTest|Live3dAdminTest|Live3dTest|LanguageSwitchTest|AdminTest|Prototype3dTest|Http200Test|RustFfiTest|UnitQueueTest|ResearchQueueTest|PlanetFieldRestrictionTest|MessagesTest|GalaxyTest'
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
Auftragsleiste, Erhalt von Mengen und Eingabefokus, alle neun mobilen Bereiche und serverseitigen Fortbestand
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
Frontend-Logik: **70 Tests**. Browserprüfungen gegen echte Laravel-Testkonten
umfassen die oben beschriebenen Abläufe; kein echter Spieleraccount wird dafür verwendet.
Die vorhandene Offline-Demo wird zusätzlich exportiert und im Browser auf
Kompatibilität der gemeinsamen 3D-Module geprüft; veröffentlichte ZIP-Dateien bleiben unverändert.


Orbital-Prüfungen erweitern den Browserlauf um sichtbare Renderframes, den eigenen
Verteidigungsbereich und die Allianzansicht, erzwungenen WebGL-Kontextverlust,
CPU-Rotation/Zoom, erneuten WebGL-Start und die Wiederkehr aus bfcache.
`tests/Frontend/live3d-recovery.browser.mjs` prüft zusätzlich fehlende GPU-Unterstützung
und blockierte 3D-Moduldateien. Beide Fälle müssen die Spieloberfläche und eine
interaktive Kompatibilitätsansicht erhalten.
