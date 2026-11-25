# Diagnose und Behebung: autonome Bots bleiben ohne Flotten

## Beobachtung (25.11.2026)
Bot Sirius-ecgni6: Rangliste 392 Punkte (Nutzerangabe), 5.430 Entscheidungen, letzte Aktion Forschungslabor-Ausbau. Screenshot zeigt: Profil Ausgewogen, automatisch bauen/forschen/Schiffe bauen und Raids aktiv, Limit 250, Batch 10, Interval 120s, Max-Level 25. Häkchen "Eigene Strategie verwenden" aus: angezeigte 2:1:1-Prioritäten sind nicht als individuelle Strategie aktiv.

## Codebefund
- In `AutonomousBotService::decide`: Militärziel über `military()`; wenn eine Aktion wegen Ressourcen, Bau-/Forschungs-Voraussetzungen oder Warteschlange nicht gestartet werden kann, fällt die Entscheidung in den generischen Wirtschaftsausbau zurück.
- Es gibt keine verbindliche Ressourcenreservierung für eine erreichbare nächste Werft-/Technologie-/Schiffsaktion. Bei ständigem Wirtschaftsausbau könnte die für Flotten nötige Ressource immer wieder ausgegeben werden. **Hypothese, nicht bewiesene Ursache des konkreten Bots.**
- Tests zu frühem Schiffsaufbau (`AutonomousBotAggressionTest`) starten mit vorbereiteter Werft/Forschung; ein realer Entwicklungsverlauf vom neuen Bot bis zum ersten Schiff über viele Zyklen wird nicht abgesichert.
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
