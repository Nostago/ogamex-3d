# OGameX-3D – vollständige native Bot-Integration (ein einziger Entwicklungsauftrag)

## Priorität und Auftrag
**Primärziel bleibt der OGameX-Relaunch mit neuer 3D-Oberfläche.** Der Bot ist ein eigenständiges, optionales Servermodul, das die weitere UI-Entwicklung weder blockiert noch Architektur oder Bedienung unnötig verkompliziert.

Setze die folgende Bot-Integration **in einem eigenständig zu bearbeitenden Codex-Auftrag bis zu einem funktionsfähigen, getesteten Ergebnis vollständig um**. Organisiere notwendige interne Schritte und Tests selbst, ohne mehrere vom Benutzer abzunehmende Zwischenversionen oder erneute Produktfragen zu erzeugen. Wenn einzelne Funktionen von vorhandenen OGameX-Spielregeln nicht unterstützt werden, verwende vorhandene Services, dokumentiere die konkrete Grenze und baue keine Cheats/Workarounds in die produktive Logik ein. Standardmäßig sind alle Bots deaktiviert.

Startpunkt: Branch `codex/ogamex-3d-bot-integration` (basiert auf `codex/ogamex-3d-live-backend`). Keine eigenständigen Änderungen an `main`. Bewahre bestehende Live-3D-Funktionen und alle Offline-Demos.

## Referenz und Portierungsstrategie
Referenz: https://github.com/r4fek/ogame-bot (BSD-2-Clause; archiviert, letzter Push 2017). Das Original bietet automatische Gebäudeentwicklung, Rohstofftransporte, SMS-Angriffswarnung, automatische Angreifernachrichten, Flottensicherung, Farming und Expeditionen.
- **Nicht** dessen Python-2-Anwendung, mechanize, BeautifulSoup, veraltete HTML-Selektoren oder fest verdrahtete offizielle Gameforge-URLs als Laufzeitabhängigkeit übernehmen.
- Funktionalitäten und Ideen nativ in PHP/Laravel entwickeln, gekoppelt an vorhandene OGameX-Services. Falls tatsächlicher alter Code übernommen wird, Lizenz- und Copyright-Hinweise gem. BSD-2-Clause korrekt beibehalten.
- Keine Login-Scraper, gespeicherten Benutzerpasswörter, externe SMS-APIs oder automatisierten Aktionen gegen offizielle Gameforge-Server.
- Bestehende `NPCPlayerService`/`NPCPlanetService`/`NPCFleetGeneratorService` dienen Expeditionen/Kampf und sind **nicht** bereits persistente Bot-Spielerkonten.

## Produktentscheidungen (ohne Rückfragen umsetzen)
1. **Autonome serverseitige Bot-Spieler** sind der Standardfall. Ein Bot-Account wird ausdrücklich als Bot gekennzeichnet, einem gültigen Universum zugeordnet und verwendet normale Planeten, Ressourcen, Forschung, Schiffsmengen, Flotten und Zeitaufträge. Bot-Accounts sind niemals als reale Menschen zu tarnen.
2. Pro Bot ein konfigurierbares Verhalten: `friedlich`, `ausgeglichen`, `aggressiv`; ressourcenschonende zufällige Variation mit seedbaren Tests, konfigurierbare Aktivitätsintervalle, Auftrags- und Zielprioritäten, Spielstärkeklassen. Neue Spieler vor aggressiven Bots schützen, kein Spam.
3. Spieler bekommen **keinen ungefragten Assistenten auf ihrem echten Account**. Eine potenzielle Spieler-Automatisierung erfordert separates ausdrückliches Opt-in und ist keine Voraussetzung für den fertigen Bot-Modul-Release.
4. Auf normalen Servern ist die Funktion standardmäßig **aus**. Admins können sie für die eigene Installation/Universen bewusst aktivieren, pausieren, stoppen, Anzahl und Profile festlegen. Im Adminbereich Status, Bot-ID, Einstellungen, Logs, letzte Aktionen und Fehler anzeigen. Keine geheimen Hintertüren.

## Funktionsumfang – vollständig implementieren
- **Kolonieaufbau und Wirtschaft**: mit normalen Spielregeln Rohstoffe, Baukosten, freie Baufelder, Energiehaushalt, Anlagen, vorhandene Baustellen, Reihenfolge und Optimierung prüfen. Gebäude über bestehenden Bauservice ausbauen, ohne Rohstoffe zu erzeugen oder Status direkt zu überschreiben.
- **Forschung und Schiffswerft**: rechtmäßige Forschung, Schiffsbau und Verteidigung nur bei verfügbaren Ressourcen, Technologien und freier Queue; Schutz vor Doppelaufträgen. Bevorzugte Ausbautypen je Profil.
- **Mehrere Planeten**: verfügbare Rohstoffe und Bedarf über alle *eigenen* Kolonien analysieren; Transfers nur mit vorhandenen Schiffen, Laderaum, Flugzeit, Treibstoff und Flottenslots. Nicht überbelegen und nicht mehrfach versenden.
- **Expeditionen**: bei erfüllten Voraussetzungen verfügbare Flotten zum Expeditionsziel schicken, Slots/Verfügbarkeit und Rückkehr beachten. Keine frei erfundenen Belohnungen.
- **Angriffserkennung**: eingehende feindliche Missionen aus bestehenden Events/Services ermitteln. Konfigurierbare Gefahrenschwellen, nachvollziehbare Warnungen in der eigenen Bot-Verwaltung; optional vorhandene *interne* Nachrichtendienstwege nutzen, **keine** SMS-/Drittanbieter-Kosten.
- **Flottensicherung**: bei Gefahr geeignete eigene Flotten und ggf. erlaubte Ressourcen über die vorhandene Dispatching-Logik in Sicherheit bringen, mit Sicherheitsprüfung auf genug Treibstoff/Slots, Ziel und Rückkehr. Keine Doppelrettung und keine Flottenverluste durch ungültige Ziele. Bei nicht sicher automatisierbarer Situation lediglich Warnen.
- **Farming und gezielte Angriffe**: nur für Profile, bei denen Admins aggressives Verhalten ausdrücklich einschalten. Rate-Limits, Cooldowns, Newbie-Schutz und Schutz-/Urlaubsmodi einhalten. Zunächst nur regelkonforme Ziele, die das bestehende System anbietet; keine Abschüsse per direktem DB-Update, kein Chat-Spam oder beleidigende Nachrichten. Nicht endlos denselben Spieler farmen.
- **Diplomatie/Meldungen**: falls ursprüngliches System Nachrichten unterstützt, konfigurierbare neutrale Reaktionen und interne Ereignisberichte; kein automatischer Massenversand, keine fremden Daten preisgeben.
- **Schiffskämpfe**: ausschließlich Original-OGameX-Flotten-/Kampfberechnung; keine neu erfundenen Bot-Kampfregeln, keine simulierten Siege ohne echte Mission.
- **3D-Integration**: Bots verändern echte Planetendaten und echte Flotten; die vorhandene Live-3D-Oberfläche visualisiert daraus sichtbare Anlagen/Orbitaktivität, ohne für den Bot eine zweite Render-Pipeline zu bauen. Detailansichten zeigen, soweit gemäß bestehenden Sichtrechten erlaubt, die Kennzeichnung `Bot`. Admin-Steuerung muss nicht die 3D-Spielansicht dominieren.

## Zuverlässigkeit und Sicherheit
- Laravel Scheduler/Queues, gekapselte Services und bestehende Auth/Policies, universumsbezogene Rechte und Spielservices nutzen. Keine dauerlaufende Python-Schleife.
- Pro Bot/Universum Transaktions-/Lock-Konzept, `withoutOverlapping` wo passend, Idempotenz vor jedem wirtschaftlichen oder Flotten-Befehl, wenige Aktionen pro Tick, Jitter, Rate-Limit, Backoff bei Fehlern, eindeutige Kill-Switches, Admin-Pause. Niedriger Standard-Ressourcenverbrauch, skalierbar auf viele Bots ohne Ticks im Web-Request.
- Vorhandene Server-Workflows für Bau/Forschung/Einheiten/Flotten verwenden, keinen direkten Rohstoff-/Baukosten-/Level-Betrug. Dokumentiere, welche Dienste jeweils autoritativ entscheiden.
- Rechte strikt prüfen: Bot steuert nur eigene Planeten/Flotten, fremde Menschen nie. Keine Secrets in Repository oder Logs.
- Jede Bot-Aktion nachvollziehbar protokollieren (Bot, Zeitpunkt, Objekt, beabsichtigte vs. ausgeführte Aktion, Grund, Ergebnis). Logs begrenzen und Datenminimierung.
- Migrationen, Konfigurationen und Admin-Oberfläche rückwärtskompatibel und sicher. Bei deaktiviertem Bot verändert das Modul keine Spielstände und erzeugt keine Nebenwirkungen.
- Wenn eine Funktion in aktuellen OGameX-Services nicht sicher/funktional geht, nicht vorgeben sie sei fertig: verifiziere, kapsle und dokumentiere klar den Blocker, ohne den UI-Meilenstein zu gefährden.

## Tests und Abnahme
Führe relevante automatisierte PHP-/Frontend-/Integrations-Tests durch; ergänze gezielte Tests gegen isolierte Accounts und Universen:
- Bot-Erzeugung, Kennzeichnung, Adminrechte, Deaktivierung/Pause und Neustart;
- deterministische Entscheidungen, Ressourcenknappheit, kostenpflichtige Warteschlangen, Zeitfortschritt, Bauflächen, Forschungsvoraussetzungen;
- gleichzeitige Scheduler-Ticks/Idempotenz und Grenzen der Serverlast;
- erlaubte eigene Transporte, verfügbare Schiffe, Expedition/Return, Warnungen/Fleetsave, Angriffs-Zielschutz;
- gegen menschliche Accounts gerichtete Aktionen nur im expliziten aggressiven Profil und regelkonform;
- keine Nebenwirkungen auf echte Accounts, keine Gefährdung des Bestandscodes;
- nachgewiesen funktionsfähige Live-3D-Oberfläche und bisherige 0.13-ZIP nach dem Feature.

Erstelle eine deutsche Admin-/Betriebsanleitung mit Konfigurationsbeispielen, botbezogenen Sicherheitsregeln, einem einfachen End-to-End-Test gegen isolierte Demodaten und einem klaren Funktionsstatus **umgesetzt/getestet/nicht unterstützt**. Ein einziges Gesamtergebnis, kein separates 0.1/0.2/0.3-Bot-Projekt.

## Lieferung und Branch-Management
- Implementiere selbstständig, teste, behebe Fehler, dokumentiere.
- Ausschließlich auf dem Feature-Branch committen. Danach wenn möglich **einen** Pull Request als Entwurf gegenüber `codex/ogamex-3d-live-backend` (noch nicht `main`) erstellen. Bei gesperrter API exakten Commit nennen, GitHub-PR kann aus ChatGPT erstellt werden.
- Keine eigenmächtige Aktivierung auf einer echten Installation, kein Merge ohne Freigabe.
- **3D-UI bleibt Hauptpriorität**: keine große Renovierung der Originaloberfläche, keine neuen komplexen Frontendframeworks für den Bot, keine Änderungen am bestehenden OGameX-Wirtschaftsmodell.
