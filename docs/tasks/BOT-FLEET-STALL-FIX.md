# Diagnose und Behebung: autonome Bots bleiben ohne Flotten

## Beobachtung (25.11.2026)
Bot Sirius-ecgni6: Rangliste 392 Punkte (Nutzerangabe), 5.430 Entscheidungen, letzte Aktion Forschungslabor-Ausbau. Screenshot zeigt: Profil Ausgewogen, automatisch bauen/forschen/Schiffe bauen und Raids aktiv, Limit 250, Batch 10, Interval 120s, Max-Level 25. Häkchen "Eigene Strategie verwenden" aus: angezeigte 2:1:1-Prioritäten sind nicht als individuelle Strategie aktiv.

## Codebefund
- In `AutonomousBotService::decide`: Militärziel über `military()`; wenn eine Aktion wegen Ressourcen, Bau-/Forschungs-Voraussetzungen oder Warteschlange nicht gestartet werden kann, fällt die Entscheidung in den generischen Wirtschaftsausbau zurück.
- Es gibt keine verbindliche Ressourcenreservierung für eine erreichbare nächste Werft-/Technologie-/Schiffsaktion. Bei ständigem Wirtschaftsausbau könnte die für Flotten nötige Ressource immer wieder ausgegeben werden. **Hypothese, nicht bewiesene Ursache des konkreten Bots.**
- Tests zu frühem Schiffsaufbau (`AutonomousBotAggressionTest`) starten mit vorbereiteter Werft/Forschung; ein realer Entwicklungsverlauf vom neuen Bot bis zum ersten Schiff über viele Zyklen wird nicht abgesichert.
- Zusätzlich reproduziert: `tickDue()` verarbeitete keine fälligen Forschungsaufträge. Ohne Bot-Login blieb eine bezahlte, zeitlich fertige Forschung offen; dadurch fehlten weiter die Voraussetzungen für den Schiffsbau. Der Regressionstest scheiterte ohne den ergänzten Forschungsabschluss (`processed=0` statt `1`).
- Ebenso untersuchen: Werft- und Antriebsstufe, bestehende Building-/Research-/Unit-Queues, Metall/Kristall/Deuterium, Energie, verfügbare vs. auf Mission befindliche Schiffe, Fehlermeldungen, `auto_shipbuilding`, gespeicherte Strategie.

## Auftrag
1. Zuerst nur lesender, datensparsamer Preflight am EXISTIERENDEN Server. Account eindeutig identifizieren, Fortschritt und Blockierer von Sirius-ecgni6 feststellen. Niemals Secrets/Benutzerkontendaten ausgeben und nicht voreilig über die Ursache urteilen.
2. Für `military()` und `pursue()` strukturierte Entscheidungsdiagnosen ergänzen: `target`, `blocked_by`, `missing_resources`, `missing_requirement`, `queue_busy`, `saving_for`. Pro Bot im Admin sichtbar, ohne geheime Daten.
3. Wenn ein militärischer Fortschritt legal und erreichbar ist, verhindern, dass Ausweich-Wirtschaftsausbau fortwährend die benötigten Ressourcen aufbraucht. Gezielte, gedeckelte Sparphase oder Budgetreservierung für erste Werft/Verbrennungsantrieb/leichte Jäger. Andere Aufgaben können sinnvoll weiterlaufen, aber nur wenn die Militärreserve nicht zerstört wird. Kein Deadlock bei Energiemangel/keiner Produktion/volle Felder/Auto-Schalter aus.
4. Ziel: mindestens erste leichte Jäger (Werft Stufe 1, Verbrennungsantrieb Stufe 1; Kosten 3.000 Metall + 1.000 Kristall pro Schiff), anschließend erste Transporter/Sonden. Originale GameObject-/Queue-/Kosten-Services weiterverwenden, keine Ressourcengeschenke.
5. Robuste Tests von normalen Bot-Startbedingungen mit realen Produktionsfortschritten und abgeschlossenem Queue-Takt über genügend Zyklen; Fälle mit knappen Ressourcen, wartenden Queues, vielen Bots, zwei Planeten, deaktivierten Automatikschaltern, Schiffen auf Mission, Energiemangel und Pause. Mindestens ein Regressionsfall für 400 Punkte/5.000 Entscheidungen ohne Schiffe, der Ursachen sichtbar macht und bei erreichbaren Voraussetzungen die Flotte startet.
6. Die bestehenden 50 Bots behalten Accounts, Planeten, Rohstoffe, Forschung, Schiffe, Käufe, Missionen und laufende Aufträge. Keine Löschungen oder Neuinitialisierung. Kein `main`-Merge, kein produktives Update ohne Backup/Deploymentprüfung.
7. Tests `composer`-PHP, Frontend, Build und fachliche Browsertests in separater Testumgebung ausführen und Ergebnisse dokumentieren. Keine fingierten Erfolgsmeldungen.

## Zielzustand
Sirius-ecgni6 und ähnliche Bots bauen legal Schiffe oder die Oberfläche zeigt exakt warum nicht. Bereits erspielte Inhalte unverändert erhalten.

## Technischer Zwischenstand (25.11.2026)

In diesem Branch **bereits implementiert**, ohne Live-Server-Veränderung:

- `AutonomousBotService::starterFleetBudget()` ermittelt die erste fehlende legale Einheit oder die erste fehlende Werft-/Forschungsvoraussetzung für Starterflotten.
- Priorisierter Flottenaufbau: 20 leichte Jäger, 5 kleine Transporter, 8 Spionagesonden, durch vorhandene Schiffslimits begrenzt.
- `decide()` schützt die Rohstoffkosten für dieses nächste Ziel auf Wirtschafts- und Forschungsschritten; Militärentscheidungen verwenden die nötige Reserve nicht mehr für nachgelagerte Starter-Schiffstypen.
- Reserve wird nicht aktiviert, wenn Grundwirtschaft/Energie noch nicht bereit, die vorhandenen Lager zu klein, Schiffsbau deaktiviert oder das Ziel nicht erreichbar ist.
- `last_action=saving` und `last_object=<Ziel>` sind in der Bot-Verwaltung übersetzt sichtbar.
- `AutonomousBotAggressionTest` enthält Regression für ein schiffsloses Unternehmen, das auf einem Wirtschaftszug zuvor das letzte Metall/Kristall anderweitig ausgegeben hätte, und für deaktivierten Schiffsbau.
- Kein Account, Rohstoff, Planet, Flotte, Forschungsstand oder Produktionsauftrag wurde manuell verändert; keine Migration neu.

## Review von PR #4 (25.11.2026)

Der ursprünglich eingereichte Stand `7f7725f5` hatte drei Fehler in den Nullable-Typangaben (PHPStan) und einen fehlschlagenden Sparphasen-Test: In dessen zweitem Schritt wurde wegen der bestehenden Kolonierotation der andere Planet ausgewählt. Der korrigierte Test wählt wieder den vorbereiteten Planeten und verdient die fehlenden Rohstoffe durch zwei Stunden reguläre Minenproduktion statt durch eine zusätzliche Rohstoffgutschrift.

`tickDue()` schließt nun vor der nächsten Entscheidung fällige Forschung mit `PlayerService::updateResearchQueue()` ab. Der Aufruf liegt innerhalb der vorhandenen Bot-/Benutzersperre und erfolgt nach der Prüfung auf Administrator und Urlaubsmodus. Es werden nur bereits bezahlte Aufträge verarbeitet, keine Forschung erfunden und keine künstlichen Login-Aktivitäten erzeugt. Ein eigener Regressionstest verfolgt den normalen Auftrag für Verbrennungsantrieb Stufe 1 bis zum bezahlten ersten Jägerauftrag ohne Login des NPC.

Die Sparphase bleibt eine begrenzte Reserve für den nächsten Starterflotten-Schritt. Der sichtbare Status zeigt das Sparziel an; vollständige strukturierte Blockierdiagnosen aus dem ursprünglichen Diagnoseauftrag sind weiterhin eine separate Erweiterung.

## SSH-Installer

`scripts/codex/install-bot-fleet-stall-fix.sh` erwartet den vollständigen, geprüften Commit-SHA. Er übernimmt ausschließlich:

- `app/Services/AutonomousBotService.php`
- `resources/lang/de/t_bots.php`
- `resources/lang/en/t_bots.php`

Vor Änderungen prüft er einen sauberen Git-Stand, Patch-Kompatibilität, Git-Identität, die zum Checkout gehörende bestehende PHP-Laufzeit und PHP-Syntax. Vorherige Dateien, Commit und Rücknahmepatch werden in einem privaten Verzeichnis unter `OGameX-backups` gesichert. Der Patch wird lokal committed; eine bereits vorhandene ursprüngliche PR-Version kann aktualisiert werden. Wiederholte Installation verändert nichts.

Docker wird anhand des Compose-Dienstlabels und des tatsächlichen Checkout-Mounts erkannt. PHP-FPM erhält ausschließlich `USR2`; der Entrypoint wird nicht erneut ausgeführt. Ein kompletter Container-Neustart würde im bestehenden Entrypoint unter anderem Composer und Migrationen aufrufen und wurde deshalb entfernt. Der reguläre Scheduler startet ohnehin neue PHP-Aufrufe. Bei nativer PHP-Installation wird kein fremder Dienst neu gestartet; deren Web-OPcache-Verwaltung bleibt beim bestehenden Betreiber.

Fehler nach dem Anwenden und vor dem erfolgreichen Commit stellen den Patch einschließlich Git-Index zurück. Es gibt keine Abhängigkeitsinstallation, Migration, Bot-Neuanlage, Stapel-Neustarts oder manuellen Änderungen an Spielständen. Abweichende lokale Änderungen oder eine unpassende Laufzeit führen zum Abbruch.

## Validierung in isolierter Entwicklungsumgebung

- Rector und Pint: erfolgreich, ohne weitere Codeänderungen.
- PHPStan: erfolgreich, keine Fehler.
- Bot-/Strategie-Regressionen: 21 Tests, 126 Assertions, erfolgreich.
- Vollständige PHP-Suite: 1.242 Tests erfolgreich, 28.266 Assertions; 42 auch im bisherigen Stand vorhandene Notices, keine fehlgeschlagenen Tests (5 parallele Prozesse).
- JavaScript: alle 110 Tests erfolgreich.
- Frontend-Build: erfolgreich; bestehender Hinweis auf große Chunks, keine Asset-Änderungen in diesem Fix.
- Installer: 10 Python-Unittests mit echten temporären Git-Repositories und simulierten PHP-/Docker-Laufzeiten erfolgreich. Geprüft sind Sicherung und Dateirechte, nur drei übernommene Dateien, FPM-Neuladen, Rücknahme bei fehlerhafter Laufzeit oder Commit-Hook, Syntaxfehler, lokale Änderungen, inkompatible Quellen, falscher Container-Mount, Aktualisierung der ursprünglichen PR-Version und wiederholter Aufruf.
- Bestehende Race-Condition-Kommandos für UnitQueue und GameMission: je eine Iteration mit zehn parallelen HTTP-Anfragen erfolgreich; exakt zehn Jäger und exakt ein Rückflug. Die ursprünglichen Fixtures haben zwei unabhängige Probleme: Eine nachträglich angelegte zweite Kolonie hinterlässt einen veralteten Player-Verweis, und wiederholtes Löschen des Testspielers scheitert am aktuellen Planeten-Fremdschlüssel. Im isolierten Lauf deshalb zwei Anfangsplaneten und eindeutige Testkonten; Einstellungen danach wiederhergestellt. Keine Änderung an Spiel- oder Testkommando-Code.
- Browser: neues UI auf separater Testdatenbank. Ein neuer Test-NPC zeigt das übersetzte Sparziel für den leichten Jäger. Nach ausreichenden normalen Minenerträgen startet der normale bezahlte Produktionsauftrag und die Verwaltung zeigt „Schiffsproduktion beauftragt · Leichter Jäger“. Beide Ansichten ohne JavaScript-Fehler geprüft.

Der erste vollständige Testlauf im separaten Checkout schlug mangels eingebundener, bereits kompilierter Rust-Kampfbibliothek fehl. Für den Wiederholungslauf wurde dieselbe bestehende Bibliothek schreibgeschützt eingebunden; kein Kampfsystem-Code geändert.

## Grenze der Prüfung

Kein SSH-Zugang zum VPS ist eingerichtet. Deshalb sind die konkreten Werte und Warteschlangen von Sirius-ecgni6 sowie ein erster neuer Auftrag auf dem Live-Server noch nicht beobachtet. Es wurde nichts auf dem produktiven Server installiert. Der bereitgestellte SSH-Befehl ist für die bestehende Installation vorbereitet; er ersetzt keinen Nachweis über den tatsächlichen Live-Fortschritt. Bestehende Spielstände und Schiffsmodelle bleiben beim Übernehmen dieses gezielten PHP-Patches erhalten.
