# OGameX-3D: Bestehende Installation sicher per SSH aktualisieren

## Verbindliche Korrektur des Auftrags
**Der Nutzer hat bestätigt: OGameX ist auf dem Zielserver BEREITS installiert. Er besitzt einen funktionierenden SSH-Schlüssel.**
Daher **KEINE Neuinstallation**, **KEINE neue Datenbank**, **KEINE neuen Docker-Volumes**, **KEINE neue Standard-Compose-Installation** und keine Änderung an bestehender Domain/Spielwelt, sofern die Bestandsprüfung nicht ausdrückliche Notwendigkeit belegt und die Änderung freigegeben wurde.

Ziel ist ein eigenständig von Codex vorbereiteter, **wiederholbarer, sicherer Deployment-/Updateprozess**, der die bestehende OGameX-Installation inklusive Accounts, Planeten, Ressourcen, Konfiguration und Datenbanken erhält und das neue Live-3D-UI aus `Nostago/ogamex-3d` nutzbar macht. Bot- und Admin-Erweiterungen bleiben separate Entwicklungsbranches und sind noch nicht automatisch Teil eines Rollouts.

Der aktuelle Branch `codex/ogamex-3d-ssh-deployment` basiert auf `codex/ogamex-3d-live-backend`. Arbeite nur hier, keine direkten Änderungen an `main`, kein automatischer Merge.

## Bekannte ältere Bestandsinformationen – NICHT als heutigen Zustand voraussetzen
Frühere Serverausgaben des Nutzers (Stand August 2026) nannten:
- Hostname am Shellprompt: `24fire` (nicht notwendigerweise eine öffentlich auflösbare SSH-Adresse).
- OGameX-Verzeichnis: `/opt/ogamex`.
- Produktions-Compose-Datei: `/opt/ogamex/docker-compose.prod.yml`.
- Compose-Dienste für PHP, Webserver, MariaDB, Scheduler, Queue, Reverb und phpMyAdmin.
- Persistentes Datenbank-Volume: `ogamex_ogame-dbdata`.
- Früherer Serverzugang als `root`; für Automatisierung nach Möglichkeit einen getrennten Deploy-Account mit minimalen Rechten nutzen.
**Vor jeder Änderung alle Angaben und deren Aktualität lesend per SSH bestätigen.** Insbesondere keine Daten oder Volumes mit diesen alten Namen überschreiben, entfernen oder neu initialisieren.

## Bestätigte SSH-Konfiguration des Nutzers (13.11.2026)
Der Nutzer verbindet sich von seinem **Mac** über `ssh ogame`. Ausgabe von `ssh -G ogame | grep -E '^(hostname|user|port) '`: **`user ogamedev`**, **`hostname 10.77.0.10`**, **`port 22`**. Die Adresse `10.77.0.10` ist eine nicht öffentlich routbare RFC1918-IPv4-Adresse. `ogame` ist ein lokaler OpenSSH-Host-Alias, den Codex Cloud und GitHub Actions nicht automatisch kennen. Ein funktionierender persönlicher SSH-Schlüssel liegt beim Nutzer auf dem Mac, **nicht** in der Cloud; keine Schlüssel oder Passwortmaterial im Chat oder Git verlangen.

**Wichtig für die Architekturentscheidung:** Standardmäßig kann ein GitHub-hosted Runner den Zielhost unter `10.77.0.10` nicht erreichen. Bevor Deployment-Workflows SSH-Befehle ausführen, muss der konkrete Netzwerkpfad geprüft werden. Als nächster read-only Mac-Test: `route -n get 10.77.0.10 | grep -E '(gateway|interface):'`, außerdem bei Bedarf `ssh -G ogame | grep -E '^(proxycommand|proxyjump) '`. Die Mac-Ausgabe kann einen LAN-/VPN-Tunnel belegen, ersetzt aber **keinen** erfolgreichen End-to-End-Test vom tatsächlichen Runner aus. Bevorzugte Optionen: (a) explizit eingerichteter, restriktiv auf das Zielnetz beschränkter VPN-Zugang für GitHub Actions; (b) abgesicherter separater Self-hosted Runner im privaten Netz, nicht als frei privilegierter Agent auf Produktionssystem; (c) manueller Bootstrap-Deploy-Schritt, um ein Pull-basiertes Deployment mit geringer Angriffsfläche einzurichten. Keine Freigabe des SSH-Ports ins öffentliche Internet allein für Codex.

Separaten Deploy-Schlüssel mit minimalen Berechtigungen verwenden und dessen öffentlichen Teil am Host autorisieren, privaten Teil ausschließlich als geschütztes Secret der Deploy-Umgebung; Hostkey-Fingerprint gegen vertrauenswürdige Quelle prüfen. Keine Behauptung, der Server sei bereits erreicht oder aktualisiert worden.

## SSH-Verbindung / Secrets
Die private SSH-Schlüsseldatei des Nutzers liegt auf seinem Gerät; sie ist nicht automatisch in Codex Cloud oder GitHub Actions verfügbar. Keine Aufforderung, sie im Chat oder Repository zu teilen. Bevorzugt einen **separaten auf diesen Host beschränkten Deploy-Schlüssel** auf dem Client erstellen, dessen öffentlichen Teil autorisiert hinterlegen und den privaten Teil ausschließlich als geschütztes Secret eines GitHub Actions Environments verwalten. Wenn bereits ein dedizierter Deploy-Schlüssel vorhanden ist, kann er stattdessen verwendet werden. Zugriff nur auf das nötige Repository/Environment beschränken. Schlüsselrotation dokumentieren.

GitHub Actions ist der bevorzugte SSH-Transport für regulär erreichbare Server: Codex erstellt Workflow/Skripte und prüft sie; der Workflow verbindet sich per SSH. Direkter SSH/TCP-Zugriff von Codex Cloud ist **nicht automatisch gegeben** und erfordert gegebenenfalls VPN/Proxy-Konfiguration. Nicht so tun, als könne Codex ohne hergestellten und geprüften Kanal eine SSH-Verbindung öffnen. Bei nur privater Erreichbarkeit vor Freigabe eine passende sichere VPN-/Runner-Lösung wählen, keine unaufgeforderte SSH-Portfreigabe.

Secrets: `DEPLOY_SSH_KEY`, validierter `DEPLOY_KNOWN_HOSTS`; geschützte Variablen `DEPLOY_HOST`, `DEPLOY_PORT`, `DEPLOY_USER`, `DEPLOY_PATH` und ggf. Ziel-Domain. Hostschlüssel-Fingerprint über einen unabhängigen, vertrauenswürdigen Weg vergleichen; niemals `StrictHostKeyChecking=no` oder ungesehenes Vertrauen auf `ssh-keyscan`. Keine Schlüssel/Passwörter/`.env` in Git/Logs/Chat.

## Phase A: Nur lesende Bestandsaufnahme (ohne Downtime)
Nach Einrichtung der einmaligen Verbindung zuerst per SSH verifizieren und protokollieren:
1. System, Rechte, verfügbare Ressourcen, laufende Dienste, Docker-/Compose-Version und tatsächliche Prozesse/Portbindungen.
2. Vorhandene OGameX-Dateien und Git-Status unter dem **ermittelten** Installationspfad (historisch `/opt/ogamex`), tatsächliches Deployment-Ref, uncommittete Serveränderungen, Dateirechte.
3. Aktive Produktions-Compose-Datei, Volumes, Datenbank, Backup-Stand und Speicherplatz, ohne `.env`/Secrets offenzulegen.
4. Domain/HTTPS, Webserver/Reverse Proxy, Registrierung, laufender Login, Datenbank-/Migrationsstatus und Authentifizierung des aktuellen Universums.
5. Prüfen, ob ein Release direkt aus einem Git-Checkout läuft und ob bisherige Anpassungen im Repository fehlen. Keine ungefragte Übernahme von Upstream-Versionen, keine Überschreibung lokaler Dateien.
6. Ausgangszustand der bestehenden Accounts/Planeten/Queues/Flotten für spätere Integritätsvergleiche protokollieren, ohne private Inhalte zu exportieren.

**Stop-Regel:** Bei unklaren Volumes, bestehenden lokalen Änderungen, fehlendem Backup, falschen Zugriffsrechten oder Gefahr für den laufenden Server keine schreibenden Aktionen.

## Phase B: Bestehende Anwendung auf das neue Live-3D-UI aktualisieren
- Die Originalinstallation **in place oder mit explizit dokumentiertem Release-Verzeichnis** sicher aktualisieren; vorhandene Datenbank, Persistent Volumes, `.env`, APP_KEY, Docker-Projektname, Webserverkonfiguration, Domains, Nutzer und realen Spielstand bewahren.
- Basis ist der geprüfte Live-3D-Featurestand. Bot-/Admin-Branches nur nach separater Integration/Tests und explizitem Deployment-Entscheid aufnehmen. Keine unkontrollierten Merges.
- Alle neuen Artefakte (Vite Assets/PHP/3D-Routen) vorher reproduzierbar bauen und testen. Nach Möglichkeit getrennte Staging-Prüfung über Kopie/isolierte Daten ohne aktuelle Produktiv-DB, aber keine zweite öffentliche OGameX-Installation als ungebetenen Ersatz.
- Für einen produktiven Updatevorgang zuerst verifizierbares DB-Backup und gesicherten Ausgangscommit bereitstellen. **Nicht** `docker compose down -v`, keine Datenvolumes löschen und keine laufenden fremden Dienste neu konfigurieren.
- Anwendung bei Bedarf kurz in Wartungsmodus setzen, migrationsbezogene Kompatibilität vorab prüfen; irreversible oder destruktive Migrationen niemals automatisch an Echtdaten ausführen.
- Die vorhandene Compose-Konfiguration respektieren. Niemals Entwicklungsdateien `scripts/codex/install.sh` oder `scripts/codex/start.sh` in Production ausführen; sie enthalten Entwicklungs-DB/Proxyeinstellungen.
- Vorhandene Secrets nicht blind ändern, keine standardisierten `toor`-Beispielpasswörter, `APP_DEBUG=false`; öffentlich zugängliches phpMyAdmin/DB-Ports im Rahmen der Bestandsprüfung identifizieren und Risiken zunächst dokumentieren, nicht unerwartet produktive Zugänge abschalten.
- Deployment muss idempotent, versioniert und nachprüfbar sein; Login, klassisches OGameX, Auth/CSRF, /play-3d, /play-3d/state, PHP-FPM, MariaDB, Scheduler, Queue, Reverb und originale Spielfunktionen prüfen. Kein uneingeschränkter Test mit echten Nutzeraktionen.

## Phase C: Eigenständige Codex-Updates über GitHub Actions
Entwickle nur mit nachgewiesenen Rechten einen **manuell auslösbaren** GitHub-Actions-Workflow mit zwei Modi:
- `preflight`: nur lesende Bestandsaufnahme und Gesundheitsprüfungen;
- `deploy`: nur freigegebene Commits, Vorabtests, Backup, geordneter Deploy, Smoke Tests, dokumentierter Rollback;
- optional `rollback`: kontrollierter Code-Rollback auf vorherigen Stand, ohne Migrationen blind zurückzudrehen.

Abgesicherte `ogamex-production` Environment mit Required Reviewers (wo verfügbar), geschützten Variablen/Secrets, enger Branch-/SHA-Zulassung und Sperre gleichzeitiger Deployments. Keine SSH-Secrets bei untrusted PRs. Geschützten Host-Key verifizieren. Logs ohne Secrets, aber mit Commit, Backup-Referenz und Prüfresultaten. Der Nutzer möchte künftig wenig manuelle Bedienung: Codex soll alle **nicht privilegierten Vorarbeiten** eigenständig erledigen; der einmalige Schlüssel-/Zielzugang und die Freigabe eines produktiven Deployments sind notwendige Sicherheitsgrenzen.

## Tests, Dokumentation und Ergebnis
- Dokumentiere vorhandene Serverarchitektur und safe update procedure auf Deutsch, mit Notfall-Rollback.
- Reproduziere und teste den Workflow soweit möglich ohne Produktionszugang; setze keine vorgetäuschten Erfolgsmeldungen ab.
- Ziel ist: vorhandene Installation auf die 3D-Spieloberfläche aktualisiert, historische Spieldaten erhalten, Server erreichbar; Quellcode und tatsächliches Live-Deployment sind getrennt zu verifizieren.
- Ein Draft PR gegen `codex/ogamex-3d-live-backend`, kein Merge ohne Freigabe.
- Falls SSH-Zugang noch nicht bereitgestellt ist: Workflow und Skripte fertigstellen, danach konkrete fehlende Verbindungsvoraussetzungen benennen. **Nicht** behaupten, Codex habe den Server bereits erreicht oder aktualisiert.

## Kurzer Codex-Startauftrag
> Implementiere `docs/tasks/SSH-DEPLOYMENT.md` auf Branch `codex/ogamex-3d-ssh-deployment`. OGameX ist auf dem Server bereits installiert (früher `/opt/ogamex` auf Host `24fire`). Erstelle die sichere SSH-gestützte Update-Automation statt einer Neuinstallation, validiere alle Annahmen read-only, teste alles ohne Zwischenabnahmen und richte den Rollout des Live-3D-UI vor. Keine neue Datenbank, keine neuen Produktionsvolumes und keine ungeprüften Änderungen an echten Accounts.
