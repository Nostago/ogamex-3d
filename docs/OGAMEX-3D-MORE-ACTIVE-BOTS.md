# Aktivere Flotten der autonomen Bots

Die Anpassung gilt automatisch für vorhandene und neue Bots mit aktiviertem
`auto_raid` und dem Profil `balanced` oder `explorer`. Es ist kein Zurücksetzen
und keine neue Migration nötig. Namen, Konten, Bestände, Einstellungen und die
vorhandene Population bleiben erhalten.

## Aufbau und Entscheidungen

- Prüfung von Spionage und Raids nach jeder zweiten statt vierten Entscheidung.
  Beim üblichen Abstand von 120 Sekunden ergibt das etwa vier statt acht Minuten;
  laufende Flüge, freie Slots und Treibstoff bestimmen weiterhin, ob ein Start
  möglich ist.
- Der frühe Flottenaufbau verfolgt zunächst 20 leichte Jäger, fünf kleine
  Transporter und acht Spionagesonden pro Planet, jeweils innerhalb des
  konfigurierten Schiffslimits. Ein einzelner Auftrag bleibt auf die eingestellte
  Produktionsmenge begrenzt. Voraussetzungen werden regulär entwickelt.
- Danach folgen bevorzugt Kreuzer oder schwere Jäger, sobald sie freigeschaltet
  sind, ansonsten weitere leichte Jäger.
- Zwei von vier Strategieentscheidungen bevorzugen die Flotte, eine den
  Wirtschaftsausbau und eine Forschung mit stärkerem militärischem Schwerpunkt.
  Die Aufgaben rotieren über Kolonien; auch bei zwei oder vier Planeten bleibt
  kein Wirtschaftszug dauerhaft an denselben Planeten gebunden.
- Schiffe auf Mission zählen zum Bestandsziel mit. Ein gestarteter Flug löst
  dadurch keinen unbegrenzten Neubau über das eingestellte Limit hinaus aus.

Das Wirtschaftsprofil behält seine zurückhaltende Angriffsentscheidung.
Beim Entdeckerprofil bleiben mögliche Expeditionen eine eigene Priorität.
Deaktivierte Automatikschalter und pausierte Bots werden weiterhin respektiert.
Alle Kosten, Bauzeiten, Voraussetzungen, Flüge und Kämpfe verwenden die
vorhandenen OGameX-Dienste; es werden keine Einheiten oder Rohstoffe hinzugefügt.

## Angriffe

Die Flotten erhalten Kampfschiffe als Eskorte statt ausschließlich Transporter.
Gegen bewachte Ziele werden bekannte Schiffs- und Verteidigungszahlen sowie
Forschung aus einem höchstens 30 Minuten alten Spionagebericht in der eigenen
Nachrichtenbox verlangt. Unbekannte Kräfte gelten nicht als null.

Eine konservative Entscheidungsschätzung verlangt mindestens dreifache Feuerkraft
und dreifache kombinierte Hüllen-/Schildstärke sowie einen ausreichend starken
Einzelschuss gegen das größte gemeldete Schild. Die Rohwerte, Forschungsboni von
10 % pro Stufe und Hülle als Strukturwert/10 entsprechen den vorhandenen
Objekteigenschaften und der Kampfengine. Diese Schätzung ersetzt keinen Kampf
und garantiert keinen Sieg: Rundenzufall, Rapidfire und Veränderungen seit dem
Scan bleiben Sache des tatsächlichen Kampfes. Beide Kampfengines sind unverändert.

Bis zu acht verfügbare Sonden verbessern die Aufklärung. Unvollständige Berichte
können nach fünf Minuten erneut geprüft werden. Negative Energie wird nicht vom
Wert der erbeutbaren Rohstoffe abgezogen.

Pro Bot und Zielplanet gelten mindestens 30 Minuten Abstand zwischen Angriffen
und höchstens sechs gestartete, nicht abgebrochene Angriffe innerhalb von
24 Stunden. Es bleibt höchstens eine aktive Spionage- oder Angriffsmission pro
Bot gleichzeitig möglich.

Ziele bleiben standardmäßig andere Bots. Inaktive menschliche Spieler sind nur
über den vorhandenen separaten Schalter erlaubt; aktive Menschen, Administratoren
und Urlaubskonten werden weiterhin ausgeschlossen. Flottensicherung hat Vorrang.

## Prüfung

Neue Tests in `AutonomousBotAggressionTest` prüfen frühen Jägerbau, acht statt
eines übergroßen Sondenloses, rotierende Wirtschaftszüge, den echten Start eines
eskortierten Angriffs, unbekannte oder überlegene Gegner, die Zielauswahl,
erneute Aufklärung, Wiederholungsgrenzen und Schiffe auf Mission.

Der Browsercheck `tests/Frontend/live3d-bot-aggression.browser.mjs` bedient die
echten Verwaltungsbuttons und prüft Schiffsproduktion und einen Angriff auf einen
ausgespähten NPC samt deutscher Rückmeldung. Er benötigt isolierte Testkonten und
`storage/app/bot-aggression-ui-fixture.json` mit IDs `builder` und `raider` sowie
`LIVE_BASE_URL`, `LIVE_ACCOUNT_FILE` und `PLAYWRIGHT_MODULE`. Der Test löst echte
Botentscheidungen aus und darf nur auf Entwicklungsdaten laufen.

Rector, Pint, PHPStan und die 22 gezielten Bot-Tests sind erfolgreich. Die
vollständige PHP-Suite besteht mit 1.232 Tests (42 bestehende Hinweise). Die
108 JavaScript-Tests und der Frontend-Build bestehen ebenfalls. Der vorhandene
Flotten-Paralleltest besteht in fünf Durchläufen. Der zusätzliche bereits zuvor
fehlschlagende Produktions-Paralleltest hat weiterhin denselben Vorbereitungsfehler:
Schon vor den HTTP-Anfragen existiert kein Bauauftrag; anschließend werden null
statt zehn Jäger geprüft. An diesem Test und der Produktionsengine wurde nichts
geändert.

Es wurde kein produktives Deployment durchgeführt. Nach Übernahme des Codes greift
die Strategie beim nächsten regulären Botzyklus; vorhandene Raidschalter werden
nicht automatisch eingeschaltet.
