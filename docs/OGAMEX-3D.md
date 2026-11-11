# OGameX-3D 0.4 ausprobieren

## Lokale Demo ohne Server

Die fertige ZIP-Datei liegt unter [`downloads/OGameX-3D-0.4.zip`](../downloads/OGameX-3D-0.4.zip).
Auf GitHub „Download raw file“ wählen, entpacken und `OGameX-3D-0.4.html`
mit Safari, Chrome, Firefox oder Edge öffnen. Es ist kein Server und keine
Installation erforderlich. Alle früheren Demo-Versionen bleiben separat erhalten.

Neu in 0.4:

- Zentraler Katalog mit zwölf Typen: vier Ressourcenanlagen, Schiffswerft,
  Forschungslabor, Roboterfabrik, drei Ressourcenlager, Raketenwerfer und leichter Laser.
- 16 feste, nummerierte Bauflächen auf der Planetenoberfläche. Im Baumenü Typ und
  freie Fläche wählen; „Baufläche anzeigen“ fokussiert die Auswahl. Sichtbare freie
  Flächen sind im Baumodus auch direkt in der 3D-Ansicht auswählbar.
- „Demo errichten“ zeigt zuerst das Gerüst. Erst nach erfolgreichem Abschluss wird
  die Fläche belegt. Reset oder Orbitwechsel bricht den Neubau ohne Belegung ab.
- Einzigartige Anlagen sind einmal baubar, Verteidigungsmodelle mehrfach. Alle
  Anlagen besitzen eigene Detailinformationen und sind bis Stufe 8 ausbaubar.
- Straßen, Kabeltrassen, Versorgungsrohre, ein dekorativer Logistikknoten und drei
  Transportfahrzeuge verbinden die Kolonie. Die Fahrzeuge sind eine Animation,
  kein echtes Transport- oder Wirtschaftsmodell.
- Die Gebäudeliste und die Desktop-Seitenleiste scrollen unabhängig vom Planeten.

Erhalten aus 0.3:

- Alle vier Anlagen wurden als technische Baugruppen neu modelliert: Schachtanlage
  mit Fachwerkträgern, Seilrollen und Förderband; Kristall-Verarbeitungsanlage;
  isolierte Tanks mit Rohrbögen und Armaturen; Solarfelder auf Stahlstützen.
- Gemeinsam genutzte prozedurale Metall-, Beton- und Solarzellentexturen,
  unterschiedliche Rauheit und Reliefstruktur, getrennte Glas- und Isolationsmaterialien.
  Diese Texturen werden lokal erzeugt und benötigen keine Downloads.
- Neutralere Umgebungsbeleuchtung, weich gefilterte Richtungsschatten und
  Kontaktschatten an den Fundamenten. Statische Schatten werden beim Neuaufbau
  der Gebäude aktualisiert und anschließend zwischengespeichert. Die Schatten
  kleiner beweglicher Bauteile sind bewusst angenähert.
- Begrenzte Renderauflösung (maximal 1,5-fache Pixeldichte), gemeinsam genutzte
  Materialien und kleine Geometrien. Die Tests prüfen für alle Stufen ein Budget
  von höchstens 130 Meshes und unter 20.000 Dreiecken pro Gebäudetyp.

Aus 0.2 bleiben erhalten:

- Betriebsanimationen an Förderband, Seilrolle, Kollektor, Pumpen und langsam
  nachgeführten Solarfeldern sowie beleuchtete Kontrollkabinen und Bodenmarkierungen.
- Sanfter Kamerafokus bei Auswahl eines Gebäudes; „Übersicht“ führt zurück.
  Maussteuerung unterbricht eine Kamerafahrt jederzeit.
- Ausbau mit Gerüst, aufsteigendem Scanring und Fortschrittsanzeige. Erst nach
  Ende der Animation ändern sich Stufe, Produktion und Modell. Reset oder
  Orbitwechsel bricht laufende Demo-Bauten ohne Stufenänderung ab.
- „Bewegung reduzieren“ wird berücksichtigt: Betriebsanimationen stoppen,
  Kamerafokus und Ausbau erfolgen direkt.

## Laravel-Integration für Entwickler


Ein eigenständiger Three.js-Prototyp im bestehenden Laravel-/Vite-Projekt. Die
normale Spieloberfläche und ihre Routen bleiben erhalten. Die Demoseite ist ohne
Anmeldung erreichbar und besitzt keine API zum Ändern von Spielständen.

## Start

In der bereits vorbereiteten Cloud-Umgebung:

```sh
cd /workspace/ogamex-3d
sh scripts/codex/start.sh
# Nur nach Änderungen an JS/CSS oder in einem frischen Checkout:
(umask 022; npm run build)
```

Im Browser der Cloud-Umgebung `http://127.0.0.1/prototype-3d` öffnen. Bei lokalem
Docker-Betrieb `http://localhost/prototype-3d` verwenden; bei einem veröffentlichten
Webserver dessen Basisadresse um `/prototype-3d` ergänzen. Ein Browser mit WebGL
ist erforderlich. Der Prototyp läuft vollständig mit lokalen Assets, ohne CDN.

Alternativ `npm run dev` für Vite/HMR starten. Eine veraltete `public/hot` verweist
unter Umständen auf einen beendeten Vite-Server: nur wenn dieser tatsächlich
nicht mehr läuft, die ignorierte Datei entfernen, um die gebauten Assets zu nutzen.
Die vollständige Abhängigkeitsinstallation muss nicht erneut ausgeführt werden.

## Bedienung

- Maus ziehen: Kamera um den dreidimensionalen Planeten drehen. Mausrad oder
  Plus/Minus: zoomen. Auf Touch-Geräten funktionieren Ziehen und Zoom-Schaltflächen.
- Gebäude auf dem Planeten oder in der Seitenleiste anklicken. Das deutsche
  Informationsfenster zeigt Stufe, Beispielproduktion und Demo-Ausbau.
- Jeder Ausbau verändert das Modell und die Beispielproduktion sofort. Stufe 8
  ist das Demo-Maximum. Es werden keine Rohstoffe abgebucht oder Bauaufträge erzeugt.
- „Orbit“ zeigt eine prozedurale Raumstation und drei animierte Beispielschiffe.
- „Rotation“ aktiviert die automatische Kameradrehung, „Übersicht“ setzt die Sicht
  zurück. Bei fokussierter Szene funktionieren Pfeiltasten sowie Plus/Minus.
- „Demo zurücksetzen“ oder Neuladen stellt die Beispieldaten wieder her.

## Architektur und Grenzen

`routes/web.php` registriert ausschließlich die zusätzliche öffentliche GET-Route.
Die Blade-Seite verwendet eine geklonte Vite-Instanz mit `type="module"`, weil
OGameX für seine älteren Bundles die Modul-Tags global deaktiviert. Die globale
Konfiguration und die vorhandenen jQuery-Einstiege bleiben erhalten.

`resources/js/prototype3d/data.js` liefert ein austauschbares Provider-Interface:

```js
await provider.load();       // { name, coordinates, buildings: [{ id, level, production }] }
await provider.upgrade(id);  // derselbe vollständige Snapshot nach dem Ausbau
await provider.build(type, plotId); // Neubau auf einer freien Fläche
```

Die vier ursprünglichen Instanz-IDs sind `metal`, `crystal`, `deuterium`, `solar`.
Neue Instanzen bekommen eine ID aus Typ und Fläche, beispielsweise
`shipyard-plot-06`. Jeder Datensatz enthält `type`, `plotId`, `level`, `metric`
und `value`; `production` bleibt für die ursprünglichen Ressourcen kompatibel.
Snapshots enthalten außerdem `plots` mit `occupiedBy`. Katalog, Kategorien,
Wiederholbarkeit und Koordinaten stehen in `catalog.js`. Der Provider validiert
unbekannte Typen, fehlende/belegte Flächen und doppelte einzigartige Anlagen vor
jeder Mutation. Lagerkapazitäten und Verteidigungskennwerte sind frei gewählte
Demoangaben. Schiffswerft, Forschung und Verteidigung lösen keine echten
Spielaktionen aus. Die aktuelle Demo hat
zusätzlich `reset()`. Jeder Provider besitzt seinen eigenen flüchtigen Zustand;
es gibt keine Speicherung in Datenbank, Local Storage oder Cookies durch den
Prototyp. Die gewöhnliche Laravel-Session bleibt unverändert verfügbar.

Für eine spätere Anbindung wird der Provider gegen einen authentifizierten
HTTP-Adapter ausgetauscht. Produktion, Kosten, Berechtigungen und Bauzeiten müssen
dann serverseitig über vorhandene OGameX-Dienste bestimmt werden. Die aktuellen
Zahlen und Formeln sind frei gewählte Beispieldaten und bilden **keine echten
OGame-Spielregeln** ab. Es gibt in 0.1 weder Wirtschaftssimulation noch echte Flotten.

`scene.js` baut Planet, Atmosphäre, Gebäude und Orbitobjekte prozedural auf.
Die Gebäude stehen auf automatisch berechneten Oberflächenpositionen und erhalten
je nach Stufe mehr Module, höhere Aufbauten oder größere Solarfelder. Das UI ist
von der 3D-Szene getrennt; Provider-Daten werden als Textknoten ausgegeben.
Deutsch ist für diese Demo festgelegt, englische Übersetzungsschlüssel sind vorhanden.

Three.js **0.160.1** ist als offizielles ES-Modul mit MIT-Lizenz unter
`resources/js/prototype3d/vendor/` enthalten. Quelle: npm-Paket `three@0.160.1`,
Tarball-SHA-1 `61fe2907312e8604b1f64187f58e047503847413`; npm prüfte beim Bezug die
Registry-Integrität. Damit benötigt dieser kleine Prototyp weder eine Änderung
bestehender Abhängigkeiten/Lockfiles noch externe Laufzeit-Downloads. Bei späteren
Aktualisierungen Modul und Lizenz aus derselben verifizierten Paketversion ersetzen.

## Prüfen

```sh
node --test tests/Frontend/*.test.mjs
sh scripts/codex/compose.sh exec -T ogamex-app composer run rector
sh scripts/codex/compose.sh exec -T ogamex-app composer run cs
sh scripts/codex/compose.sh exec -T ogamex-app composer run stan
sh scripts/codex/compose.sh exec -T ogamex-app composer run tests -- \
  --processes=2 --filter 'Prototype3dTest|Http200Test|RustFfiTest'
```

Der optionale Browser-Smoke-Test benötigt Playwright und Chromium. In dieser
Cloud-Umgebung liegen die Testwerkzeuge außerhalb des Projekts:

```sh
PLAYWRIGHT_MODULE=/workspace/ogamex-cloud/browser-tools/node_modules/playwright \
ARTIFACT_DIR=/workspace/ogamex-cloud/prototype-artifacts \
node tests/Frontend/prototype3d.browser.mjs
```

Andernorts `PLAYWRIGHT_MODULE` auf eine vorhandene Playwright-Installation setzen,
bei Bedarf `CHROMIUM_PATH` und `PROTOTYPE_BASE_URL` anpassen. Der Browser-Test
prüft Rendering, direkte 3D-Auswahl, sichtbaren Ausbau, Stufenlimit, Zurücksetzen,
Orbit, Maussteuerung, Mobilansicht und Neuladen und speichert Screenshots.

## Download reproduzieren

Die Laravel-Seite muss laufen und die Assets müssen gebaut sein:

```sh
(umask 022; npm run build)
python3 scripts/codex/export-prototype.py --version 0.4 --output /workspace/exports/v0.4
```

Der Export enthält CSS, JavaScript, Übersetzungen und die Three.js-Lizenz in
**einer** HTML-Datei. Die ZIP enthält zusätzlich eine deutsche Anleitung. Der
Export verändert keine Spielstände oder Abhängigkeiten.

Den gesamten Browser-Test gegen genau diese Datei ohne Netzwerk ausführen:

```sh
PLAYWRIGHT_MODULE=/workspace/ogamex-cloud/browser-tools/node_modules/playwright \
PROTOTYPE_HTML=/workspace/exports/v0.4/OGameX-3D-0.4.html \
ARTIFACT_DIR=/workspace/ogamex-cloud/v04-final-artifacts \
node tests/Frontend/prototype3d.browser.mjs
```

Das Testsystem setzt den HTML-Inhalt offline direkt in ein Browserdokument;
verwaltete Cloud-Browser können die Navigation zu `file://` blockieren. Es prüft
auch verzögerte Stufenänderung, Bauabbruch, Kamerafokus und reduzierte Bewegung.
Die lokale HTML-Datei benötigt keine solchen Cloud-Browserrechte auf dem Mac.
