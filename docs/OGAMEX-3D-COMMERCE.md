# Händler, Shop und Offiziere

Branch: `codex/ogamex-3d-shop-officers`, aufbauend auf der vorhandenen Live-Oberfläche.
Die bestehende Installation und ihre Laravel-Spielregeln bleiben die Grundlage.

## Bedienung

- **Händler:** Rohstoffmarkt oder Schrotthändler öffnen. Die alten, funktionslosen
  Platzhalter für Auktion und Import/Export werden nicht als benutzbare Aktionen angeboten.
- **Rohstoffmarkt:** Verkaufsrohstoff auswählen, den Händler gegen Dunkle Materie
  rufen und anschließend das Rohstoffbudget und die gewünschten Empfangsmengen
  eingeben. Kurse, Abbuchung, Lagergrenzen und Tausch stammen unverändert vom
  vorhandenen `MerchantService` und `MerchantController`.
- **Shop:** Drei übersichtliche Gruppen für Gebäude, Forschung und Werftproduktion.
  Menge und Gesamtpreis werden vor dem Kauf angezeigt. Bezahlt wird ausschließlich
  mit dem tatsächlichen Bestand Dunkler Materie. Gekaufte Gegenstände werden im
  Inventar gespeichert, nicht sofort verbraucht.
- **Inventar:** Über das eigene Symbol neben dem Shop oder den Inventarreiter
  erreichbar. Die Aktivierung verwendet den oben ausgewählten eigenen Himmelskörper.
  NEWTRON wirkt auf die globale laufende Forschung des eigenen Accounts.
  Ohne passenden laufenden Auftrag bleibt der Gegenstand erhalten.
- **Offiziere:** Originalporträts, konkrete Wirkung, zwei Vertragslaufzeiten,
  Preis und Ablaufdatum in UTC. Eine Verlängerung beginnt am vorhandenen
  Ablaufdatum, solange der Vertrag noch aktiv ist; andernfalls am aktuellen Datum.
- **Verwaltung → Shop- und Offizierspreise:** Administratoren können jeden der
  neun Artikelpreise und jeden der zehn Offiziersvertragspreise bearbeiten.
  Preise sind ganze Beträge in Dunkler Materie; `0` ist erlaubt. Ein bereits
  geöffnetes Kaufangebot wird bei einer Preisänderung abgewiesen und muss neu
  geladen werden. Bestehende Gegenstände und Verträge werden nicht verändert.
- **Verwaltung → Testwerkzeuge → Alle eigenen Aufträge sofort fertigstellen:**
  Schließt Bau-, Forschungs-, Schiffs- und Verteidigungsaufträge auf allen eigenen
  Planeten und Monden ab. Auch Folgeaufträge werden durch die originalen Prozessoren
  gestartet und abgeschlossen. Ihre Rohstoffkosten und Voraussetzungen bleiben
  bestehen; nicht finanzierbare Folgeaufträge behandelt das Original wie bisher.
  Andere Accounts und Flottenmissionen werden nicht verändert. Im Urlaubsmodus
  wird die Aktion abgewiesen.

## Ausgangspreise

Die vorhandenen neun Shopartikel behalten ihre ursprünglichen Preise:

| Artikel | Bronze | Silber | Gold |
| --- | ---: | ---: | ---: |
| KRAKEN – Gebäude | 30 Minuten / 700 DM | 2 Stunden / 2.500 DM | 6 Stunden / 7.000 DM |
| DETROID – Werft/Verteidigung | 30 Minuten / 700 DM | 2 Stunden / 2.500 DM | 6 Stunden / 7.000 DM |
| NEWTRON – Forschung | 30 Minuten / 700 DM | 2 Stunden / 2.500 DM | 6 Stunden / 7.000 DM |

Die Offiziere verwenden als editierbare Ausgangswerte die klassischen Vertragskosten:

| Offizier | 7 Tage | 90 Tage |
| --- | ---: | ---: |
| Commander | 10.000 DM | 100.000 DM |
| Admiral | 10.000 DM | 100.000 DM |
| Ingenieur | 2.500 DM | 25.000 DM |
| Geologe | 12.500 DM | 125.000 DM |
| Technokrat | 10.000 DM | 100.000 DM |

## Wirkung und Speicherung

Die vorhandenen Offiziersabfragen im `PlayerService` lesen nun gespeicherte,
zeitlich begrenzte Verträge. Die Wirkungen entsprechen den bereits im Original
hinterlegten Offizierstexten (`t_ingame.premium`):

- Admiral: zwei zusätzliche Flottenslots, ein Expeditionsslot und die bereits
  implementierten Admiralsfunktionen, etwa der verbesserte taktische Rückzug.
- Ingenieur: vorhandener Energiebonus von zehn Prozent; halbierte dauerhafte
  Verteidigungsverluste. Die zusätzliche Wiederherstellung wird in der gemeinsamen
  Nachbearbeitung beider Kampfberechnungen angewendet, nicht nur in einer Engine.
- Geologe: vorhandener Minenbonus von zehn Prozent.
- Technokrat: zwei effektive Spionagestufen und 25 Prozent kürzere neue Forschung.
  Gespeicherte Forschungsstufen und bereits laufende Forschungszeiten bleiben erhalten.
- Alle fünf aktiven Offiziere: vorhandene Kommandostabsproduktion von zwei Prozent,
  ein zusätzlicher Flottenslot und eine effektive Spionagestufe.

Der Commander aktiviert seinen Status und zählt zum Kommandostab. Die originale
Bauwarteschlange ist in diesem OGameX-Stand bereits für alle Spieler verfügbar und
wird nicht nachträglich gesperrt. Zusätzliche Commander-Favoriten oder ein neuer
Kampfsimulator werden durch diese Etappe nicht eingeführt; die Oberfläche verspricht
solche noch nicht vorhandenen Funktionen nicht.

Vor einer Änderung von Produktionsboni werden die bisherigen Rohstoffe aller
betroffenen eigenen Welten berechnet. Bei Offlinephasen wird die Produktion exakt
an den Vertragsablaufzeiten geteilt: Ein Geologenbonus bleibt nach seinem Ablauf
nicht für die gesamte Offlinezeit aktiv.

KRAKEN und NEWTRON verkürzen den passenden aktiven Auftrag. DETROID verschiebt
auch die nachfolgenden Werftaufträge um die eingesparte Zeit. Dabei bleiben
Einzelbauzeiten und bereits produzierte Stückzahlen korrekt. Gegenstände gewähren
keine zusätzlichen Baukosten oder Rohstoffe. Die bisherigen Queue-Prozessoren
vergeben Stufen und Einheiten.

Käufe und Aktivierungen laufen in Datenbanktransaktionen mit gesperrtem Benutzer-
und Inventarbestand. Jeder Formularaufruf besitzt eine eindeutige Anfragekennung.
Eine wiederholte identische Anfrage wird nicht erneut abgebucht oder aktiviert;
eine andere Aktion darf dieselbe Kennung nicht wiederverwenden. Abbuchungen stehen
zusätzlich im vorhandenen Protokoll für Dunkle Materie.

## Darstellung und Navigation

Das zusätzliche Planetenbild oberhalb der Navigation entfällt. Die Hauptnavigation
ist breiter, ihre Felder haben fünf Pixel Innenabstand und einzeilige Beschriftungen.
Die Zusatzsymbole öffnen eigenständige Originalaktionen:

| Neben dem Bereich | Aktion |
| --- | --- |
| Planet / Mond | Belohnungen |
| Gebäude | Produktionseinstellungen; auf geeignetem Mond zusätzlich Sprungtor |
| Forschung | Vollständige Technologieübersicht |
| Flotten | Flottenbewegungen |
| Shop | Inventar |
| Händler | Rohstoffmarkt |

Die allgemeinen Fragezeichenbeschreibungen sind entfernt. Objektinformationen
öffnen die eigentliche Technologieansicht. Navigation und Objektlisten haben
keine inneren vertikalen Scrollbereiche. Eingebettete Seiten passen ihre Höhe
an den tatsächlichen Inhalt an; das Dokument wird nach unten länger. Auf schmalen
Geräten läuft die Navigation in mehreren vollständig lesbaren Reihen.
„Aktuelle Aufträge“ zeigt jeden laufenden und nachfolgenden Auftrag einzeln.
Rückmeldungen der deutschen Oberfläche nennen die Verwaltung statt des Servers.

## Installation auf der vorhandenen Testinstallation

Es gibt keine neuen Abhängigkeiten oder Lockfile-Änderungen. Diese Version benötigt
jedoch erstmals drei zusätzliche Tabellen: `player_items`, `officer_contracts`
und `premium_orders`. Die neue Migration verändert keine bestehende Tabelle.

Der aktualisierte Helfer `scripts/codex/update-test-interface.sh` führt nach der
Übernahme des angegebenen Commits ausschließlich diese Migration aus:

```sh
php artisan migrate --force \
  --path=database/migrations/2026_11_14_100000_create_premium_commerce_tables.php
```

Andere noch ausstehende Migrationen werden nicht ausgeführt. Der Helfer installiert
keine Pakete und startet keine Dienste neu. Die bereits gebauten Browserdateien
liegen im Branch. Anschließend `/play-3d` mit vollständigem Neuladen öffnen.
Die drei Tabellen samt Inhalten bleiben bei einer Rückkehr zu älterem UI-Code
bestehen; ein Zurückrollen führt keine automatische Löschung von Käufen aus.

## Prüfungen

`CommerceTest` prüft echte Käufe und Wiederholungsschutz, Preisänderungen und Rechte,
fehlende Deckung, ungültige CSRF-Kennung, Inventaraktivierung, Fremdplaneten,
Offiziersverlängerung und Ablauf, effektive Boni, Offlineproduktion, anteilig
produzierte Schiffe und NEWTRON auf einem anderen eigenen Planeten sowie die
Admin-Fertigstellung über originale Bau-/Forschungs-/Einheitenprozessoren.

`tests/Frontend/live3d-commerce.browser.mjs` prüft die sichtbaren Abläufe mit zwei
isolierten Testkonten. Es benötigt `LIVE_ACCOUNT_FILE` und `ADMIN_ACCOUNT_FILE`
mit privaten JSON-Zugangsdaten sowie die üblichen Variablen `PLAYWRIGHT_MODULE`,
`LIVE_BASE_URL` und `ARTIFACT_DIR`. Die Konten benötigen Rohstoffe, freie Lagerplätze,
Dunkle Materie und die Voraussetzungen für Schiffbau und Forschung. Preisänderungen
im Browsertest werden anschließend wiederhergestellt.

`tests/Frontend/live3d-commerce-race.mjs` prüft vier gleichzeitige Kaufanfragen.
Das ausschließlich dafür verwendete Testkonto muss vor jedem Durchlauf genau
700 Dunkle Materie haben; der Bronze-Kraken muss 700 kosten. Mit
`COMMERCE_RACE_MODE=same` verwenden alle Anfragen dieselbe Kennung; andernfalls
sind es unterschiedliche Käufe. Die Tests dürfen nicht mit normalen Spielerkonten
laufen. Alle Cloud-Testkonten werden nach Abschluss entfernt.

Ergebnis der Prüfungen dieser Etappe: **190 PHP-Tests mit 6.887 Assertions**,
**76 Frontend-Logiktests**, erfolgreiche statische Analyse und Produktionsbuild.
Die echte HTTP-Parallelprüfung bestätigt je eine Abbuchung bei identischen
Wiederholungen sowie die Ablehnung zusätzlicher Käufe bei unzureichender Deckung;
der Inventarbestand wird dabei mitgeprüft. Kauf- und Aktivierungsrückmeldungen
werden unabhängig von gleichzeitig laufenden Statusabfragen angezeigt.

Der abschließende gezielte Lauf besteht mit **46 Commerce-, Interface- und
Original-Händlertests (5.136 Assertions)**. Die beiden Browserprüfungen für fehlende
GPU-Unterstützung und eine nicht verfügbare Szenendatei bestehen ebenfalls.
