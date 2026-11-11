# OGameX-3D 0.6 ausprobieren

## ZIP-Demo ohne Server

[OGameX-3D-0.6.zip herunterladen](https://github.com/Nostago/ogamex-3d/raw/refs/heads/codex/ogamex-3d-v0.6/downloads/OGameX-3D-0.6.zip),
entpacken und `OGameX-3D-0.6.html` in Safari, Chrome, Firefox oder Edge öffnen.
Keine Installation und kein Server erforderlich. JavaScript und WebGL müssen
aktiv sein. Nach dem Download funktioniert die Demo vollständig ohne Internet.
Die ZIP enthält zusätzlich eine deutsche Anleitung und die HTML-Datei enthält
die Three.js-Lizenz. Versionen 0.1–0.5 bleiben unter `downloads/` erhalten.

## Neu in 0.6: Schiffswerft und Orbitflotte

- Detailliertere Schiffswerft mit offener Montageplattform, Andockarmen,
  Hallenrippen, Kontrollfenstern, Lüftern und Kran. Raketenwerfer und Laser
  besitzen zusätzliche Sockel, Abstützungen, Kühlrippen und Sensoren.
- Nanitenfabrik und Fusionskraftwerk: zwei zusätzliche, automatisch platzierte
  Anlagen mit eigenen Betriebsanimationen und stufenabhängigen Modellen.
  Insgesamt 15 Gebäudetypen. Keine Simulation der echten Naniten-Zeitverkürzung
  oder des Deuteriumverbrauchs eines Fusionskraftwerks.
- Die Gebäudeliste ist in Ressourcen, Einrichtungen, Lager und Verteidigung
  gegliedert. Jeder Eintrag bleibt einzeln auswählbar.
- Schiffswerft auswählen, unter den Gebäudedetails einen **Leichten Jäger**,
  **Kleinen Transporter** oder eine **Spionagesonde** wählen und „Demo-Schiff
  bauen und starten“ drücken. Die Schiffswerft montiert ein sichtbares Modell,
  anschließend steigt es von der Plattform auf. Erst nach Abschluss erscheint
  es als zusätzliche Instanz im Orbit. Die Ansicht wechselt zur neuen Einheit.
- Im Orbit Schiffe direkt oder in der Flottenliste anklicken: Kamerafokus,
  Modellinformationen und Herkunft (anfängliches Beispiel oder neu gebaut).
  Die Auswahl pausiert den Orbitverkehr zum Betrachten; „Übersicht“ setzt ihn fort.
- Drei anfängliche Beispielschiffe pro Planet, höchstens zwölf sichtbare Schiffe
  pro Planet als **Darstellungsbudget**, kein produktives Flottenlimit.
  Fertige Schiffe bleiben beim Planetenwechsel erhalten. Reset betrifft nur den
  aktuellen Planeten; Neuladen setzt alle Flotten und Kolonien zurück.

Es gibt einen Demo-Bauvorgang gleichzeitig (Gebäude oder Schiff). Planetenwechsel,
Orbitwechsel oder Reset brechen laufende Vorgänge ab, bevor Daten übernommen
werden. Manuelle Kamerabewegung unterbricht nur die Kamerafahrt. Bei „Bewegung
reduzieren“ werden Schiffsmontage und Start unmittelbar abgeschlossen.
Die Demo belastet keine Rohstoffe und prüft keine echten Forschungsvoraussetzungen
oder Bauzeiten. Schiffsbau setzt hier nur eine vorhandene Schiffswerft voraus.
Schiffe verbrauchen keine Gebäude-Baufelder. Keine Flugmissionen, Transporte,
Spionageaktionen, Forschung oder Kämpfe; sämtliche Angaben bleiben Demodaten.

## Planeten und automatische Bebauung

Drei unabhängig bearbeitbare Demo-Planeten mit unterschiedlicher physischer
Größe, Koloniedichte und Infrastruktur:

| Planet | Durchmesser | Basisfelder | Terraformer anfangs | Belegt / effektiv maximal | Anlagen anfangs | Grafiklimit |
|---|---:|---:|---:|---:|---:|---:|
| Aster, klein | 9.000 km | 16 | 0 | 15 / 16 | 6 | 18 |
| Kepler IX, mittel | 14.000 km | 32 | 0 | 20 / 32 | 9 | 32 |
| Titan Prime, groß | 22.000 km | 64 | 1 | 29 / 69 | 13 | 48 |

Durchmesser und Anfangswerte sind ausdrücklich gewählte **Demodaten**, keine
Nachbildung der produktiven Planetengenerierung. Die Darstellung skaliert den
Kugelradius, nicht die Gebäude. Ein größerer Planet bietet mehr Abstand und
andere Infrastruktur. Die unterschiedlichen Grafiklimits dienen ausschließlich
der Performance; sie sind keine OGame-Baufelder.

Gebäude erhalten automatisch einen passenden, reproduzierbaren Standort.
Es gibt keine manuelle Bauflächenwahl. Ressourcen und Einrichtungen stehen
bevorzugt nahe am Koloniekern, Verteidigung weiter außen. Bestehende Standorte
bleiben beim Ausbau und Neubau unverändert. Einzigartige Gebäude sind einmal
baubar, Raketenwerfer und leichte Laser auch mehrfach.

Der Terraformer ist ein eigenständiger Anlagentyp, mit rotierendem Ring und
stufenabhängigem Modell. Er erhöht die nutzbaren Felder, **nicht** den Durchmesser.
Die Anzeige trennt Basisfelder, Terraformer-Bonus und verbleibende Kapazität.

## Bedienung

- Oben einen Planeten auswählen. Änderungen bleiben während dieser geöffneten
  Demo pro Planet erhalten. „Diesen Planeten zurücksetzen“ setzt nur diesen
  Planeten zurück; Neuladen setzt alle drei zurück.
- Maus ziehen: drehen; Mausrad oder +/−: zoomen. Touch unterstützt Ziehen und
  Zoom-Schaltflächen. In der fokussierten Szene funktionieren Pfeiltasten und +/−.
- Gebäude auf dem Planeten oder in der scrollbaren Gebäudeliste anklicken:
  Detailinformationen und Kamerafokus. „Übersicht“ führt zurück zum Planeten.
- „Baumenü“ öffnen, Typ wählen, „Demo errichten“. Der Standort wird automatisch
  vergeben. Ausbau und Neubau zeigen zunächst Gerüst und Fortschritt. Erst bei
  Abschluss ändern sich Stufe, Felder und Modell. Demo-Maximum ist Stufe 8.
- Planetenwechsel, Reset oder Orbitwechsel brechen laufende Bauanimationen ab,
  ohne Felder oder Stufen zu verändern. Manuelle Kameraeingaben unterbrechen
  Kamerafahrten, ohne den Bau abzubrechen.
- „Orbit“ zeigt Raumstation und drei Beispielschiffe. „Rotation“ aktiviert die
  Kameradrehung. „Bewegung reduzieren“ in den Systemeinstellungen stoppt
  Betriebsanimationen und macht Kamerafokus und Bauen unmittelbar.

Zum Testen der Feldgrenze Aster auswählen und die Metallmine einmal ausbauen:
16 / 16 Felder, weitere Gebäudeausbauten gesperrt, Verteidigung weiterhin möglich.
Danach Aster zurücksetzen und zuerst den Terraformer errichten: 16 / 21 Felder.
Ein weiterer Terraformer-Ausbau ergibt 17 / 27. Der Planet bleibt gleich groß.

Erhalten sind die technischen Baugruppen, prozeduralen Metall-/Beton-/Solartexturen,
Betriebsanimationen, Schatten, Straßen, Leitungen, Rohre, Logistikknoten und drei
Transportfahrzeuge aus 0.4. Die Infrastruktur verbindet tatsächlich vorhandene
Anlagen und wächst bei Neubauten mit. Gemeinsame Materialien, zwischengespeicherte
statische Schatten, maximal 1,5-fache Pixeldichte und begrenzte Modellzahlen halten
die Darstellung überschaubar. Pro Anlagentyp prüfen Tests Stufen 1–8 auf höchstens
130 Meshes und weniger als 20.000 Dreiecke.

## Feldregeln und Grenzen der Demo

Die folgenden Regeln wurden am vorhandenen OGameX-Spielkern überprüft:

- `PlanetService::getBuildingCount()` summiert die Stufen feldverbrauchender
  Gebäude und Einrichtungen. Eine Ausbaustufe belegt ein weiteres Feld;
  Gebäudemodelle und Felder sind deshalb verschiedene Größen. Verteidigung
  wird dort nicht in die Gebäudesumme aufgenommen.
- `PlanetService::getPlanetFieldMax()` berechnet für Planeten
  `field_max + terraformer * 5 + floor(terraformer / 2)`. Mondregeln sind in dieser
  Planetendemo nicht implementiert.
- `BuildingQueueService::add()` prüft vor dem feldverbrauchenden Ausbau, ob
  bereits alle Felder belegt sind. Auch der Terraformer verbraucht selbst ein
  Feld: auf einem vollständig belegten Planeten kann er nicht einfach die
  Kapazität retten. Deshalb ist Aster anfangs mit einem freien Feld ausgestattet.
- `StationObjects::terraformer()` definiert produktive Voraussetzungen und
  Kosten. Diese werden hier bewusst nicht simuliert.

Quellen: `app/Services/PlanetService.php`, `app/Services/BuildingQueueService.php`,
`app/GameObjects/StationObjects.php`, `app/Models/Abstracts/GameObject.php`.
Die produktive Planetenerzeugung in `PlanetServiceFactory` hat eigene Regeln;
die Demo-Profile ersetzen diese nicht. Keine dieser produktiven Dateien wird
für den Prototyp geändert.

Kosten, echte Bauzeiten, Forschungsvoraussetzungen, Energiehaushalt und
Rohstoffproduktion bleiben unverbundene Beispielwerte. Keine produktive Schiffsproduktion,
Forschung oder Kämpfe; der neue Schiffsbau ist ausschließlich eine Demoanimation. Die Verteidigungs-„Stufe“ ist ein grafischer Demo-Ausbau,
kein produktives Verteidigungsstufensystem. Das separat gemeldete Grafiklimit
begrenzt gezeichnete Modelle, auch wenn logisch noch Felder frei sind.
Es werden keine Spielstände, Datenbanken oder produktiven Bauaufträge verändert.

## Architektur und spätere Anbindung

`planets.js` enthält ausschließlich Demo-Profile und Ausgangskolonien.
`catalog.js` beschreibt Typen, Kategorien, Wiederholbarkeit und Feldverbrauch.
`shipCatalog.js` enthält die Demo-Schiffstypen und das Darstellungsbudget;
`ships.js` baut ihre prozeduralen Modelle. `layout.js` vergibt deterministische, voneinander getrennte Oberflächenpositionen.
`data.js` verwaltet Zustand und validiert vor jeder Mutation. `scene.js` erhält
Snapshots und zeichnet nur; `index.js` verbindet UI, Provider und Animationen.
Abbruchmarken verhindern, dass verspätete Animationsabschlüsse auf dem falschen
Planeten angewandt werden.

Provider-Vertrag (alle Methoden asynchron, Rückgabe jeweils vollständiger Snapshot):

```js
await provider.listPlanets();        // kopierte Planeten-Metadaten
await provider.load();
await provider.selectPlanet('small');
await provider.build('terraformer'); // kein Standortargument
await provider.upgrade(instanceId);
await provider.buildShip('smallCargo'); // sofortige Demo-Mutation nach Animation
await provider.reset();              // nur aktueller Planet
```

```js
{
  planet: { id, name, diameter, renderRadius, field_max, visualLimit, tint },
  name, coordinates,
  capacity: {
    field_current, field_max, terraformer,
    terraformer_bonus, effective_max, remaining
  },
  ships: [{ id, type, origin }], // origin: 'example' oder 'built'
  layout: [{ id, normal: [x, y, z] }],
  buildings: [{ id, type, siteId, level, metric, value, production }]
}
```

`field_current` ist hier aus den Gebäudestufen abgeleitet; `field_max` meint
Basisfelder, `effective_max` die einschließlich Terraformer. `siteId` ist ein
rein grafischer Standort. Neue Instanz-IDs enthalten Typ und Standort, z. B.
`laser-site-012`; ursprüngliche IDs wie `metal` bleiben erhalten. Die drei Schiffstypen besitzen planetenlokale Instanz-IDs wie `ship-4`.
`checkShipBuild()` validiert Typ, Schiffswerft und Grafiklimit vor jeder Mutation.
Der Provider startet keine Hintergrundtimer oder produktiven Aufträge: erst nach
erfolgreicher Animation ruft das UI `buildShip()` auf. Abbruchmarken verhindern
den Aufruf nach Planetenwechsel oder Reset. Snapshots sind
kopiert, sodass UI-Mutationen den Provider nicht verändern.

Ein späterer authentifizierter HTTP-Adapter liefert echte Planetendaten und
serverseitig berechnete Kapazitäten und bearbeitet Bauaufträge über die bestehenden
OGameX-Dienste. Der Server muss Berechtigungen, Felder, Kosten, Voraussetzungen,
Produktion und Bauzeiten verbindlich prüfen; der Demo-Provider ist keine
Sicherheits- oder Spielregelinstanz. Die grafischen Standorte können aus stabilen
Planet-/Instanz-IDs abgeleitet bleiben. Keine Speicherung in Local Storage oder
Cookies durch den Prototyp; die normale Laravel-Session bleibt erhalten.

`routes/web.php` ergänzt eine öffentliche GET-Demoseite. Eine geklonte
Vite-Instanz in Blade liefert Modultags, während die alten jQuery-Einstiege ihre
bisherige Konfiguration behalten. Three.js **0.160.1** liegt samt MIT-Lizenz als
ES-Modul unter `resources/js/prototype3d/vendor/`. Quelle: offizielles npm-Paket
`three@0.160.1`, Tarball-SHA-1 `61fe2907312e8604b1f64187f58e047503847413`.
Keine Änderung bestehender OGameX-Abhängigkeiten oder Lockfiles, keine CDNs.
Deutsch ist voreingestellt; englische Übersetzungsschlüssel sind vorhanden.

## Entwicklerstart und Prüfungen

In der vorbereiteten Cloud-Umgebung:

```sh
cd /workspace/ogamex-3d
sh scripts/codex/start.sh
(umask 022; npm run build)
```

Die Route `http://127.0.0.1/prototype-3d` ist **nur innerhalb derselben Umgebung**
erreichbar. Auf einem lokal betriebenen Docker-Server `http://localhost/prototype-3d`
verwenden, auf einem veröffentlichten Webserver dessen Basisadresse ergänzen.
Für die ZIP ist dieser Server nicht nötig. Keine erneute Vollinstallation notwendig.
Bei beendetem Vite-Dev-Server eine veraltete ignorierte `public/hot` entfernen.

```sh
node --test tests/Frontend/*.test.mjs
sh scripts/codex/compose.sh exec -T ogamex-app composer run rector
sh scripts/codex/compose.sh exec -T ogamex-app composer run cs
sh scripts/codex/compose.sh exec -T ogamex-app composer run stan
sh scripts/codex/compose.sh exec -T ogamex-app composer run tests -- \
  --processes=2 --filter 'Prototype3dTest|Http200Test|RustFfiTest'
```

Die Node-Tests prüfen Profile, Feldgrenzen, Terraformer, stabile automatische
Positionen, mehrfache Verteidigung, getrennte Grafikgrenzen, Planetenwechsel,
Reset und Geometriebudgets. Der optionale Browser-Test benötigt eine vorhandene
Playwright-/Chromium-Installation außerhalb der Projektabhängigkeiten:

```sh
PLAYWRIGHT_MODULE=/workspace/ogamex-cloud/browser-tools/node_modules/playwright \
ARTIFACT_DIR=/workspace/ogamex-cloud/v05-artifacts \
node tests/Frontend/prototype3d.browser.mjs
```

Andernorts `PLAYWRIGHT_MODULE`, bei Bedarf `CHROMIUM_PATH` und
`PROTOTYPE_BASE_URL` anpassen. Browserchecks umfassen echte WebGL-Ausgabe, die
drei Profile, Bauanimation und verzögerte Mutation, volle Felder, Verteidigung,
Terraformer, unabhängige Zustände, Abbruch bei Planeten-/Orbitwechsel und Reset,
Kamera, Maus, Mobilansicht, reduzierte Bewegung und Neuladen. Zusätzlich werden
Schiffsmontage und sichtbarer Start, verzögerter Flottenzuwachs, Schiffsauswahl,
Bauabbruch an allen drei Grenzen und die neuen Anlagen geprüft. Screenshots werden
im angegebenen Verzeichnis abgelegt.

## ZIP reproduzieren und offline prüfen

Bei laufender Laravel-Seite und gebauten Assets:

```sh
python3 scripts/codex/export-prototype.py --version 0.6 --output /workspace/exports/v0.6
PLAYWRIGHT_MODULE=/workspace/ogamex-cloud/browser-tools/node_modules/playwright \
PROTOTYPE_HTML=/workspace/exports/v0.6/OGameX-3D-0.6.html \
ARTIFACT_DIR=/workspace/ogamex-cloud/v05-artifacts \
node tests/Frontend/prototype3d.browser.mjs
```

Der Export bettet CSS, JavaScript, Übersetzungen und Lizenz in eine HTML-Datei ein.
Der Browser-Test lädt diese ohne Netzwerk direkt als Dokument und prüft, dass
keine HTTP-Anfragen entstehen. Dieser Weg berücksichtigt, dass verwaltete
Cloud-Browser `file://` sperren können; auf dem lokalen Rechner wird die entpackte
HTML-Datei normal geöffnet. ZIP-Integrität und Download werden separat geprüft.
