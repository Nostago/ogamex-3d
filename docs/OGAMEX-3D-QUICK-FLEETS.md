# Schnellversand und Flottenradar

Branch: `codex/ogamex-3d-quick-fleet-dispatch`.

## Flotten aus Karte und Galaxie starten

Eine Position anklicken und beispielsweise **Spionieren** wählen. Im kleinen Fenster
ist das Ziel bereits festgelegt. Nur die **Anzahl der Spionagesonden** eingeben und
**Spionagesonden starten** anklicken. Ein zusätzlicher Bestätigungsdialog entfällt.
Die vorhandene Missionsprüfung läuft automatisch, bevor die Originalverwaltung die
Flotte losschickt. Ohne passende Sonden bleibt der Startbutton gesperrt.

Der gleiche Schnellversand funktioniert aus der Galaxietabelle. Für andere Missionen
zeigt er die verfügbaren Schiffe mit Mengenfeldern; bei Kolonisation, Recycling und
Mondzerstörung wird das passende Spezialschiff vorausgewählt. Begleitschiffe lassen
sich zusätzlich auswählen. Rohstoffladung ist bei Transport und Stationierung optional;
Missionen mit Haltezeit bieten das zugehörige Eingabefeld. Schnellmissionen verwenden
100 % Geschwindigkeit. **Ausführliche Flottenplanung** öffnet bei Bedarf den
vorhandenen Planer, etwa für andere Geschwindigkeiten und besondere Verbandsoptionen.

Die vollständige Flottenansicht enthält oben eine sichtbare, beim Scrollen erreichbare
Leiste mit **Flotte jetzt starten**; derselbe Button steht auch bei der Flugvorschau.
Beide zeigen denselben Prüfzustand. Fehler und fehlende Voraussetzungen werden an
der oberen Leiste angezeigt. Schiffstypen ohne verfügbare Einheiten blenden sich aus.
Ein Klick auf den freigegebenen Startbutton startet die Mission direkt.

Während Prüfung und Start sind Mehrfachstarts gesperrt. Schreibende Anfragen werden
nicht automatisch wiederholt. Fehlt nach einem Start die Netzwerkbestätigung, bleibt
der Startbutton gesperrt und das Fenster verweist auf die Flottenbewegungen. So lässt
sich prüfen, ob die Mission bereits angenommen wurde, bevor ein weiterer Start erfolgt.

## Sichtbare Flotten

Die gestrichelten Verbindungen sind kontrastreicher. Sichtbare Flotten haben einen
hellen Punkt mit Richtungspfeil und einer dezenten Markierung. Ihr Ort aktualisiert
sich jede Sekunde anhand der ursprünglichen Abflug-/Ankunftszeiten. Die Radarzeichen
bleiben bei unveränderten Daten auch über die regelmäßige Aktualisierung bestehen.
Es gilt weiterhin: ein Kontakt pro Mission, unabhängig von der Schiffszahl.

Mit der Maus über einen Kontakt oder seinen Eintrag in der Kontaktliste fahren:
Ein lesbares Fenster zeigt Mission, Koordinaten, Restzeit und die Zusammensetzung
eigener Flotten. Es bleibt beim Wechsel der Maus in das Fenster offen. Derselbe
Inhalt ist per Tastaturfokus erreichbar; Escape blendet das Fenster aus. Ein Klick
öffnet weiterhin die Kontaktdetails mit einem Weg zu den Flottenbewegungen.

Die Originalsichtbarkeit gilt weiterhin. Zusammensetzungen fremder Flotten werden
von dieser Erweiterung nicht offengelegt. Unbekannte Daten werden entsprechend
beschriftet. Auf kleinen Bildschirmen sind die Kontakte über die Liste erreichbar.

## Bereitstellung und Prüfung

Der Branch setzt `38adefb5e83d82654c58f4e4204352678e18c293` fort und enthält die
gebauten Browserdateien. Der vorhandene Updatehelfer kann den neuen Commit auf der
Testinstallation übernehmen. Keine neuen Abhängigkeiten, Lockfile- oder Schemaänderungen;
kein Node-Build auf dem Zielrechner und keine Neuinstallation erforderlich.

`tests/Frontend/live3d-quick-fleet.browser.mjs` prüft mit isolierten Konten echte
Sondenstarts aus Karte und Galaxie, das Mengenfeld ohne weitere Pflichtfelder,
Mehrfachsubmit-Schutz, fehlende Sonden, den oberen Startbutton des Originalplaners,
Flugfortschritt und Hover-Zusammensetzung, eine verlorene Antwort nach tatsächlich
angenommenem Auftrag sowie die mobile Darstellung. Die bisherigen Systemkarten-,
Planeten-/Nachrichten- und Kompatibilitätstests prüfen die ausführliche Planung weiterhin.
Der Backendtest sichert die Zusammensetzung eigener Flotten und ausgeblendete fremde
Zusammensetzungen ab. Alle Missionen verwenden unverändert die Originalendpunkte.

Ergebnis: Rector, Pint und PHPStan bestanden; 40 gezielte Backendtests mit 5.640
Assertions und 16 JavaScript-/Geometrietests bestanden. Alle vier Browserabläufe
(Schnellversand, Systemkarte, Planeten-/Nachrichtennavigation, Kompatibilität ohne
GPU bzw. 3D-Modul) bestanden. Temporäre Konten, Flotten und Aufklärungsberichte
wurden anschließend entfernt.
