# OGameX-3D 0.9 ausprobieren

## ZIP-Demo ohne Server

[OGameX-3D-0.9.zip herunterladen](https://github.com/Nostago/ogamex-3d/raw/refs/heads/codex/ogamex-3d-v0.9/downloads/OGameX-3D-0.9.zip),
entpacken und `OGameX-3D-0.9.html` in Safari, Chrome, Firefox oder Edge öffnen.
Keine Installation und kein Server erforderlich. JavaScript und WebGL müssen
aktiv sein. Nach dem Download funktioniert die Demo vollständig ohne Internet.
Die ZIP enthält zusätzlich eine deutsche Anleitung und die HTML-Datei enthält
die Three.js-Lizenz. Versionen 0.1–0.8 bleiben unter `downloads/` erhalten.

## Neu in 0.9: Orbit, Bestände und Flottenverwaltung

- **Planet:** „Kolonie“ und „Orbit“ schalten die Darstellung innerhalb der
  Planetenübersicht um. Orbit verlässt die Planeten-Seite nicht. Die linke
  Navigation „Flotten“ öffnet ausschließlich die Flottenverwaltung.
- **Gebäude:** keine Suchleiste und kein Kategorienfilter. Drei feste Übersichten
  heißen **Rohstoffe**, **Schiffe** und **Verteidigung**. Lager und Terraformer
  gehören zu Rohstoffe; Schiffswerft, Forschung und Fertigungsanlagen zu Schiffe.
  Details, Ausbauten und automatischer Neubau bleiben verfügbar.
- **Schiffe:** jedes Typfeld zeigt dynamisch **Bereit**, **In Produktion /
  beauftragt**, **Frei verfügbar** und bei Bedarf **Auf Mission**. Fertige Schiffe
  am Planeten können bereits einer Flotte zugewiesen sein; nur der freie Anteil
  lässt sich einer weiteren Flotte zuteilen. Produktionszahlen enthalten alle
  offenen Demo-Aufträge, auch noch nicht manuell gestartete.
- **Flotten:** bestehende Flotten mit Name, Zusammensetzung und Status. „Neue
  Flotte“ öffnet einen Editor mit frei verfügbaren Mengen je Typ. Speichern legt
  den Verband an. Bearbeiten kann Namen und Zusammensetzung ändern; Auflösen
  gibt seine Reservierungen wieder frei. Das erzeugt oder vernichtet keine Schiffe.

### Flotten ausprobieren

1. Unter **Schiffe** den Beispielbestand mit 1.100.000 Schiffen laden.
2. Unter **Flotten** „Neue Flotte“ wählen, Namen und Mengen eingeben und speichern.
   Nicht fertig gebaute Schiffe sind noch nicht verfügbar; zugewiesene Schiffe
   können nicht gleichzeitig einer zweiten Flotte zugeordnet werden.
3. „Flotte bearbeiten“ kann auch eigene bisherige Reservierungen wiederverwenden.
   Beim Verkleinern oder Auflösen werden die entsprechenden Mengen frei.
4. „Demo-Mission starten“ setzt die Flotte auf Mission. Nun sind Bearbeiten und
   Auflösen gesperrt. Diese Prüfung erfolgt zusätzlich im Provider und kann nicht
   allein durch Aktivieren eines Buttons umgangen werden. Die Mengen bleiben
   reserviert und zählen nicht als bereit am Planeten.
5. „Demo-Mission beenden“ hebt die Sperre auf. Die Schiffe bleiben bis zum Auflösen
   oder Bearbeiten ihrer Flotte zugewiesen; sie werden nicht doppelt gutgeschrieben.

Der Missionsschalter demonstriert **nur die Sperre**. Es gibt keine echten Flüge,
Flugzeiten, Treibstoffkosten, Transporte oder Kämpfe. Die Demo speichert Flotten
im Arbeitsspeicher der geöffneten Anwendung. Seitenwechsel erhält sie, Reset löscht
sie nur für den aktuellen Planeten, Neuladen setzt alle Demodaten zurück.
Höchstens 30 gespeicherte Flotten dienen als Demo-Speichergrenze und stellen keine
produktive OGame-Regel dar. Beispielbestände lassen sich erst ersetzen, wenn
bestehende Flotten aufgelöst und offene Bauaufträge abgeschlossen/entfernt sind.

Die feste Hauptnavigation bleibt am Desktop links und auf dem Handy unten.
Gebäude und Schiffe bieten kleine optionale 3D-Vorschauen; die große 3D-Ansicht
bleibt bei Planet mit Kolonie und Orbit. Die Anwendung teilt weiterhin genau
einen WebGL-Canvas und pausiert das Rendering, solange dieser nicht sichtbar ist.
Der Orbit zeigt repräsentative Formationen der am Planeten bereiten Schiffe,
nicht die auf Demo-Mission gebundenen Mengen. Millionenbestände erzeugen weiterhin
höchstens zwölf Orbitmodelle.

Laufende Bauten werden durch reine Navigation nicht abgebrochen. „Vorgang
unterbrechen“, Planetenwechsel und Reset stoppen eine laufende Animation;
Schiffsaufträge bleiben beim Unterbrechen vorgemerkt. Formulare und ein offener
Flottenentwurf bleiben bei Seitenwechseln erhalten. Ein Planetenwechsel schließt
den Entwurf, damit keine Reservierung versehentlich am falschen Planeten entsteht.

## Mengenproduktion und große Flotten

**Bestand, Bauaufträge und 3D-Modelle sind getrennte Größen.** Die Oberfläche
zeigt exakte fertige Stückzahlen je Typ sowie zusätzlich vorgemerkte Mengen.
Eine Formation vertritt einen ganzen Schiffstyp; ihre höchstens vier Modelle
sind Stellvertreter. Mit drei Typen entstehen maximal zwölf Orbitmodelle,
unabhängig davon, ob der Bestand drei, eine Million oder eine Milliarde Schiffe
enthält. Der Renderer durchläuft niemals die tatsächliche Stückzahl.

### Ausprobieren

1. Den Bereich **Schiffe** öffnen. Schiffstyp und Stückzahl
   eingeben, z. B. **10.000 Leichte Jäger**. „Mengenauftrag vormerken“ legt einen
   Auftrag an. Mehrere Aufträge können vor dem Start vorgemerkt werden.
2. Unter „Schiffsbau-Aufträge“ **Nächsten Demo-Auftrag ausführen** wählen.
   Eine kurze Montage-/Startanimation steht für den gesamten Auftrag. Die Dauer
   ist unabhängig von der Menge. Fertiger Bestand und Formation ändern sich
   erst nach vollständigem Abschluss, genau einmal um die bestellte Stückzahl.
3. Unter **Planet → Orbit** eine repräsentative Formation auswählen. Die Detailansicht
   zeigt den gesamten fertigen Bestand, nicht die Zahl sichtbarer Modelle.
   Die Auswahl pausiert den Verkehr; „Übersicht“ setzt ihn fort.
4. Unter **Schiffe** „Großflotte · 1.100.000 Schiffe“ auswählen und **Demo-Bestand ersetzen**
   drücken: 750.000 Leichte Jäger, 250.000 Kleine Transporter, 100.000 Sonden.
   Das ersetzt nur die fertige Flotte des ausgewählten Planeten. Offene Aufträge
   müssen vorher abgeschlossen oder entfernt werden. „Patrouille“ stellt drei
   Beispielschiffe ein. Weitere Mengenaufträge addieren sich auf den Bestand.

Planetenwechsel oder „Vorgang unterbrechen“ stoppen die laufende Demoanimation; der Auftrag
bleibt **vorgemerkt** und kann erneut gestartet werden. „Auftrag entfernen“
verwirft einen offenen Auftrag ausdrücklich, ohne fertige Schiffe zu verändern.
Reset löscht Flotte und Aufträge des aktuellen Planeten; Neuladen setzt alle
Planeten zurück. Aufträge anderer Planeten bleiben beim Wechsel erhalten.

Dies ist eine manuell gesteuerte Demo-Warteliste, keine produktive Werft mit
Hintergrundtimer. Ein Auftrag läuft zur Zeit; weitere lassen sich vorab vormerken.
„Bewegung reduzieren“ schließt einen gestarteten Auftrag unmittelbar ab.
Die Demo begrenzt Eingaben auf ganze Zahlen von 1 bis 1.000.000.000 und zwanzig
noch offene Aufträge. Diese Eingabe-/Speichergrenzen sind **keine OGame-Flottenlimits**.
Abgeschlossene/entfernte Aufträge werden als kurze Historie aufbewahrt; insgesamt
bleiben höchstens 25 Aufträge im Speicher. Überläufe über den exakt darstellbaren
JavaScript-Integerbereich werden vor einer Änderung abgewiesen.

Erhalten aus 0.6 sind die detaillierte Schiffswerft und Verteidigung, Nanitenfabrik
und Fusionskraftwerk, insgesamt 15 Anlagentypen, drei prozedurale Schiffsmodelle
und die nach Kategorien gegliederte Gebäudeliste. Keine echten Rohstoffkosten,
Bauzeiten, Forschungsvoraussetzungen, Flugmissionen, Transporte, Spionage oder
Kämpfe. Nanitenfabrik und Fusionskraftwerk beeinflussen keine echte Wirtschaft.
Eine Kampfvisualisierung ist nicht Teil dieser Version.

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
- Gebäude auf dem Planeten oder in den drei Gebäudeübersichten anklicken:
  Detailinformationen und optionaler Kamerafokus. Die Hauptnavigation führt zurück zum Planeten.
- Unter Gebäude „Baumenü“ öffnen, Typ wählen, „Demo errichten“. Der Standort wird automatisch
  vergeben. Ausbau und Neubau zeigen zunächst Gerüst und Fortschritt. Erst bei
  Abschluss ändern sich Stufe, Felder und Modell. Demo-Maximum ist Stufe 8.
- Planetenwechsel, Reset oder „Vorgang unterbrechen“ brechen laufende Gebäudeanimationen ab,
  ohne Felder oder Stufen zu verändern. Unterbrochene Schiffsaufträge bleiben vorgemerkt. Manuelle Kameraeingaben unterbrechen
  Kamerafahrten, ohne den Bau abzubrechen.
- Die Orbitansicht des Planeten zeigt Raumstation und repräsentative Formationen. „Rotation“ aktiviert die
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
`shipCatalog.js` enthält die Demo-Schiffstypen; `fleet.js` trennt Bestände,
Auftragsmengen und begrenzte Formationen und enthält die Beispielbestände;
`ships.js` baut ihre prozeduralen Modelle. `layout.js` vergibt deterministische, voneinander getrennte Oberflächenpositionen.
`data.js` verwaltet Zustand und validiert vor jeder Mutation. `fleetManagement.js` prüft Reservierungen und Missionssperren,
`fleetManagerUi.js` zeichnet Liste und Editor. `buildingGroups.js` ordnet die
Anlagen den drei Übersichten zu. `navigation.js` definiert die vier Hash-Routen. `scene.js` erhält
Snapshots und zeichnet nur; `index.js` verbindet UI, Provider und Animationen.
Abbruchmarken verhindern, dass verspätete Animationsabschlüsse auf dem falschen
Planeten angewandt werden.

Provider-Vertrag (asynchron; Zustandsmethoden liefern vollständige Snapshots,
`listPlanets()` liefert eine Metadatenliste):

```js
await provider.listPlanets();        // kopierte Planeten-Metadaten
await provider.load();
await provider.selectPlanet('small');
await provider.build('terraformer'); // kein Standortargument
await provider.upgrade(instanceId);
await provider.enqueueShip('smallCargo', 10000);
await provider.completeShipOrder(orderId); // genau einmal nach erfolgreicher Animation
await provider.cancelShipOrder(orderId);   // ausdrücklich entfernen
await provider.loadFleetExample('armada'); // ohne offene Aufträge oder Flotten
await provider.saveFleet('Alpha', { lightFighter: 10000 });
await provider.saveFleet('Alpha II', { lightFighter: 12000 }, fleetId);
await provider.disbandFleet(fleetId);
await provider.setFleetMission(fleetId, true); // nur Demo-Sperre, false beendet sie
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
  fleet: [{ type, count }], // gesamter fertiggestellter Bestand
  shipInventory: [{ type, completed, ready, available, assigned, onMission, inProduction }],
  managedFleets: [{ id, name, status, ships: [{ type, count }] }], // docked / mission
  fleetSummary: { total, pending },
  orders: [{ id, type, quantity, status }], // queued, completed, cancelled
  formations: [{ id, type, count, modelCount }], // modelCount <= 4
  layout: [{ id, normal: [x, y, z] }],
  buildings: [{ id, type, siteId, level, metric, value, production }]
}
```

`field_current` ist hier aus den Gebäudestufen abgeleitet; `field_max` meint
Basisfelder, `effective_max` die einschließlich Terraformer. `siteId` ist ein
rein grafischer Standort. Neue Instanz-IDs enthalten Typ und Standort, z. B.
`laser-site-012`; ursprüngliche IDs wie `metal` bleiben erhalten. Formationen besitzen stabile Typ-IDs wie `ship-lightFighter`; neue Mengen
verändern die ID nicht. Aufträge besitzen planetenlokale, fortlaufende IDs wie
`order-4`. `checkShipBuild()` validiert Typ, Schiffswerft, ganzzahlige Menge,
Queuegrenze und sichere Gesamtsumme inklusive aller offenen Aufträge.
`completeShipOrder()` lehnt doppelte oder bereits entfernte Abschlüsse ab.

Die kurze Animationsphase und ihr Fortschritt gehören zum UI. Der Provider kennt
vorgemerkte, abgeschlossene und entfernte Aufträge. Erst die erfolgreich beendete
Animation ruft `completeShipOrder()` auf; Abbruchmarken verhindern verspätete
Abschlüsse nach Reset oder Planetenwechsel. Es gibt keine Timer pro Schiff.
Snapshots sind vollständig
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
ARTIFACT_DIR=/workspace/ogamex-cloud/v09-artifacts \
node tests/Frontend/prototype3d.browser.mjs
```

Andernorts `PLAYWRIGHT_MODULE`, bei Bedarf `CHROMIUM_PATH` und
`PROTOTYPE_BASE_URL` anpassen. Der Browser-Test prüft Planet/Orbit ohne
Seitenwechsel, die drei Gebäudeübersichten ohne Filter, dynamische Typbestände,
Mengenproduktion, nicht verfügbare noch unfertige Schiffe, Flotten anlegen,
bearbeiten und auflösen, Missionssperren, Freigabe von Reservierungen,
planetengetrennte Zustände, Reset, Gebäudefelder/Terraformer und Mobilansichten.
Die Node-Tests prüfen zusätzlich abgewiesene oder manipulierte Eingaben,
atomare Änderungen, Doppelzuweisung, gesperrte Provider-Aufrufe,
Speichergrenzen, Snapshot-Kopien und die bisherigen Modelle und Mengenregeln.
Der Offline-Browser-Test prüft außerdem, dass keine HTTP-Anfragen entstehen.

## ZIP reproduzieren und offline prüfen

Bei laufender Laravel-Seite und gebauten Assets:

```sh
python3 scripts/codex/export-prototype.py --version 0.9 --output /workspace/exports/v0.9
PLAYWRIGHT_MODULE=/workspace/ogamex-cloud/browser-tools/node_modules/playwright \
PROTOTYPE_HTML=/workspace/exports/v0.9/OGameX-3D-0.9.html \
ARTIFACT_DIR=/workspace/ogamex-cloud/v09-artifacts \
node tests/Frontend/prototype3d.browser.mjs
```

Der Export bettet CSS, JavaScript, Übersetzungen und Lizenz in eine HTML-Datei ein.
Der Browser-Test lädt diese ohne Netzwerk direkt als Dokument und prüft, dass
keine HTTP-Anfragen entstehen. Dieser Weg berücksichtigt, dass verwaltete
Cloud-Browser `file://` sperren können; auf dem lokalen Rechner wird die entpackte
HTML-Datei normal geöffnet. ZIP-Integrität und Download werden separat geprüft.
