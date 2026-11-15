# Flottenprüfung, Nachrichten und autonome NPCs

Diese Etappe ergänzt die vorhandene Live-Oberfläche. OGameX bleibt für Forschungsvoraussetzungen, Ressourcen, Warteschlangen, Flugzeiten, Auftragsprüfung und Missionsausführung zuständig. Keine zweite Spiellogik und keine Änderungen an `main` oder der bestehenden Reverb-Anpassung.

## Kolonisation und Spionage

Die Originalregeln erlauben mit Astrophysik 5 die Positionen 3–13. Position 2/14 benötigt Stufe 6, 1/15 Stufe 8. Die Flugprüfung nennt jetzt Zielposition, benötigte und vorhandene Stufe. Das ursprüngliche Kolonielimit und die erneute Prüfung bei Ankunft bleiben bestehen. Astrophysik 5 ist deshalb keine Freigabe für jede Position.

Arakis `[1:1:2]` gehört normalerweise Legor. Die Originalmission verbietet Spionage gegen diesen geschützten Spieler. Die Planung zeigt den konkreten Originalgrund an. Auch fehlende Sonden, identische Start-/Zielposition, volle Flottenslots, zu viel Fracht und Treibstoffprobleme werden getrennt erklärt. Treibstoff wird automatisch geladen und ist keine einzutragende Fracht.

Schiffe und Flotten zeigen je Typ `Gesamt · Verfügbar · Auf Mission`. Die Zuordnung gilt für den ausgewählten Planeten/Mond: ausgehende und haltende Schiffe zählen dort, Rückflüge wieder beim Heimatkörper. Abgeschlossene und abgebrochene Hinflüge werden nicht zusätzlich zu ihrer Rückflugmission gezählt. Fremde Flotten zählen niemals zum eigenen Bestand. Unfertige Schiffe bleiben als Produktion getrennt sichtbar.

## Karte und Nachrichten

Die Systemkarte hat genau 14 gestrichelte Verbindungen, vom ausgewählten Planeten zu jeder anderen Position. Die animierten tatsächlichen Flugrouten bleiben davon unabhängig. Der Radarkegel blendet nach außen aus.

Nachrichten behalten die originalen AJAX-Handler und werden mit einfachen Flächen und Rahmen dargestellt. Die Höhenmessung misst den natürlichen Inhalt unabhängig von der vorherigen Fensterhöhe. Direkt aufgerufene Nachrichten-Teilansichten erhalten einen vollständigen Rahmen. Das verhindert unformatierte Fragmente und das fortlaufende Anwachsen des Scrollbereichs.

## NPC-Verwaltung

Unter **Verwaltung → Autonome Bots**:

- Frei wählbare, eindeutige Namen, auch Umlaute und Leerzeichen; bestehende Bots sind umbenennbar. Kein `BOT-`-Zwang.
- Einzeln schaltbar: automatischer Bau, Forschung, Schiffsproduktion, Spionage/Raids und Flottensicherung.
- Profile, Stufengrenzen, Bestandsziel, Produktionsmenge und Entscheidungsintervall bleiben editierbar.
- Übersicht mit aufklappbaren Einstellungen, letzter Entscheidung, Folgetermin und Pause. Geöffnete Einstellungen bleiben beim Speichern geöffnet.
- **50 aktive Bots einrichten** füllt den aktiven Bestand auf 50 auf. Wiederholungen erzeugen keine doppelte Population. Zunächst werden pausierte geeignete NPC-Konten reaktiviert, dann fehlende Konten erzeugt, insgesamt maximal 100 NPC-Konten. Bestehende Menschen werden nicht konvertiert; Administratoren und Urlauber werden nicht reaktiviert. Namen bestehender NPCs bleiben erhalten, bis ein Admin sie umbenennt.

Neue Bots beginnen regulär ohne zusätzliche Rohstoffgeschenke und entwickeln ihre Voraussetzungen selbst. Raids werden daher erst mit vorhandenen Sonden/Transportern sinnvoll aktiv. Die fünf Verhaltensweisen sind bei der neu aufgefüllten Population eingeschaltet; vorhandene Einstellungen bereits aktiver Bots bleiben erhalten.

### Raiding

Ein Bot prüft in begrenzten Abständen bis zu 30 nahe Ziele in derselben Galaxie (höchstens 20 Systeme Abstand). Er verschickt zuerst Sonden. Nur seine eigenen, noch vorhandenen Berichte aus den letzten 30 Minuten dürfen einen Raid begründen. Unbekannte Schiffe oder Verteidigungen zählen nicht als leere Bestände. Im ersten Ausbau werden nur als unverteidigt aufgeklärte Ziele mit Rohstoffen per Transporter angegriffen. Kampf und Beute berechnet die Originalmission.

Standardziele sind andere NPCs. **Auch inaktive menschliche Spieler ausspionieren und raiden** ist ein separater Schalter, standardmäßig aus. Auch dann werden aktive menschliche Spieler, Administratoren und Urlauber übersprungen. Maximal ein offensiver Bot-Auftrag (Spionage/Raid) gleichzeitig; Flottenslots und Treibstoffgrenzen werden regulär geprüft. Militärische Prüfungen rotieren unabhängig von Bauentscheidungen zwischen den Kolonien.

### Fleet Save

Bei sichtbaren anfliegenden Angriffen werden verfügbare bewegliche Schiffe und die in den Laderaum passenden Rohstoffe gesichert. Priorität hat eine langsame Stationierung zu einem eigenen, nicht bedrohten Körper, die bis nach dem Angriff unterwegs bleibt. Ohne geeignete eigene Kolonie ist bei passender Astrophysik eine Originalexpedition möglich. Nach Ablauf des Angriffs und eines Puffers ruft der Bot die noch rückrufbare Mission über den bestehenden Missionsdienst zurück. Weitere erkannte Angriffe verzögern den Rückruf. Satelliten und Crawler bleiben stationär.

Kein freier Slot, fehlender Treibstoff oder fehlender Fluchtweg wird als blockierte Sicherung angezeigt. Die Reaktion erfolgt im konfigurierten Entscheidungsintervall; sie garantiert keinen Schutz vor sehr kurzfristigen Angriffen. Normale Rückkehr und Ankunft verarbeitet OGameX auch ohne geöffneten Browser.

### Verlinktes Projekt

[halfguru/ogamebot](https://github.com/halfguru/ogamebot) wurde als Vorlage für die Abläufe Sondieren → Bericht auswerten → Raid sowie Angriff erkennen → Stationieren → Rückruf geprüft. Es ist ein eigenständiger Go-/Dashboard-Client. Es werden weder ein zweiter Clientdienst installiert noch Zugangsdaten für NPC-Logins gespeichert. Es wurde kein fremder Quellcode übernommen; die integrierten NPCs verwenden die vorhandenen Laravel-Dienste.

## Update der bestehenden Testinstallation

Den gewünschten Commit zuerst von GitHub holen und dann den darin enthaltenen Helfer `scripts/codex/update-test-interface.sh` mit dem vollständigen SHA aufrufen. Er verweigert `main`/`master` und einen unsauberen Arbeitsbaum, sichert den vorherigen Stand und ergänzt nur die namentlich aufgeführten Migrationen. Er installiert keine Abhängigkeiten und startet keine Dienste neu.

Neu: additive Migration `2026_11_15_120000_add_autonomous_bot_operations.php`, anschließend `php artisan ogamex:bots:populate --count=50`. Der verwaltete Cron-Auftrag bearbeitet jede Minute bis zu 100 fällige NPCs und lässt andere Einträge unverändert. Ein bereits vorhandener Auftrag dieser Installation mit Limit 20 wird angepasst.

Die 50 NPCs entstehen auf dem VPS erst beim Ausführen dieses Updates oder beim entsprechenden Admin-Klick. Cloud-Tests sind keine Installation auf dem VPS. Erneutes Ausführen des Auffüllens nach bewusstem Pausieren reaktiviert geeignete NPCs bis zum gewünschten aktiven Bestand.

## Prüfung

- Rector, Pint, PHPStan und Featuretests zu Live-UI, Handel und NPCs.
- Echter Kolonieflug, Astrophysik-Positionsgrenzen und Legor-Schutz bleiben unter Test.
- Echte NPC-Spionage und Raid-Aufträge mit Empfängerprüfung der Berichte; Sicherungsflug und Rückruf; Pause, Verhaltensschalter, freie Namen und wiederholte Einrichtung von 50 NPCs.
- Browser: tatsächlicher Spionagestart, Bestandsaufteilung, 14 zentrale Kartenlinien, Radarverlauf, Nachrichten mit echten Tabs und stabiler Höhe auch bei viewportabhängigem Inhalt, NPC-Verwaltung und Umbenennung.
- Originale Paralleltests für Einheitenwarteschlangen und Missionsverarbeitung. Die Cloud benötigt dafür `NO_PROXY`/`no_proxy` für den internen Host. Die bekannte Testfixture setzt nur während dieser beiden Tests die Registrierung auf zwei Planeten, danach wird der vorherige Wert wiederhergestellt.
