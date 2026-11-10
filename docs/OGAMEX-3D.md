# OGameX-3D 0.1 ausprobieren

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
- „Rotation“ aktiviert die automatische Kameradrehung, „Kamera“ setzt die Sicht
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
```

Die vier IDs sind `metal`, `crystal`, `deuterium`, `solar`. Die aktuelle Demo hat
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
node --test tests/Frontend/Prototype3d.test.mjs
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
