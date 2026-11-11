# OGameX-3D 0.12 ausprobieren

## ZIP-Demo ohne Server

[OGameX-3D-0.12.zip herunterladen](https://github.com/Nostago/ogamex-3d/raw/refs/heads/codex/ogamex-3d-v0.12/downloads/OGameX-3D-0.12.zip),
entpacken und `OGameX-3D-0.12.html` in Safari, Chrome, Firefox oder Edge öffnen.
Keine Installation und kein Server erforderlich. JavaScript und WebGL müssen
aktiv sein. Nach dem Download funktioniert die Demo vollständig ohne Internet.
Die ZIP enthält zusätzlich eine deutsche Anleitung und die HTML-Datei enthält
die Three.js-Lizenz. Versionen 0.1–0.11 bleiben unter `downloads/` erhalten.

## Neu in 0.12: Galaxie, Rohstoffbestände und Transporte

**Galaxie** ist ein eigener Hauptbereich. Galaxie und System eingeben oder mit
Systempfeilen navigieren; „Eigenes System“ führt nach `[1:42]`. Die Übersicht
enthält die Positionen 1–15 und einen gekennzeichneten Expeditionsplatz 16.
Die drei eigenen Kolonien befinden sich auf Position 6–8; fremde Beispielplaneten
auf 3 und 10. Eine Position auswählen, um Details zu sehen. Eigene Kolonien
lassen sich öffnen und als Transportziel übernehmen. Fremde Spieleraktionen,
Kolonisation, Expeditionen, Monde und Trümmerfelder werden noch nicht simuliert.
Die Grenzen von 3 Galaxien und 499 Systemen sind lokale Beispieldaten; das echte
Universum wird später über einen Serveradapter geladen.

Oben stehen **Metall, Kristall und Deuterium** des gewählten Planeten. Jeder
startet mit 100.000 / 50.000 / 25.000. Es gibt noch keine passive Produktion,
Baukosten, Energiebilanz oder Speicherung nach dem Schließen der HTML-Datei.

Unter **Flotten → Transport planen** eine bereits angelegte, verfügbare Flotte,
eine eigene Zielkolonie und Rohstoffmengen wählen. Die Mengen müssen ganzzahlig,
nicht negativ, zusammen größer als null und durch Bestand und Laderaum gedeckt
sein. Die Prüfung erfolgt zusätzlich im Provider vor jeder Änderung. Ausstehende
Schiffe können nicht verwendet und Flotten nicht doppelt gestartet werden.

Die Basis-Ladekapazitäten entsprechen `CivilShipObjects.php` und
`MilitaryShipObjects.php`: Kleiner Transporter 5.000, Leichter Jäger 50,
Spionagesonde 0. Forschungs-/Klassenboni und Treibstoff sind ausgenommen.
`TransportMission::processArrival` ist das Vorbild für Zustellung und leeren
Rückflug; alle neuen Abläufe verwenden ausschließlich lokale Beispieldaten.

Beim Start wird Ladung sofort vom Ursprung abgebucht und bleibt im Missions-DTO.
Nach **15 Sekunden** wird sie genau einmal zugestellt. Der Verband bleibt am
Ursprung reserviert und bis zur Rückkehr nach **weiteren 15 Sekunden** gesperrt.
Seine Schiffe werden am Ziel nicht dem Bestand hinzugefügt. Erst zuhause werden
sie wieder frei. Nachrichten → Flotten → Transport enthält die Berichte zu
Zustellung und Rückkehr. Menüwechsel und Hintergrundtabs stoppen die Missionen
nicht; beim nächsten Abgleich werden auch beide Flugabschnitte nachgeholt.

Reset stoppt betroffene Demo-Missionen. Wird das Ziel vor Zustellung zurückgesetzt,
kehrt noch unzugestellte Ladung in den unveränderten Ursprung zurück und die
Flotte wird freigegeben. Nach Zustellung gibt es keine rückwirkende Erstattung.
Reset des Ursprungs setzt dessen Daten auf den Startzustand; verspätete Ankünfte
bleiben ausgeschlossen. Das ist eine Reset-Regel der Demo, keine OGame-Mission.

Ausprobieren: Unter Flotten einen Verband mit einem Kleinen Transporter anlegen,
unter Galaxie Position 6 auswählen und „Transport planen“ drücken. 3.000 Metall,
1.000 Kristall und 500 Deuterium einladen und starten. Nach Zustellung die Kolonie
öffnen, ihren Bestand sowie den Bericht prüfen. Nach Rückkehr die Flotte erneut
verwenden. Der Auftragssammelbutton aus 0.11 bleibt unverändert verfügbar.

## Seit 0.11: Aufträge automatisch abarbeiten

Unter **Schiffe** mehrere Mengenaufträge vormerken und **Alle Aufträge abarbeiten**
drücken. Die Liste wird in ihrer Reihenfolge verarbeitet, ein Auftrag nach dem
anderen. Auch bei geschlossener 3D-Vorschau und Wechsel in andere Menüs läuft sie
weiter. Pro abgeschlossenen Auftrag wird die Stückzahl genau einmal gutgeschrieben.
**Unterbrechen** stoppt den aktuellen Auftrag und die automatische Verarbeitung;
alle noch offenen Aufträge bleiben vorgemerkt. Der Button setzt die Liste später
fort. Ein Planetenwechsel stoppt ebenfalls, Reset verwirft die lokalen Demodaten.
Es gibt weiterhin keine echten Bauzeiten, Kosten oder Hintergrundverarbeitung
nach dem Schließen der HTML-Datei. Der Einzelauftrag-Button bleibt verfügbar.

## Seit 0.10: Verlegungen und Nachrichten

### Demo-Verlegungen

Unter **Flotten** eine bestehende Flotte zusammenstellen, einen anderen eigenen
Planeten wählen und „Verlegung bestätigen und starten“ drücken. Zusammensetzung,
Ziel und feste **15 Sekunden Demo-Flugzeit** sind vor dem Start sichtbar. Die
Missionsübersicht zeigt Herkunft, Ziel, Fortschritt und Ankunft. Mit „Zielplanet
öffnen“ lässt sich der empfangende Planet direkt auswählen.

Während des Flugs kann die Flotte weder bearbeitet noch aufgelöst oder erneut
gestartet werden. Ihre Schiffe bleiben gebunden, zählen nicht als bereit am
Herkunftsplaneten und sind am Ziel noch nicht verfügbar. Bei Ankunft wird der
Herkunftsbestand genau einmal vermindert, der Zielbestand genau einmal erhöht
und die Flotte am Ziel wieder freigegeben. Interne Flotten-IDs werden dort neu
vergeben, damit bestehende Flotten nicht überschrieben werden. Große Mengen
werden als Zahlen übertragen, ohne Modelle pro Schiff anzulegen.

Die Uhr verwendet Zeitstempel, keinen Fortschrittszähler pro Bild. Seitenwechsel
und eine geschlossene 3D-Vorschau stoppen Missionen nicht. Nach Rückkehr aus einem
Hintergrundtab werden fällige Ankünfte nachgeholt. Die kurze Demo-Flugzeit bildet
keine echte OGame-Flugzeit, Geschwindigkeitsauswahl oder Treibstoffberechnung ab.
Es gibt weiterhin keine Angriffs- oder Kampfmissionen.

Reset eines Zielplaneten bricht seine noch eintreffenden Demo-Missionen ab und
gibt die Ursprungsflotten wieder frei. Reset des Ursprungs entfernt dessen
Demodaten und verhindert verspätete Ankünfte. Andere Planetenbestände bleiben
unverändert. Neuladen setzt die gesamte Offline-Demo zurück.

### Nachrichten: Originalstruktur und neue Gestaltung

Die Hauptseite **Nachrichten** übernimmt die Kategorien aus
`MessageService::$tabs`: Flotten, Kommunikation, Wirtschaft, Universum, System,
Favoriten. Bei Flotten gibt es Spionage, Kampfberichte, Expeditionen, Transport
und Sonstiges; Kommunikation enthält Nachrichten und Informationen.

Die Offline-Demo enthält ausschließlich lokale Beispielnachrichten. Anzeigen,
Nachrichtendetails, Ungelesenzähler, Löschen und Seiten mit zehn Einträgen sind
funktionsfähig. Beim Laden einer Liste gelten deren Einträge wie im vorhandenen
`getMessagesForTab()` als gelesen. Erfolgreiche Demo-Verlegungen erzeugen je
einen ungelesenen Bericht unter **Flotten → Sonstiges**. Der Posteingang gehört
wie im Original zum Spieler und ist über alle Planeten hinweg derselbe.
Nachrichten werden nicht an andere Spieler gesendet. Favoriten bleibt als
Originalkategorie vorhanden, ohne eine neue Favoriten- oder Sendelogik zu erfinden.

**Das echte Originalpostfach bleibt erhalten.** In Laravel öffnet der Link
„Originalpostfach öffnen · Anmeldung erforderlich“ die vorhandene Route
`/messages?prototype3d=1`. Sie verwendet weiterhin den originalen
`MessagesController`, `MessageService`, `GameMessageFactory`, die Berichtsansichten,
Berechtigungsprüfungen und AJAX-Aktionen. Eine optionale, auf den Nachrichtenbereich
begrenzte Gestaltung passt Farben, Karten und Tabs an. Ohne den Parameter bleibt
auch das bisherige Aussehen unverändert. Der originale Spielrahmen bleibt dabei
erhalten; es wird keine neue produktive Nachrichten-API eingeführt.

Der Server-Link wird beim ZIP-Export entfernt, da eine lokale HTML-Datei keinen
angemeldeten Laravel-Server besitzt. Für echte Nachrichten ist eine laufende
OGameX-Instanz mit Anmeldung nötig. Ausführliche echte Spionage-/Kampfberichte
werden im Originalpostfach weiterhin von den bestehenden Vorlagen gerendert;
die Offline-Datei ersetzt diese nicht durch erfundene echte Ergebnisse.

### Erhaltene Arbeitsbereiche

Planet zeigt Kolonie und Orbit; Gebäude bleibt in Rohstoffe, Schiffe und
Verteidigung gegliedert. Schiffe zeigt Bereit, In Produktion / beauftragt, Frei
verfügbar und Auf Mission. Flotten verwaltet Namen, Zusammensetzungen und
Reservierungen. Eine Einheit kann keiner zweiten Flotte gleichzeitig zugewiesen
werden; Bauaufträge sind vor Abschluss nicht verfügbar. Bearbeiten kann eigene
Reservierungen wiederverwenden. Auflösen einer Flotte gibt Reservierungen frei,
erzeugt aber keine neuen Schiffe.

Die feste Navigation steht links, auf dem Handy unten. Die 3D-Ansicht bleibt
bei Planet; kleine Vorschauen sind optional. Alle Seiten teilen einen Canvas.
Offene Eingaben und Flottenentwürfe bleiben bei Navigation erhalten. Die neuen
Missionen und Nachrichten sind wie bisher nur im Arbeitsspeicher der Demo;
Neuladen setzt sie zurück. Höchstens 30 gespeicherte Flotten, 30 aktive Missionen,
eine kurze Missionshistorie und 100 Beispielnachrichten begrenzen den Speicher.
Diese Grenzen sind keine produktiven OGame-Regeln. Historische Berichte bleiben
bei einem einzelnen Planeten-Reset erhalten.

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
Bauzeiten, Forschungsvoraussetzungen, Spionage oder Kämpfe.
Verlegungen und Transporte sind vereinfachte lokale Demo-Missionen. Nanitenfabrik und Fusionskraftwerk beeinflussen keine echte Wirtschaft.
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
`fleetManagerUi.js` zeichnet Liste und Editor. `missions.js` enthält die kurze
Demo-Flugzeit und Fortschrittsprojektion, `missionUi.js` die Missionsübersicht.
`galaxy.js` liefert Systempositionen, `galaxyUi.js` zeigt die Galaxieauswahl.
`transport.js` validiert Ladung und Basis-Laderaum, `transportUi.js` übernimmt
die Transportplanung.
`messages.js` hält das lokale Beispielpostfach, `messageUi.js` stellt es dar.
Ziel-Flottenplätze und Mengen werden vor dem Start reserviert; fällige Ankünfte
werden im Provider synchron abgeschlossen und sind dadurch idempotent. `buildingGroups.js` ordnet die
Anlagen den drei Übersichten zu. `navigation.js` definiert die sechs Hash-Routen. `scene.js` erhält
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
await provider.startMission(fleetId, 'small'); // Verlegung
await provider.startMission(fleetId, 'small', 'transport', { metal: 3000, crystal: 1000, deuterium: 500 });
// alternativer Start desselben verfügbaren Verbands, kein zweiter gleichzeitiger Flug
await provider.advanceMissions(); // Snapshot bei Ankunft, sonst null
await provider.readMessages('fleets', 'other', 1);
await provider.deleteMessage(messageId);
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
  resources: { metal, crystal, deuterium }, // lokaler Bestand ohne passive Produktion
  fleet: [{ type, count }], // gesamter fertiggestellter Bestand
  shipInventory: [{ type, completed, ready, available, assigned, onMission, inProduction }],
  managedFleets: [{ id, name, status, ships: [{ type, count }] }], // docked / mission
  missions: [{ id, fleetId, originId, targetId, ships, startedAt, arrivesAt, status, kind, cargo, delivered, returnsAt }],
  messages: [{ id, tab, subtab, key, params, viewed, createdAt }],
  incomingTotal, // für Zielkapazitäts- und Integerprüfungen reservierte Mengen
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
  --processes=2 --filter 'Prototype3dTest|Http200Test|RustFfiTest|MessagesTest'
```

Die Node-Tests prüfen außerdem serielle Auftragsverarbeitung, Mehrfachstart,
Abbruch während einer Animation und Neustart ohne Fortsetzen alter Läufe.
Die Browserprüfung testet die komplette Liste, Menüwechsel, Unterbrechen und
Fortsetzen sowie Planetenwechsel und Reset ohne doppelte Gutschriften.
Die Node-Tests prüfen Profile, Feldgrenzen, Terraformer, stabile automatische
Positionen, mehrfache Verteidigung, getrennte Grafikgrenzen, Planetenwechsel,
Reset und Geometriebudgets. Der optionale Browser-Test benötigt eine vorhandene
Playwright-/Chromium-Installation außerhalb der Projektabhängigkeiten:

```sh
PLAYWRIGHT_MODULE=/workspace/ogamex-cloud/browser-tools/node_modules/playwright \
ARTIFACT_DIR=/workspace/ogamex-cloud/v012-artifacts \
node tests/Frontend/prototype3d.browser.mjs
```

Andernorts `PLAYWRIGHT_MODULE`, bei Bedarf `CHROMIUM_PATH` und
`PROTOTYPE_BASE_URL` anpassen. Node-Tests prüfen exakte Schiffsübertragung,
idempotente Ankunft, Hin-/Rück- und gleichzeitige Flüge, nachgeholte Ankünfte,
Missionssperren, Zielkapazitätsreservierungen, Reset während eines Flugs,
Nachrichten-Pagination, Gelesenstatus, Löschung und die bisherigen Bestände,
Modelle und Baufelder. Weitere Tests prüfen Galaxiegrenzen, Koordinaten,
Transportvalidierung, doppelte Starts, Ressourcenreservierung, Zustellung,
leere Rückkehr, Nachholen und Reset/Erstattung. Browserchecks durchlaufen zwei echte zeitgesteuerte
Demo-Verlegungen, Nachrichten öffnen/lesen/löschen, Ankunftsberichte,
Planetenwechsel, Flottenbearbeitung, Mobilansichten, Galaxienavigation,
Zielübergabe, Transportbeladung, Zustellung und Rückflug.
Der Offline-Test prüft, dass keine HTTP-Anfragen und keine lokalen Server-Links
im Paket verbleiben. PHP-Tests prüfen auch das Originalnachrichtenmodul und den
optionalen Theme-Parameter bei ansonsten unveränderter Originalroute.

## ZIP reproduzieren und offline prüfen

Bei laufender Laravel-Seite und gebauten Assets:

```sh
python3 scripts/codex/export-prototype.py --version 0.12 --output /workspace/exports/v0.12
PLAYWRIGHT_MODULE=/workspace/ogamex-cloud/browser-tools/node_modules/playwright \
PROTOTYPE_HTML=/workspace/exports/v0.12/OGameX-3D-0.12.html \
ARTIFACT_DIR=/workspace/ogamex-cloud/v012-artifacts \
node tests/Frontend/prototype3d.browser.mjs
```

Der Export bettet CSS, JavaScript, Übersetzungen und Lizenz in eine HTML-Datei ein.
Der Browser-Test lädt diese ohne Netzwerk direkt als Dokument und prüft, dass
keine HTTP-Anfragen entstehen. Dieser Weg berücksichtigt, dass verwaltete
Cloud-Browser `file://` sperren können; auf dem lokalen Rechner wird die entpackte
HTML-Datei normal geöffnet. ZIP-Integrität und Download werden separat geprüft.
