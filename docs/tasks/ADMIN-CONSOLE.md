# OGameX-3D – vollständige Administrationsoberfläche (ein selbstständiger Entwicklungsauftrag)

## Auftrag, Priorität und Grenzen
Erstelle **eine umfassende, produktionsreife, deutschsprachige Administrationsoberfläche** auf Branch `codex/ogamex-3d-admin-console`. Basis ist `codex/ogamex-3d-live-backend`. Dies ist eine **Nebenentwicklung** zum Hauptprojekt: **Der neue 3D-Spielclient und dessen echte Backend-Anbindung haben Vorrang** und müssen unverändert nutzbar bleiben.

Bearbeite den Auftrag nach Möglichkeit **eigenständig als ein zusammenhängendes Feature** mit Analyse, Implementierung, Tests, Fehlerkorrekturen und Dokumentation; keine Kette kleiner manueller Abnahmen anfordern. Triff UX-/Implementierungsentscheidungen selbst gemäß den folgenden Vorgaben. Falls ein Teil in OGameX nicht unterstützt ist, benenne die konkret fehlende Serverfunktion und implementiere keine Schein-Schaltfläche. Keine Änderungen an `main` und kein eigenmächtiger Merge oder Rollout auf reale Spieler.

## Bestehende Bausteine, die unbedingt zu prüfen und zu integrieren sind
- Vorhandene Adminrouten und -controller: `routes/web.php` unter `auth, globalgame, locale, admin`, `app/Http/Controllers/Admin/{ServerSettingsController,RulesController,FleetTimingController,ServerAdministrationController,DeveloperShortcutsController}.php`.
- Vorhandene Ansichten: `resources/views/ingame/admin/` und `resources/views/ingame/layouts/admin-menu.blade.php`.
- Auth/Rollen: `OGame/Models/User.php` verwendet `Spatie\\Permission\\Traits\\HasRoles`, existierende Rolle `admin`. Bestehende Rollen, Accounts, Einrichtungsprozess und Rechte nicht zerstören.
- Dienste/Domain: `SettingsService`, `PlanetService`, `PlayerService`, `ObjectService`, `BuildingQueueService`, `ResearchQueueService`, `UnitQueueService`, `FleetMissionService`, `MessageService`, `Ban`, `User`, `Planet`, `FleetMission` usw. Vor Implementierung vorhandene APIs, Mehrfachuniversen-Unterstützung und tatsächliche Datenbanksemantik ermitteln.
- Vorhandene Sicherheitsfunktionen: gemeinsame IPs, Botverdacht, Sperren, überfällige Flotten, Angriffsblockade, bestehende Debug-/Impersonation-Funktionen. Bestehendes Verhalten erhalten, aber klar in sinnvolle Kategorien überführen.
- Live-Spielansicht: `GET /play-3d`, `/play-3d/state`, `/play-3d/command`; **keine** Auswirkungen auf deren Rechte, Berechnungen oder Routen.
- Parallele, noch nicht fertig implementierte Bot-Nebenentwicklung: Branch `codex/ogamex-3d-bot-integration`, Aufgabenbeschreibung `docs/tasks/BOT-INTEGRATION.md`. Der Adminbereich braucht eine **Bot-Verwaltung als eigene Sektion**, darf aber ohne installierten Bot-Backend-Teil nicht kaputtgehen. Entkopple die UI durch klare Services/Feature-Erkennung; wenn die Botfunktion nachträglich integriert wird, anschließen, Konflikte dokumentieren. **Botverdacht** bei Menschen und **offiziell angelegte Bot-Accounts** sind strikt unterschiedliche Konzepte.

## Bedienung und UI
Ein professionelles, responsive **Admin Control Center** mit direktem Einstieg für autorisierte Benutzer und deutlichem **Zurück zum Spiel**. Konsistentes modernes OGameX-3D-Design: dunkle, ruhige Weltraum-Ästhetik, saubere Typografie, sparsame Cyan-/Blautöne; im Adminbereich zählt Lesbarkeit von Tabellen, Filtern und Formularen mehr als dekoratives 3D. Keine WebGL-Pflicht für die Administration. Desktop und Smartphone müssen gut funktionieren: niemals horizontales Überlaufen der gesamten Seite, Tabellen dürfen lokal horizontal scrollen, Touch-Bedienbarkeit, Tastatur/Fokus und ARIA, leere/fehlerhafte/lade Zustände. Bestehende Blade/Vite/Laravel-Technologie nutzen, keine unnötigen schweren UI-Frameworks. Deutsch ist Standard; sofern übersetzte UI-Strings verwendet werden, bestehende Lokalisierung respektieren.

## Vollständige Funktionsbereiche

### 1. Übersichts-Dashboard
- Echte KPIs (mindestens menschliche Accounts, offiziell markierte Bot-Accounts, aktive/gesperrte Nutzer, Planeten/Monde, laufende Flotten und Bau-/Forschungs-/Schiffswarteschlangen), jeweils mit klarer Bezeichnung und Messgrundlage.
- Aktuelle Warnungen/auffällige Vorgänge (hängende Missionen, Queue-Probleme, fehlgeschlagene Hintergrundjobs, relevante Fehler). Falls Daten fehlen, `nicht verfügbar` anzeigen statt Werte zu erfinden.
- Schnellnavigation zu relevanten Verwaltungsaktionen, sinnvolle Filter und Abrufzeitstempel. Keine teuren Volltabellenscans bei jedem Seitenaufruf.

### 2. Spieler- und Accountverwaltung
- Paginierte Suche/Filter über Spielername, ID, Status, Registrierungszeit, Rolle und – nur berechtigt – Konto-E-Mail. Für jeden Account Detailseite: Planeten/Monde, Allianz, Forschung, Sperrstatus, relevante Warteschlangen/Flotten, Aktivität soweit vorhanden, Bot-Kennzeichen.
- Regelkonformes Sperren/Entsperren mit Grund, Zeitraum, Bestätigung, Berechtigungsprüfung, optionaler Benachrichtigung über vorhandene interne Dienste.
- Bestehende Impersonation nur im streng privilegierten Bereich: deutliches Banner, sichtbarer Rückweg, Audit-Zeilen, kein Missbrauch als versteckter Login. Nicht selbst Passwörter anzeigen oder setzen; Account-Wiederherstellung nur über legitime bestehende Abläufe.
- Keine versehentlichen Massenänderungen; bei massenhaften Eingriffen gesonderte Freigabe und Sicherheitsabfragen.

### 3. Galaxie, Planeten und Universum
- Paginierte, filterbare Liste der Planeten und Monde nach Koordinaten, Besitzer, Baufeldern, Größen und Status.
- Übersicht echter Rohstoffe, Produktionsraten, Gebäudestufen, Schiffe, Verteidigung sowie laufender Aufträge je Planet, soweit Services das unterstützen.
- Für administrative Korrekturen nur wenige ausdrücklich als `administrativer Eingriff` markierte und geprüfte Aktionen über vorhandene Domänendienste. Keine unkontrollierten direkten Tabellenupdates, keine widersprüchlichen Rohstoff- oder Queue-Zustände.
- Universums-/Servereinstellungen aus bestehendem `SettingsService` in sinnvollen Kategorien (Wirtschaft, Forschung, Flotten, Galaxie, Expeditionen, Kampf, Registrierung, Boni, Sicherheit) mit serverseitiger Validierung, Erklärung, Vorschau der Änderung/Alt-Neu und Auditlog. Bestehende Spielformeln nicht duplizieren.

### 4. Flotten, Aufträge und Warteschlangen
- Lesende Übersicht laufender und überfälliger Flottenmissionen, Gebäudewarteschlangen, Forschung, Schiffswerft, mit Besitz, Auftragstyp, Start/Ziel/Zeit und Status.
- Bestehende Mechanismen zur sicheren Wiederherstellung überfälliger Missionen integrieren; keine doppelte Auszahlung/Rückerstattung, kein direkter Eingriff ohne bestätigte Adminberechtigung.
- Administrativer Verlauf/Filter sowie gezielte Status- und Problemübersichten. Maßnahmen nur, wo bestehender Servicepfad und Tests sie sicher abdecken.

### 5. Sicherheits- und Moderationszentrale
- Vorhandene Sperren, Mehrfachaccount-/Shared-IP-Erkennung, Aktivitäts-/Botverdacht, Verdachtsmarkierungen, Regeln-/Meldungsverwaltung und Angriffsblockaden integrieren.
- **Legitime Botaccounts** aus der optionalen offiziellen Botintegration dürfen nicht automatisch als missbräuchliche Bots gebannt oder ununterscheidbar als Verdächtige dargestellt werden.
- Nachvollziehbare Fallnotizen/Gründe und Änderungsverlauf, minimal notwendige Anzeige sensibler Daten, klare Zugriffsrechte.

### 6. Bot-Verwaltung (als optionale Untersektion)
- Gesamtschalter (Aus voreingestellt), Anzahl, Profile/Strategien (`friedlich`, `ausgeglichen`, `aggressiv`), Universum-Zuordnung, Tick-Intervall, Pausieren/Fortsetzen, einzelne Bot-Accounts, letzte Aktionen/Fehler und Ressourcenschutzlimits.
- Integration mit späterem/parallel entwickeltem Bot-Dienst **über eine explizite Service-Schnittstelle**. Solange noch kein Bot-Backend gemerged ist, ehrlichen `Bot-Modul nicht installiert`-Zustand statt scheinbar funktionierender Steuerung anbieten; Admin-UI darf nicht crashen.
- Bot-Verwaltung und Bot-Detection administrativ und sprachlich klar trennen. Keine Einstellungen, die menschliche Accounts stillschweigend automatisieren.

### 7. Betriebszustand, Protokollierung und Berichte
- Im Rahmen der Anwendung ermittelbare Status von Datenbankverbindung, Queues, Scheduler (nur wenn tatsächlich messbar), Fehlerereignissen und Performance. Systemgeheimnisse, Prozessumgebung, rohe Stacktraces und Zugangsdaten nicht im Browser offenlegen.
- Änderungs-/Auditprotokoll mit Akteur, Aktion, betroffener Ressource, Zeitpunkt, Grund und Ergebnis, ggf. sichere Vorher-/Nachher-Werte; keine Passwörter, Sessiontokens, CSRF, privaten Message-Bodies oder unnötigen IP-Daten loggen.
- Paginierte Berichte/CSV-Export für relevante Adminlisten mit zugriffsgesteuerter Ausgabe und Schutz vor CSV-Formelinjektion. Datenumfang begrenzen.

### 8. Berechtigungen
- Existierende Adminrolle muss weiter funktionieren. Wenn sinnvoll zusätzliche Rollen/Granularität (z. B. Betreiber/Superadmin, Administrator, Moderator, Support/Read-only) per Spatie Permission; sicherer Migrationspfad, keine unbeabsichtigte Privilegvergabe.
- Jede sensitive Route/API-Aktion serverseitig prüfen (GET ebenso wie POST); keine Berechtigung nur per ausgeblendeter UI. Schreibmethoden CSRF-geschützt und explizit, Eingaben validiert, Ownership/Universumsgrenzen beachtet, Rate-Limits auf gefährliche Actions.
- Die ursprünglichen gefährlichen `DeveloperShortcuts` hinter separater Superadmin-/Development-Berechtigung absichern; niemals unbemerkt im normalen Administrator-Menü anbieten. Bei Produktionsbetrieb keine frei zugänglichen Debug-/Cheataktionen.

## Qualität, Sicherheit und Abnahme
- Alle neuen Seiten tatsächlich nutzbar, nicht bloß Mockups oder unverdrahtete Buttons.
- Vorhandene `admin`-Routen und ihre Tests bleiben kompatibel; falls Linkmigration nötig, Redirects/dokumentierte Übergänge bereitstellen.
- Bessere Organisation bestehender Dienste, kein Neubau der gesamten Spiellogik. Datenbankmigrationen ausschließlich additive/rückwärtskompatible Erweiterungen und nur wenn nötig; keine bestehenden Accounts, Planeten oder Flotten verändern.
- Sicherheitskritische Aktionen mit **expliziter Bestätigung**, klarer Fehlerbehandlung, Transaktions-/Idempotenz-Schutz wo nötig. Niedrige Standardrechte, Testen mit separaten Admin-/Moderator-/Normalspieler-Accounts. Keine Admin-API ohne Auth.
- Tests (Feature/Unit/Frontend/Browser) für Rechte, CSRF, Filter/Paginierung, ungültige Daten, Audit, Settingsänderungen, Sperren, Botmodul an/aus, parallele Requests, responsive Oberfläche, ausfallsichere Statusanzeige. Relevante vorhandene Tests erneut laufen lassen.
- Hohe Leistung bei großen Datenbeständen: gezielte SQL-Abfragen, Indizes wo erforderlich, Caching invalidieren, keine N+1-Abfragen, alle Listen paginieren. Kein dauerhaftes Polling unnötiger Berichte.
- Visuelle Prüfung der Desktop-/Mobilansichten und klare deutsche Bedienungsanleitung mit Screenshots soweit mit vorhandenen Browserwerkzeugen möglich.
- Verifiziere, dass `/play-3d`, bestehende OGameX-Navigation, produktive Controller/Spielregeln, Offline-Demo 0.13 und separater Bot-Branch nicht beeinträchtigt werden. Bei fachlich notwendigen Konflikten eine saubere spätere Integrationsanleitung mitliefern.

## Arbeitsergebnis
1. Vollständig implementierter Adminbereich auf `codex/ogamex-3d-admin-console` samt Tests, Dokumentation, Migrationshinweisen.
2. Eine prägnante Liste: fertig und überprüft / mit vorhandenen Diensten eingeschränkt / noch nicht eingebundenes Botmodul. Keine unbestätigten Fertigmeldungen.
3. **Ein** Draft-PR mit Ziel `codex/ogamex-3d-live-backend`, wenn die GitHub-API zugänglich ist. Sonst Branch + Commit melden, damit der PR über GitHub-Connector erstellt werden kann. **Nicht** automatisch mergen.
4. **Keine Zwischenabnahmen vom Benutzer** verlangen, sofern nicht aus sicherheitstechnischen Gründen eine echte Freigabe für produktive Datenänderungen notwendig wird.
