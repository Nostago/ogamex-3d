# OGameX-3D: Bot-Integration (Architektur und erste Implementierung)

## Ausgangspunkt
- Neues Projekt: `Nostago/ogamex-3d`; Basisbranch `codex/ogamex-3d-live-backend` (authentifizierte Laravel/3D-Ansicht).
- Referenz: https://github.com/r4fek/ogame-bot — öffentliches archiviertes Python-2-Projekt, letzter Push 2017, BSD-2-Clause-Lizenz.
- Referenzfunktionen laut Quellcode: automatischer Gebäudeausbau, Transportplanung, Erkennung eingehender Angriffe, Flottensicherung, Expeditionen, Farming, Benachrichtigungen/Angreifernachrichten.
- **Nicht den historischen Bot unverändert installieren oder dessen HTML-Scraping übernehmen**: hart codierte URLs des alten offiziellen OGame, mechanize/BeautifulSoup, lokale Passwörter in `config.ini`, Python 2; nicht mit dieser Laravel-Anwendung kompatibel. Ideen/Algorithmen gegebenenfalls neu entwickeln; bei Übernahme konkreten Codes BSD-2-Clause-Lizenz und Notices erhalten.
- OGameX hat `NPCPlayerService`, `NPCPlanetService` und `NPCFleetGeneratorService`; diese dienen derzeit Expedition-/Kampfsimulationen und stellen **keine autonomen persistenten Siedler-Accounts** dar.

## Produktziel
Schaffe die Grundlage für **serverseitige, transparente Bot-Spieler**, die bei geringer realer Spielerzahl das Universum beleben, eigene Kolonien entwickeln und später nachvollziehbare Missionen ausführen. Der Bot ist ein echter autonomer Akteur *innerhalb unserer OGameX-Installation*, kein externer Client, der Spielerpasswörter kennt. Später kann ein optionaler persönlicher Assistent für menschliche Spieler separat diskutiert werden; er ist **nicht** Teil von Phase 1.

## Phase 1 (klar begrenzter Entwicklungsauftrag)
1. Zuerst verifizieren, wie Accounts, Universen, Planeten, Scheduler, Bau-/Forschungswarteschlangen und vorhandene OGameX-Services aufgebaut sind. Dokumentiere die konkret nutzbaren Methoden. Keine direkten Datenbank-Updates, die Spielregeln/Queue-Services umgehen.
2. Bot-Accounts **explizit als Bots kennzeichnen** und sauber von realen Accounts trennen; Migration nur wenn erforderlich, rückwärtskompatibel und mit Testabdeckung. Verwende vorhandene Account-/Planetenerzeugung statt eigener Cheats. Keine Verwechslung mit flüchtigen NPC-Objekten für Expeditionskämpfe. Keine globalen Bots ohne Universumszuordnung.
3. Minimales konfigurierbares **Bot-Verwaltungs- und Tick-System**: Admin kann Bot-Spieler in isolierter Entwicklungsumgebung erzeugen, aktivieren, pausieren und prüfen. Standardmäßig **deaktiviert**, bestehende Spieler erhalten keine Bot-Funktion ungefragt. Scheduler/Queue mit `withoutOverlapping`, per Bot/Universum Lock, Rate-Limit, Idempotenz und begrenzter Laufzeit. Kein Endlosloop.
4. Erste Strategie nur **friedliche Kolonieentwicklung**: vorhandene Rohstoffe, Energie, Produktionsbedarf, freie Baufelder und Queue prüfen, dann einen regelkonformen Gebäudeausbau über vorhandene OGameX-Dienste anstoßen. Nicht garantiert jede Runde handeln; begrenzte Aktionen pro Tick, keine imaginären Rohstoffe. Keine echten Angriffe, Spionage, Farming oder automatischen Nachrichten in Phase 1.
5. Reproduzierbare Konfigurationsparameter: Strategie/Ausbauschwerpunkt, Tickintervall, maximale Aktionen, Pause, zufällige aber seedbare Variation; ohne Geheimnisse im Git-Repository. Optional reine Planungs-/Dry-run-Ansicht für Tests.
6. Sichtbarkeit: Es muss nachvollziehbar sein, welche Accounts Bots sind (Kennzeichnung in Admin und ggf. Profil/Statistik). Administratives Aktionsprotokoll für geplante/ausgeführte/abgelehnte Aktionen. Kein irreführender Eindruck, es seien echte Menschen. Keine Pay-to-win-/Dark-Matter-Käufe, keine externen SMS-/Messaging-Dienste.
7. Bestehende Spiel- und 3D-Oberfläche nicht beschädigen. Botantrieb läuft serverseitig; die Live-3D-Ansicht stellt den tatsächlichen Bot-Planeten und eventuelle Flotten wie andere Spielstände dar, wenn der Benutzer dafür Sichtrechte besitzt. Kein clientseitiger Bot, keine neue OGameX-Wirtschaftsformel.
8. Tests: Erzeugung/Pause, Auth/Admin-Rechte, Universumsisolierung, kein Botzugriff auf fremde Accounts, Baukosten und Queue, Baufeldgrenzen, konkurrierende Ticks, Idempotenz, angespannte Ressourcen, Backoff und Abschaltung. Tests dürfen keine existierenden Produktionsaccounts verändern.
9. Dokumentation: Start/Stopp, Konfiguration, Testworkflow, Grenzen, offene Fragen. Alle Änderungen nur auf diesem Feature-Branch; nicht in `main` mergen.

## Spätere, **gesondert freizugebende** Phasen
- Phase 2: Forschung, Rohstofftransport zwischen **eigenen** Bot-Planeten, Schiffsbau und Expeditionen – jeweils über die vorhandenen Serverdienste und inklusive Ressourcen-/Queue-Prüfung.
- Phase 3: Angriffserkennung, Flottensicherung, nachvollziehbares Bot-Verhalten in Galaxie und Orbit, PvP und Farming. **Nur nach Spielbalance-Entscheidung**: Schutz für Neueinsteiger, keine übermäßige Farmfrequenz, nachvollziehbare Kennzeichnung und Abschaltmöglichkeiten.
- Option: Ein **persönlicher Spieler-Assistent** als getrenntes Opt-in-Feature; keine stillschweigende Automatisierung fremder oder menschlicher Accounts.

## Technik/Code-Review
- Verwende bestehende Laravel-Technik (Scheduler, Queues, Policies, Auth, OGameX-Dienste). Kein Python-2-Runtime, keine mechanize-Abhängigkeit.
- Das Originalprojekt wurde 2017 zuletzt aktualisiert und ist archiviert. Eine direkte Übernahme des historischen Quellcodes ist weder erforderlich noch ratsam.
- Alle Handlungen sollen über dieselben serverseitigen Regeln abgewickelt werden wie bei menschlichen Accounts.
- Keine öffentliche Bereitstellung, kein produktiver Start, kein Merge ohne explizite Freigabe. Erst einen Prototyp mit Testdaten bereitstellen.

## Abgabe
- Lauffähige **Phase-1-Implementierung**, Tests und kurze deutsche Dokumentation.
- Eigener Commit und gegebenenfalls Pull Request **als Entwurf**, kein automatischer Merge.
- Explizit melden, welche Bot-Aktionen tatsächlich ausgeführt und getestet wurden.
